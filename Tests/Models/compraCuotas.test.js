import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback } from '../dbTestUtils.js';
import Compras from '../../Models/compras.js';
import CompraCuotas from '../../Models/compraCuotas.js';

// crea una compra a credito y devuelve su Id. Todo dentro de la transaccion del llamador, que
// hace rollback al final.
const compraACredito = async (connection, numeroCuotas = 3) => {
    const [usuarioRows] = await connection.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    const [terceroRows] = await connection.query(`SELECT Id FROM Terceros WHERE EmpresaId = 1 LIMIT 1;`);
    if (terceroRows.length === 0) throw new Error('Se requiere un Tercero en la empresa 1 para esta prueba');

    return Compras.crear(connection, {
        pEmpId: 1, pUsuId: usuarioRows[0].Id, pTerceroId: terceroRows[0].Id,
        pTerceroTipoDoc: null, pTerceroNumeroDoc: null, pTerceroNombre: 'PROVEEDOR DE CUOTAS',
        pNumeroDocumentoSoporte: null, pTipoCompra: 'CREDITO',
        pValorSubtotal: 900000, pValorDescuento: 0, pValorCancelado: 0, pValorSaldo: 900000,
        pValorEfectivo: 0, pValorTransaccion: 0,
        pFechaCompromiso: null, pNumeroCuotas: numeroCuotas, pValorCuota: null
    });
};

test('crearVarias inserta el desglose completo', async () => {
    await withRollback(async (connection) => {
        const compraId = await compraACredito(connection);

        await CompraCuotas.crearVarias(connection, {
            pEmpId: 1, pCompraId: compraId,
            cuotas: [
                {NumCuota: 1, ValorCuota: 400000, FechaPago: '2026-10-15 00:00:00', Estado: 'PENDIENTE'},
                {NumCuota: 2, ValorCuota: 300000, FechaPago: '2026-11-15 00:00:00', Estado: 'PENDIENTE'},
                {NumCuota: 3, ValorCuota: 200000, FechaPago: null, Estado: 'PENDIENTE'}
            ]
        });

        const cuotas = await CompraCuotas.traerPorCompra({pEmpId: 1, pCompraId: compraId}, connection);
        assert.equal(cuotas.length, 3);
        assert.equal(Number(cuotas[0].cuoValorCuota), 400000);
        assert.equal(Number(cuotas[2].cuoValorCuota), 200000);
        assert.equal(cuotas[2].cuoFechaPago, null);
    });
});

test('crearVarias no hace nada con un arreglo vacio o ausente', async () => {
    await withRollback(async (connection) => {
        const compraId = await compraACredito(connection);

        await CompraCuotas.crearVarias(connection, {pEmpId: 1, pCompraId: compraId, cuotas: []});
        await CompraCuotas.crearVarias(connection, {pEmpId: 1, pCompraId: compraId, cuotas: undefined});

        const cuotas = await CompraCuotas.traerPorCompra({pEmpId: 1, pCompraId: compraId}, connection);
        assert.equal(cuotas.length, 0);
    });
});

test('traerPorCompra devuelve las cuotas ordenadas por NumCuota', async () => {
    await withRollback(async (connection) => {
        const compraId = await compraACredito(connection);

        // se insertan desordenadas a proposito: sin ORDER BY el orden lo decide el plan de
        // ejecucion y el desglose se muestra revuelto.
        await CompraCuotas.crearVarias(connection, {
            pEmpId: 1, pCompraId: compraId,
            cuotas: [{NumCuota: 3, ValorCuota: 200000}, {NumCuota: 1, ValorCuota: 400000}, {NumCuota: 2, ValorCuota: 300000}]
        });

        const cuotas = await CompraCuotas.traerPorCompra({pEmpId: 1, pCompraId: compraId}, connection);
        assert.deepEqual(cuotas.map(c => c.cuoNumCuota), [1, 2, 3]);
    });
});

test('crear usa PENDIENTE como estado por defecto', async () => {
    await withRollback(async (connection) => {
        const compraId = await compraACredito(connection);

        const cuotaId = await CompraCuotas.crear(
            {pEmpId: 1, pCompraId: compraId, pNumCuota: 1, pValorCuota: 400000}, connection);
        assert.ok(cuotaId > 0);

        const cuota = await CompraCuotas.traerPorId({pEmpId: 1, pId: cuotaId}, connection);
        assert.equal(cuota.cuoEstado, 'PENDIENTE');
        assert.equal(cuota.cuoFechaPago, null);
    });
});

test('el UNIQUE rechaza dos cuotas con el mismo numero en la misma compra', async () => {
    await withRollback(async (connection) => {
        const compraId = await compraACredito(connection);
        await CompraCuotas.crear({pEmpId: 1, pCompraId: compraId, pNumCuota: 1, pValorCuota: 100}, connection);

        await assert.rejects(
            () => CompraCuotas.crear({pEmpId: 1, pCompraId: compraId, pNumCuota: 1, pValorCuota: 200}, connection),
            (error) => error.code === 'ER_DUP_ENTRY'
        );
    });
});

test('traerPorId trae el estado y el tipo de la compra junto con la cuota', async () => {
    await withRollback(async (connection) => {
        const compraId = await compraACredito(connection, 5);
        const cuotaId = await CompraCuotas.crear(
            {pEmpId: 1, pCompraId: compraId, pNumCuota: 2, pValorCuota: 100000}, connection);

        const cuota = await CompraCuotas.traerPorId({pEmpId: 1, pId: cuotaId}, connection);
        // los tres endpoints de edicion necesitan estos campos para decidir si pueden escribir;
        // traerlos en el mismo SELECT ahorra una segunda consulta.
        assert.equal(cuota.cuoCompraId, compraId);
        assert.equal(Number(cuota.compraEstado), 1);
        assert.equal(cuota.compraTipoCompra, 'CREDITO');
        assert.equal(cuota.compraNumeroCuotas, 5);
    });
});

test('traerPorId no devuelve una cuota de otra empresa', async () => {
    await withRollback(async (connection) => {
        const compraId = await compraACredito(connection);
        const cuotaId = await CompraCuotas.crear(
            {pEmpId: 1, pCompraId: compraId, pNumCuota: 1, pValorCuota: 100}, connection);

        assert.equal(await CompraCuotas.traerPorId({pEmpId: 2, pId: cuotaId}, connection), null);
    });
});

test('actualizar cambia solo los campos que se le pasan', async () => {
    await withRollback(async (connection) => {
        const compraId = await compraACredito(connection);
        const cuotaId = await CompraCuotas.crear({
            pEmpId: 1, pCompraId: compraId, pNumCuota: 1, pValorCuota: 400000,
            pFechaPago: '2026-10-15 00:00:00'
        }, connection);

        const filas = await CompraCuotas.actualizar(
            {pEmpId: 1, pId: cuotaId, pEstado: 'CANCELADA'}, connection);
        assert.equal(filas, 1);

        const cuota = await CompraCuotas.traerPorId({pEmpId: 1, pId: cuotaId}, connection);
        assert.equal(cuota.cuoEstado, 'CANCELADA');
        assert.equal(Number(cuota.cuoValorCuota), 400000);      // intacto
        assert.ok(cuota.cuoFechaPago instanceof Date);          // intacta
    });
});

test('actualizar puede vaciar la fecha de pago con null', async () => {
    await withRollback(async (connection) => {
        const compraId = await compraACredito(connection);
        const cuotaId = await CompraCuotas.crear({
            pEmpId: 1, pCompraId: compraId, pNumCuota: 1, pValorCuota: 400000,
            pFechaPago: '2026-10-15 00:00:00'
        }, connection);

        // un COALESCE(?, columna) no podria hacer esto: no distingue "no cambiar" de
        // "poner en null". Por eso el SET se arma con los campos presentes.
        await CompraCuotas.actualizar({pEmpId: 1, pId: cuotaId, pFechaPago: null}, connection);

        const cuota = await CompraCuotas.traerPorId({pEmpId: 1, pId: cuotaId}, connection);
        assert.equal(cuota.cuoFechaPago, null);
    });
});

test('actualizar sin ningun campo devuelve 0 y no toca la base', async () => {
    await withRollback(async (connection) => {
        const compraId = await compraACredito(connection);
        const cuotaId = await CompraCuotas.crear(
            {pEmpId: 1, pCompraId: compraId, pNumCuota: 1, pValorCuota: 400000}, connection);

        assert.equal(await CompraCuotas.actualizar({pEmpId: 1, pId: cuotaId}, connection), 0);

        const cuota = await CompraCuotas.traerPorId({pEmpId: 1, pId: cuotaId}, connection);
        assert.equal(Number(cuota.cuoValorCuota), 400000);
    });
});

test('actualizar no toca una cuota de otra empresa', async () => {
    await withRollback(async (connection) => {
        const compraId = await compraACredito(connection);
        const cuotaId = await CompraCuotas.crear(
            {pEmpId: 1, pCompraId: compraId, pNumCuota: 1, pValorCuota: 400000}, connection);

        assert.equal(await CompraCuotas.actualizar({pEmpId: 2, pId: cuotaId, pEstado: 'CANCELADA'}, connection), 0);
    });
});

test('eliminar borra la fila y es idempotente', async () => {
    await withRollback(async (connection) => {
        const compraId = await compraACredito(connection);
        const cuotaId = await CompraCuotas.crear(
            {pEmpId: 1, pCompraId: compraId, pNumCuota: 1, pValorCuota: 400000}, connection);

        assert.equal(await CompraCuotas.eliminar({pEmpId: 1, pId: cuotaId}, connection), 1);
        assert.equal(await CompraCuotas.eliminar({pEmpId: 1, pId: cuotaId}, connection), 0);
        assert.equal(await CompraCuotas.traerPorId({pEmpId: 1, pId: cuotaId}, connection), null);
    });
});

test('eliminar no borra una cuota de otra empresa', async () => {
    await withRollback(async (connection) => {
        const compraId = await compraACredito(connection);
        const cuotaId = await CompraCuotas.crear(
            {pEmpId: 1, pCompraId: compraId, pNumCuota: 1, pValorCuota: 400000}, connection);

        assert.equal(await CompraCuotas.eliminar({pEmpId: 2, pId: cuotaId}, connection), 0);
        assert.ok(await CompraCuotas.traerPorId({pEmpId: 1, pId: cuotaId}, connection));
    });
});
