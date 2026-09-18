import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback } from '../dbTestUtils.js';
import Movimientos from '../../Models/movimientos.js';

const crearArticuloDePrueba = async (connection, empId = 1) => {
    const [productoRows] = await connection.query(`SELECT Id FROM Productos WHERE EmpresaId = ? LIMIT 1;`, [empId]);
    const [usuarioRows] = await connection.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    const [insertResult] = await connection.query(
        `INSERT INTO Articulos(EmpresaId, UsuarioIdCreador, ProductoId, CodigoSKU, Nombre)
         VALUES (?, ?, ?, ?, ?)`,
        [empId, usuarioRows[0].Id, productoRows[0].Id, `T${Date.now().toString(36)}`, 'ARTICULO DE PRUEBA']
    );
    return { articuloId: insertResult.insertId, usuarioId: usuarioRows[0].Id };
};

// Bodegas.Nombre tiene UNIQUE (EmpresaId, Nombre): cada bodega de prueba usa un nombre unico.
const crearBodegaDePrueba = async (connection, usuarioId, empId = 1) => {
    const nombre = `BODEGA PRUEBA ${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const [insertResult] = await connection.query(
        `INSERT INTO Bodegas(EmpresaId, UsuarioIdCreador, Nombre) VALUES (?, ?, ?);`,
        [empId, usuarioId, nombre]
    );
    return insertResult.insertId;
};

test('insertar guarda el movimiento y traerKardex lo devuelve con saldo corriente', async () => {
    await withRollback(async (connection) => {
        const { articuloId, usuarioId } = await crearArticuloDePrueba(connection);
        const bodegaId = await crearBodegaDePrueba(connection, usuarioId);

        await Movimientos.insertar(connection, {
            pEmpId: 1, pUsuId: usuarioId, pBodegaId: bodegaId, pArticuloId: articuloId,
            pTipoMovimiento: 'ENTRADA', pBolsaEstado: 'DISPONIBLE', pPropietarioId: null,
            pCantidad: 10, pCostoUnitario: 50, pMotivo: 'AJUSTE', pTipoOrigen: 'AJUSTE',
            pOrigenId: null, pObservaciones: 'primera entrada'
        });
        await Movimientos.insertar(connection, {
            pEmpId: 1, pUsuId: usuarioId, pBodegaId: bodegaId, pArticuloId: articuloId,
            pTipoMovimiento: 'SALIDA', pBolsaEstado: 'DISPONIBLE', pPropietarioId: null,
            pCantidad: 3, pCostoUnitario: null, pMotivo: 'AJUSTE', pTipoOrigen: 'AJUSTE',
            pOrigenId: null, pObservaciones: 'ajuste de salida'
        });

        const kardex = await Movimientos.traerKardex({
            pEmpId: 1, pBodegaId: '', pArticuloId: articuloId,
            pFechaInicio: '2020-01-01', pFechaFin: '2100-01-01', pOffset: 0
        }, connection);

        assert.equal(kardex.length, 2);
        assert.equal(Number(kardex[0].movSaldo), 10);
        assert.equal(Number(kardex[1].movSaldo), 7);
        assert.equal(kardex[0].movBodegaId, bodegaId);
    });
});

// El kardex puede filtrarse por bodega: el saldo corriente debe calcularse SOLO sobre los
// movimientos de esa bodega, sin mezclar los de otra bodega del mismo articulo.
test('traerKardex filtra por bodega y calcula el saldo solo sobre esa bodega', async () => {
    await withRollback(async (connection) => {
        const { articuloId, usuarioId } = await crearArticuloDePrueba(connection);
        const bodegaAId = await crearBodegaDePrueba(connection, usuarioId);
        const bodegaBId = await crearBodegaDePrueba(connection, usuarioId);

        await Movimientos.insertar(connection, {
            pEmpId: 1, pUsuId: usuarioId, pBodegaId: bodegaAId, pArticuloId: articuloId,
            pTipoMovimiento: 'ENTRADA', pBolsaEstado: 'DISPONIBLE', pPropietarioId: null,
            pCantidad: 10, pCostoUnitario: 50, pMotivo: 'AJUSTE', pTipoOrigen: 'AJUSTE',
            pOrigenId: null, pObservaciones: 'entrada bodega A'
        });
        await Movimientos.insertar(connection, {
            pEmpId: 1, pUsuId: usuarioId, pBodegaId: bodegaBId, pArticuloId: articuloId,
            pTipoMovimiento: 'ENTRADA', pBolsaEstado: 'DISPONIBLE', pPropietarioId: null,
            pCantidad: 100, pCostoUnitario: 5, pMotivo: 'AJUSTE', pTipoOrigen: 'AJUSTE',
            pOrigenId: null, pObservaciones: 'entrada bodega B'
        });

        const kardexA = await Movimientos.traerKardex({
            pEmpId: 1, pBodegaId: bodegaAId, pArticuloId: articuloId,
            pFechaInicio: '2020-01-01', pFechaFin: '2100-01-01', pOffset: 0
        }, connection);

        assert.equal(kardexA.length, 1);
        assert.equal(Number(kardexA[0].movSaldo), 10);
        assert.equal(kardexA[0].movBodegaId, bodegaAId);

        const totalA = await Movimientos.contarKardexFiltro({
            pEmpId: 1, pBodegaId: bodegaAId, pArticuloId: articuloId,
            pFechaInicio: '2020-01-01', pFechaFin: '2100-01-01'
        }, connection);
        assert.equal(totalA, 1);
    });
});

test('traerPorOrigen filtra por TipoOrigen y OrigenId', async () => {
    await withRollback(async (connection) => {
        const { articuloId, usuarioId } = await crearArticuloDePrueba(connection);
        const bodegaId = await crearBodegaDePrueba(connection, usuarioId);

        await Movimientos.insertar(connection, {
            pEmpId: 1, pUsuId: usuarioId, pBodegaId: bodegaId, pArticuloId: articuloId,
            pTipoMovimiento: 'ENTRADA', pBolsaEstado: 'DISPONIBLE', pPropietarioId: null,
            pCantidad: 5, pCostoUnitario: 20, pMotivo: 'PRODUCCION', pTipoOrigen: 'PRODUCCION',
            pOrigenId: 999, pObservaciones: null
        });

        const movimientos = await Movimientos.traerPorOrigen({
            pEmpId: 1, pTipoOrigen: 'PRODUCCION', pOrigenId: 999
        }, connection);

        assert.equal(movimientos.length, 1);
        assert.equal(movimientos[0].movArticuloId, articuloId);
        assert.equal(movimientos[0].movBodegaId, bodegaId);
    });
});
