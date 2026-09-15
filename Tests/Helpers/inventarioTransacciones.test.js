import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback } from '../dbTestUtils.js';
import { registrarMovimiento, transferirEntreBolsas } from '../../Helpers/inventarioTransacciones.js';
import Existencias from '../../Models/existencias.js';
import Articulos from '../../Models/articulos.js';

// Articulos.CodigoSKU es VARCHAR(12) con UNIQUE (EmpresaId, CodigoSKU): 'T' + tiempo en
// base36 (8) + 2 caracteres al azar = 11 caracteres, igual que en Tests/Models.
const generarSKUDePrueba = (prefijo = 'T') => {
    const tiempo = Date.now().toString(36);
    const azar = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
    return `${prefijo}${tiempo}${azar}`;
};

const crearArticuloDePrueba = async (connection, empId = 1) => {
    const [productoRows] = await connection.query(`SELECT Id FROM Productos WHERE EmpresaId = ? LIMIT 1;`, [empId]);
    const [usuarioRows] = await connection.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    const [insertResult] = await connection.query(
        `INSERT INTO Articulos(EmpresaId, UsuarioIdCreador, ProductoId, CodigoSKU, Nombre)
         VALUES (?, ?, ?, ?, ?)`,
        [empId, usuarioRows[0].Id, productoRows[0].Id, generarSKUDePrueba(), 'ARTICULO DE PRUEBA']
    );
    return { articuloId: insertResult.insertId, usuarioId: usuarioRows[0].Id };
};

test('registrarMovimiento ENTRADA a DISPONIBLE actualiza existencia y costo promedio', async () => {
    await withRollback(async (connection) => {
        const { articuloId, usuarioId } = await crearArticuloDePrueba(connection);

        await registrarMovimiento(connection, {
            pEmpId: 1, pUsuId: usuarioId, pArticuloId: articuloId,
            pTipoMovimiento: 'ENTRADA', pBolsaEstado: 'DISPONIBLE', pPropietarioId: null,
            pCantidad: 10, pCostoUnitario: 50, pMotivo: 'AJUSTE', pTipoOrigen: 'AJUSTE',
            pOrigenId: null, pObservaciones: null
        });
        await registrarMovimiento(connection, {
            pEmpId: 1, pUsuId: usuarioId, pArticuloId: articuloId,
            pTipoMovimiento: 'ENTRADA', pBolsaEstado: 'DISPONIBLE', pPropietarioId: null,
            pCantidad: 10, pCostoUnitario: 70, pMotivo: 'AJUSTE', pTipoOrigen: 'AJUSTE',
            pOrigenId: null, pObservaciones: null
        });

        const bolsa = await Existencias.traerBolsaBloqueada(connection, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
        });
        const articulo = await Articulos.traerPorIdConexion(connection, { pId: articuloId, pEmpId: 1 });

        assert.equal(Number(bolsa.Cantidad), 20);
        assert.equal(Number(articulo.CostoUnitario), 60);
    });
});

test('registrarMovimiento SALIDA sin saldo suficiente lanza error y no modifica nada', async () => {
    await withRollback(async (connection) => {
        const { articuloId, usuarioId } = await crearArticuloDePrueba(connection);

        await registrarMovimiento(connection, {
            pEmpId: 1, pUsuId: usuarioId, pArticuloId: articuloId,
            pTipoMovimiento: 'ENTRADA', pBolsaEstado: 'DISPONIBLE', pPropietarioId: null,
            pCantidad: 5, pCostoUnitario: 10, pMotivo: 'AJUSTE', pTipoOrigen: 'AJUSTE',
            pOrigenId: null, pObservaciones: null
        });

        await assert.rejects(
            () => registrarMovimiento(connection, {
                pEmpId: 1, pUsuId: usuarioId, pArticuloId: articuloId,
                pTipoMovimiento: 'SALIDA', pBolsaEstado: 'DISPONIBLE', pPropietarioId: null,
                pCantidad: 999, pCostoUnitario: null, pMotivo: 'AJUSTE', pTipoOrigen: 'AJUSTE',
                pOrigenId: null, pObservaciones: null
            }),
            /Existencia insuficiente/
        );

        const bolsa = await Existencias.traerBolsaBloqueada(connection, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
        });
        assert.equal(Number(bolsa.Cantidad), 5);
    });
});

test('registrarMovimiento rechaza una bolsa PRESTADO_A_TALLER sin propietario', async () => {
    await withRollback(async (connection) => {
        const { articuloId, usuarioId } = await crearArticuloDePrueba(connection);

        await assert.rejects(
            () => registrarMovimiento(connection, {
                pEmpId: 1, pUsuId: usuarioId, pArticuloId: articuloId,
                pTipoMovimiento: 'ENTRADA', pBolsaEstado: 'PRESTADO_A_TALLER', pPropietarioId: null,
                pCantidad: 1, pCostoUnitario: null, pMotivo: 'PRESTAMO_PROPIO', pTipoOrigen: 'PRESTAMO',
                pOrigenId: null, pObservaciones: null
            }),
            /requiere un propietario/
        );
    });
});

// transferirEntreBolsas abre y confirma su propia transaccion via pool, asi que no puede
// probarse dentro de withRollback: el escenario se monta y se confirma con una conexion
// propia y se limpia manualmente al final (Movimientos y Existencias primero, porque sus
// FK contra Articulos son RESTRICT y bloquearian el DELETE del articulo).
test('transferirEntreBolsas mueve cantidad de una bolsa a otra atomicamente', async () => {
    const { pool } = await import('../../Database/config.js');
    const setupConn = await pool.getConnection();
    let articuloId;
    try {
        await setupConn.beginTransaction();
        const [productoRows] = await setupConn.query(`SELECT Id FROM Productos WHERE EmpresaId = 1 LIMIT 1;`);
        const [usuarioRows] = await setupConn.query(`SELECT Id FROM Usuarios LIMIT 1;`);
        const [insertResult] = await setupConn.query(
            `INSERT INTO Articulos(EmpresaId, UsuarioIdCreador, ProductoId, CodigoSKU, Nombre)
             VALUES (1, ?, ?, ?, 'ARTICULO TRANSFERENCIA');`,
            [usuarioRows[0].Id, productoRows[0].Id, generarSKUDePrueba('R')]
        );
        articuloId = insertResult.insertId;
        await registrarMovimiento(setupConn, {
            pEmpId: 1, pUsuId: usuarioRows[0].Id, pArticuloId: articuloId,
            pTipoMovimiento: 'ENTRADA', pBolsaEstado: 'DISPONIBLE', pPropietarioId: null,
            pCantidad: 10, pCostoUnitario: 40, pMotivo: 'AJUSTE', pTipoOrigen: 'AJUSTE',
            pOrigenId: null, pObservaciones: null
        });
        await setupConn.commit();

        await transferirEntreBolsas({
            salida: {
                pEmpId: 1, pUsuId: usuarioRows[0].Id, pArticuloId: articuloId,
                pBolsaEstado: 'DISPONIBLE', pPropietarioId: null, pCantidad: 4,
                pCostoUnitario: null, pMotivo: 'VENTA', pTipoOrigen: 'VENTA', pOrigenId: 1, pObservaciones: null
            },
            entrada: {
                pEmpId: 1, pUsuId: usuarioRows[0].Id, pArticuloId: articuloId,
                pBolsaEstado: 'RESERVADO', pPropietarioId: null, pCantidad: 4,
                pCostoUnitario: null, pMotivo: 'VENTA', pTipoOrigen: 'VENTA', pOrigenId: 1, pObservaciones: null
            }
        });

        const verificacionConn = await pool.getConnection();
        const disponible = await Existencias.traerBolsaBloqueada(verificacionConn, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
        });
        const reservado = await Existencias.traerBolsaBloqueada(verificacionConn, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'RESERVADO', pPropietarioId: null
        });
        const articulo = await Articulos.traerPorIdConexion(verificacionConn, { pId: articuloId, pEmpId: 1 });
        verificacionConn.release();

        assert.equal(Number(disponible.Cantidad), 6);
        assert.equal(Number(reservado.Cantidad), 4);
        // la ENTRADA a RESERVADO no es una compra: no debe recostear el articulo
        assert.equal(Number(articulo.CostoUnitario), 40);
    } finally {
        if (articuloId) {
            await pool.query(`DELETE FROM Movimientos WHERE ArticuloId = ?;`, [articuloId]);
            await pool.query(`DELETE FROM Existencias WHERE ArticuloId = ?;`, [articuloId]);
            await pool.query(`DELETE FROM Articulos WHERE Id = ?;`, [articuloId]);
        }
    }
});
