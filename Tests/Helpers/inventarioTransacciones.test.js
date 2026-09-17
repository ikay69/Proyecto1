import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback } from '../dbTestUtils.js';
import { registrarMovimiento, transferirEntreBolsas } from '../../Helpers/inventarioTransacciones.js';
import Existencias from '../../Models/existencias.js';

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

        assert.equal(Number(bolsa.Cantidad), 20);
        assert.equal(Number(bolsa.CostoUnitario), 60);
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

// transferirEntreBolsas abre y CONFIRMA su propia transaccion via pool, asi que sus pruebas no
// pueden correr dentro de withRollback: montan el escenario con una conexion propia, lo confirman
// y lo limpian a mano al final.

// Siembra el articulo y su bolsa DISPONIBLE escribiendo directo en las tablas, sin pasar por
// registrarMovimiento: asi el unico Movimiento que puede existir despues es el que genere la
// transferencia, y las pruebas pueden contar filas de Movimientos como asercion exacta.
const sembrarArticuloConExistencia = async (pool, { pCantidad, pCosto }) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [productoRows] = await conn.query(`SELECT Id FROM Productos WHERE EmpresaId = 1 LIMIT 1;`);
        const [usuarioRows] = await conn.query(`SELECT Id FROM Usuarios LIMIT 1;`);
        const [insertResult] = await conn.query(
            `INSERT INTO Articulos(EmpresaId, UsuarioIdCreador, ProductoId, CodigoSKU, Nombre)
             VALUES (1, ?, ?, ?, 'ARTICULO TRANSFERENCIA');`,
            [usuarioRows[0].Id, productoRows[0].Id, generarSKUDePrueba('R')]
        );
        const articuloId = insertResult.insertId;
        await Existencias.upsertCantidadYCosto(conn, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'DISPONIBLE',
            pPropietarioId: null, pDelta: pCantidad, pCosto: pCosto
        });
        await conn.commit();
        return { articuloId, usuarioId: usuarioRows[0].Id };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// Movimientos y Existencias se borran primero: sus FK contra Articulos son RESTRICT y
// bloquearian el DELETE del articulo.
const limpiarArticuloSembrado = async (pool, articuloId) => {
    if (!articuloId) return;
    await pool.query(`DELETE FROM Movimientos WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM Existencias WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM Articulos WHERE Id = ?;`, [articuloId]);
};

const leerEstadoArticulo = async (pool, articuloId) => {
    const conn = await pool.getConnection();
    try {
        const disponible = await Existencias.traerBolsaBloqueada(conn, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
        });
        const reservado = await Existencias.traerBolsaBloqueada(conn, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'RESERVADO', pPropietarioId: null
        });
        const [movimientos] = await conn.query(
            `SELECT TipoMovimiento, BolsaEstado, Cantidad FROM Movimientos WHERE ArticuloId = ? ORDER BY Id ASC;`,
            [articuloId]
        );
        return { disponible, reservado, movimientos };
    } finally {
        conn.release();
    }
};

test('transferirEntreBolsas mueve cantidad de una bolsa a otra atomicamente', async () => {
    const { pool } = await import('../../Database/config.js');
    let articuloId;
    try {
        const sembrado = await sembrarArticuloConExistencia(pool, { pCantidad: 10, pCosto: 40 });
        articuloId = sembrado.articuloId;

        await transferirEntreBolsas({
            salida: {
                pEmpId: 1, pUsuId: sembrado.usuarioId, pArticuloId: articuloId,
                pBolsaEstado: 'DISPONIBLE', pPropietarioId: null, pCantidad: 4,
                pCostoUnitario: null, pMotivo: 'VENTA', pTipoOrigen: 'VENTA', pOrigenId: 1, pObservaciones: null
            },
            entrada: {
                pEmpId: 1, pUsuId: sembrado.usuarioId, pArticuloId: articuloId,
                pBolsaEstado: 'RESERVADO', pPropietarioId: null, pCantidad: 4,
                pCostoUnitario: null, pMotivo: 'VENTA', pTipoOrigen: 'VENTA', pOrigenId: 1, pObservaciones: null
            }
        });

        const estado = await leerEstadoArticulo(pool, articuloId);

        assert.equal(Number(estado.disponible.Cantidad), 6);
        assert.equal(Number(estado.reservado.Cantidad), 4);
        // la ENTRADA a RESERVADO no es una compra: no debe recostear la bolsa DISPONIBLE
        assert.equal(Number(estado.disponible.CostoUnitario), 40);
        // ambas mitades quedaron en el kardex
        assert.equal(estado.movimientos.length, 2);
        assert.equal(estado.movimientos[0].TipoMovimiento, 'SALIDA');
        assert.equal(estado.movimientos[0].BolsaEstado, 'DISPONIBLE');
        assert.equal(estado.movimientos[1].TipoMovimiento, 'ENTRADA');
        assert.equal(estado.movimientos[1].BolsaEstado, 'RESERVADO');
    } finally {
        await limpiarArticuloSembrado(pool, articuloId);
    }
});

// Esta es la prueba que justifica el nombre "atomicamente": si los dos movimientos corrieran en
// transacciones separadas, la SALIDA quedaria confirmada y la bolsa DISPONIBLE bajaria a 7.
test('transferirEntreBolsas revierte la salida si la entrada falla', async () => {
    const { pool } = await import('../../Database/config.js');
    let articuloId;
    try {
        const sembrado = await sembrarArticuloConExistencia(pool, { pCantidad: 10, pCosto: 40 });
        articuloId = sembrado.articuloId;

        await assert.rejects(
            () => transferirEntreBolsas({
                // la salida es valida y se aplica primero...
                salida: {
                    pEmpId: 1, pUsuId: sembrado.usuarioId, pArticuloId: articuloId,
                    pBolsaEstado: 'DISPONIBLE', pPropietarioId: null, pCantidad: 3,
                    pCostoUnitario: null, pMotivo: 'PRESTAMO_PROPIO', pTipoOrigen: 'PRESTAMO',
                    pOrigenId: 1, pObservaciones: null
                },
                // ...y la entrada falla despues: PRESTADO_A_TALLER exige propietario
                entrada: {
                    pEmpId: 1, pUsuId: sembrado.usuarioId, pArticuloId: articuloId,
                    pBolsaEstado: 'PRESTADO_A_TALLER', pPropietarioId: null, pCantidad: 3,
                    pCostoUnitario: null, pMotivo: 'PRESTAMO_PROPIO', pTipoOrigen: 'PRESTAMO',
                    pOrigenId: 1, pObservaciones: null
                }
            }),
            /requiere un propietario/
        );

        const estado = await leerEstadoArticulo(pool, articuloId);

        // la salida ya aplicada se revirtio junto con la entrada fallida: sigue en 10, no en 7
        assert.equal(Number(estado.disponible.Cantidad), 10);
        // y ninguna de las dos mitades quedo en el kardex
        assert.equal(estado.movimientos.length, 0);
    } finally {
        await limpiarArticuloSembrado(pool, articuloId);
    }
});
