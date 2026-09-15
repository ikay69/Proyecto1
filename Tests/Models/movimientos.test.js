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

test('insertar guarda el movimiento y traerKardex lo devuelve con saldo corriente', async () => {
    await withRollback(async (connection) => {
        const { articuloId, usuarioId } = await crearArticuloDePrueba(connection);

        await Movimientos.insertar(connection, {
            pEmpId: 1, pUsuId: usuarioId, pArticuloId: articuloId,
            pTipoMovimiento: 'ENTRADA', pBolsaEstado: 'DISPONIBLE', pPropietarioId: null,
            pCantidad: 10, pCostoUnitario: 50, pMotivo: 'AJUSTE', pTipoOrigen: 'AJUSTE',
            pOrigenId: null, pObservaciones: 'primera entrada'
        });
        await Movimientos.insertar(connection, {
            pEmpId: 1, pUsuId: usuarioId, pArticuloId: articuloId,
            pTipoMovimiento: 'SALIDA', pBolsaEstado: 'DISPONIBLE', pPropietarioId: null,
            pCantidad: 3, pCostoUnitario: null, pMotivo: 'AJUSTE', pTipoOrigen: 'AJUSTE',
            pOrigenId: null, pObservaciones: 'ajuste de salida'
        });

        const kardex = await Movimientos.traerKardex({
            pEmpId: 1, pArticuloId: articuloId,
            pFechaInicio: '2020-01-01', pFechaFin: '2100-01-01', pOffset: 0
        }, connection);

        assert.equal(kardex.length, 2);
        assert.equal(Number(kardex[0].movSaldo), 10);
        assert.equal(Number(kardex[1].movSaldo), 7);
    });
});

test('traerPorOrigen filtra por TipoOrigen y OrigenId', async () => {
    await withRollback(async (connection) => {
        const { articuloId, usuarioId } = await crearArticuloDePrueba(connection);

        await Movimientos.insertar(connection, {
            pEmpId: 1, pUsuId: usuarioId, pArticuloId: articuloId,
            pTipoMovimiento: 'ENTRADA', pBolsaEstado: 'DISPONIBLE', pPropietarioId: null,
            pCantidad: 5, pCostoUnitario: 20, pMotivo: 'PRODUCCION', pTipoOrigen: 'PRODUCCION',
            pOrigenId: 999, pObservaciones: null
        });

        const movimientos = await Movimientos.traerPorOrigen({
            pEmpId: 1, pTipoOrigen: 'PRODUCCION', pOrigenId: 999
        }, connection);

        assert.equal(movimientos.length, 1);
        assert.equal(movimientos[0].movArticuloId, articuloId);
    });
});
