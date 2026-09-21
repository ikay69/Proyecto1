import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback } from '../dbTestUtils.js';
import Compras from '../../Models/compras.js';
import CompraDetalles from '../../Models/compraDetalles.js';

const datosBase = async (connection) => {
    const [usuarioRows] = await connection.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    const [terceroRows] = await connection.query(`SELECT Id FROM Terceros WHERE EmpresaId = 1 LIMIT 1;`);
    if (terceroRows.length === 0) throw new Error('Se requiere un Tercero en la empresa 1 para esta prueba');
    return {usuarioId: usuarioRows[0].Id, terceroId: terceroRows[0].Id};
};

test('crear devuelve el insertId y guarda el documento soporte', async () => {
    await withRollback(async (connection) => {
        const {usuarioId, terceroId} = await datosBase(connection);

        const compraId = await Compras.crear(connection, {
            pEmpId: 1, pUsuId: usuarioId, pTerceroId: terceroId,
            pTerceroTipoDoc: 'CC', pTerceroNumeroDoc: '123', pTerceroNombre: 'VENDEDOR DE PRUEBA',
            pNumeroDocumentoSoporte: 'FV-0012', pTipoCompra: 'CONTADO',
            pValorSubtotal: 800000, pValorDescuento: 0, pValorCancelado: 800000, pValorSaldo: 0,
            pValorEfectivo: 800000, pValorTransaccion: 0
        });

        assert.ok(compraId > 0);

        const compra = await Compras.traerPorId({pEmpId: 1, pId: compraId}, connection);
        assert.equal(compra.compraDocumentoSoporte, 'FV-0012');
        assert.equal(compra.compraTipoCompra, 'CONTADO');
        assert.equal(Number(compra.compraSubtotal), 800000);
        assert.equal(Number(compra.compraSaldo), 0);
    });
});

test('crear acepta documento soporte nulo', async () => {
    await withRollback(async (connection) => {
        const {usuarioId, terceroId} = await datosBase(connection);

        const compraId = await Compras.crear(connection, {
            pEmpId: 1, pUsuId: usuarioId, pTerceroId: terceroId,
            pTerceroTipoDoc: null, pTerceroNumeroDoc: null, pTerceroNombre: 'PARTICULAR SIN DOCUMENTO',
            pNumeroDocumentoSoporte: null, pTipoCompra: 'CONTADO',
            pValorSubtotal: 1000, pValorDescuento: 0, pValorCancelado: 1000, pValorSaldo: 0,
            pValorEfectivo: 1000, pValorTransaccion: 0
        });

        const compra = await Compras.traerPorId({pEmpId: 1, pId: compraId}, connection);
        assert.equal(compra.compraDocumentoSoporte, null);
        assert.equal(compra.compraTerceroNumeroDoc, null);
    });
});

test('traerPorId no devuelve una compra de otra empresa', async () => {
    await withRollback(async (connection) => {
        const {usuarioId, terceroId} = await datosBase(connection);

        const compraId = await Compras.crear(connection, {
            pEmpId: 1, pUsuId: usuarioId, pTerceroId: terceroId,
            pTerceroTipoDoc: null, pTerceroNumeroDoc: null, pTerceroNombre: 'VENDEDOR DE PRUEBA',
            pNumeroDocumentoSoporte: null, pTipoCompra: 'CONTADO',
            pValorSubtotal: 1000, pValorDescuento: 0, pValorCancelado: 1000, pValorSaldo: 0,
            pValorEfectivo: 1000, pValorTransaccion: 0
        });

        const ajena = await Compras.traerPorId({pEmpId: 2, pId: compraId}, connection);
        assert.equal(ajena, null);
    });
});

test('contarTodo y traerTodo respetan la empresa', async () => {
    const antes = await Compras.contarTodo({pEmpId: 1});
    assert.ok(Number.isFinite(Number(antes)));

    const pagina = await Compras.traerTodo({pEmpId: 1, pOffset: 0});
    assert.ok(Array.isArray(pagina));
    assert.ok(pagina.length <= 50);
});

test('traerTodo es determinista: FechaCreacion DESC con c.Id DESC como desempate', async () => {
    await withRollback(async (connection) => {
        const {usuarioId, terceroId} = await datosBase(connection);

        const crearCompraMinima = async () => Compras.crear(connection, {
            pEmpId: 1, pUsuId: usuarioId, pTerceroId: terceroId,
            pTerceroTipoDoc: null, pTerceroNumeroDoc: null, pTerceroNombre: 'VENDEDOR DE PRUEBA',
            pNumeroDocumentoSoporte: null, pTipoCompra: 'CONTADO',
            pValorSubtotal: 1000, pValorDescuento: 0, pValorCancelado: 1000, pValorSaldo: 0,
            pValorEfectivo: 1000, pValorTransaccion: 0
        });

        const idA = await crearCompraMinima();
        const idB = await crearCompraMinima();
        const idC = await crearCompraMinima();

        //se fuerza la MISMA FechaCreacion en las tres, y en el futuro para que queden siempre
        //primero en el orden: asi la posicion relativa entre ellas solo puede venir del
        //desempate c.Id DESC, nunca de la fecha (que aqui es identica). 2037 es el limite
        //superior del tipo TIMESTAMP de MySQL, asi que es lo mas lejos que se puede forzar.
        await connection.query(
            `UPDATE Compras SET FechaCreacion = '2037-01-01 00:00:00' WHERE Id IN (?,?,?);`,
            [idA, idB, idC]
        );

        const pagina = await Compras.traerTodo({pEmpId: 1, pOffset: 0}, connection);
        const idsDevueltos = pagina.map(c => c.compraId);
        const posA = idsDevueltos.indexOf(idA);
        const posB = idsDevueltos.indexOf(idB);
        const posC = idsDevueltos.indexOf(idC);

        assert.ok(posA !== -1 && posB !== -1 && posC !== -1, 'las tres compras deben aparecer en la pagina');
        //Id DESC: la ultima creada (idC, el Id mas alto) debe salir primero
        assert.ok(posC < posB, 'idC (mas nuevo) debe ir antes que idB');
        assert.ok(posB < posA, 'idB debe ir antes que idA (mas viejo)');
    });
});

test('contarTodo y traerTodo aceptan un connWrapper para ver filas no confirmadas de su propia transaccion', async () => {
    await withRollback(async (connection) => {
        const {usuarioId, terceroId} = await datosBase(connection);
        const antesPool = await Compras.contarTodo({pEmpId: 1});

        await Compras.crear(connection, {
            pEmpId: 1, pUsuId: usuarioId, pTerceroId: terceroId,
            pTerceroTipoDoc: null, pTerceroNumeroDoc: null, pTerceroNombre: 'VENDEDOR DE PRUEBA',
            pNumeroDocumentoSoporte: null, pTipoCompra: 'CONTADO',
            pValorSubtotal: 1000, pValorDescuento: 0, pValorCancelado: 1000, pValorSaldo: 0,
            pValorEfectivo: 1000, pValorTransaccion: 0
        });

        //dentro de la propia transaccion (mismo connWrapper), la fila recien creada SI se ve
        const dentroTransaccion = await Compras.contarTodo({pEmpId: 1}, connection);
        assert.equal(Number(dentroTransaccion), Number(antesPool) + 1);

        //el pool por defecto (otra conexion) todavia no la ve: no esta confirmada
        const fueraTransaccion = await Compras.contarTodo({pEmpId: 1});
        assert.equal(Number(fueraTransaccion), Number(antesPool));
    });
});

test('crearVarias inserta las lineas y traerPorCompra las devuelve con el nombre de bodega', async () => {
    await withRollback(async (connection) => {
        const {usuarioId, terceroId} = await datosBase(connection);
        const [articuloRows] = await connection.query(`SELECT Id, Nombre FROM Articulos WHERE EmpresaId = 1 LIMIT 1;`);
        const [bodegaRows] = await connection.query(`SELECT Id FROM Bodegas WHERE EmpresaId = 1 LIMIT 1;`);
        if (articuloRows.length === 0 || bodegaRows.length === 0) {
            throw new Error('Se requiere al menos un Articulo y una Bodega en la empresa 1');
        }

        const compraId = await Compras.crear(connection, {
            pEmpId: 1, pUsuId: usuarioId, pTerceroId: terceroId,
            pTerceroTipoDoc: null, pTerceroNumeroDoc: null, pTerceroNombre: 'VENDEDOR DE PRUEBA',
            pNumeroDocumentoSoporte: null, pTipoCompra: 'CONTADO',
            pValorSubtotal: 100000, pValorDescuento: 0, pValorCancelado: 100000, pValorSaldo: 0,
            pValorEfectivo: 100000, pValorTransaccion: 0
        });

        await CompraDetalles.crearVarias(connection, {
            pEmpId: 1, pCompraId: compraId,
            lineas: [{
                ArticuloId: articuloRows[0].Id, BodegaId: bodegaRows[0].Id,
                ArticuloNombre: articuloRows[0].Nombre, Cantidad: 2, CostoUnidad: 50000
            }]
        });

        const lineas = await CompraDetalles.traerPorCompra({pEmpId: 1, pCompraId: compraId}, connection);
        assert.equal(lineas.length, 1);
        assert.equal(lineas[0].detArticuloId, articuloRows[0].Id);
        assert.equal(Number(lineas[0].detCantidad), 2);
        assert.equal(Number(lineas[0].detCostoUnidad), 50000);
        assert.ok('detBodegaNombre' in lineas[0]);
    });
});

test('crear persiste los campos del credito y se leen de vuelta', async () => {
    await withRollback(async (connection) => {
        const {usuarioId, terceroId} = await datosBase(connection);

        const compraId = await Compras.crear(connection, {
            pEmpId: 1, pUsuId: usuarioId, pTerceroId: terceroId,
            pTerceroTipoDoc: 'CC', pTerceroNumeroDoc: '123', pTerceroNombre: 'PROVEEDOR A CREDITO',
            pNumeroDocumentoSoporte: 'FAC-4471', pTipoCompra: 'CREDITO',
            pValorSubtotal: 1000000, pValorDescuento: 0, pValorCancelado: 200000, pValorSaldo: 800000,
            pValorEfectivo: 200000, pValorTransaccion: 0,
            pFechaCompromiso: null, pNumeroCuotas: 3, pValorCuota: 300000
        });

        const compra = await Compras.traerPorId({pEmpId: 1, pId: compraId}, connection);
        assert.equal(compra.compraTipoCompra, 'CREDITO');
        assert.equal(compra.compraNumeroCuotas, 3);
        assert.equal(Number(compra.compraValorCuota), 300000);
        assert.equal(compra.compraFechaCompromiso, null);
        // cada campo de dinero por separado: una transposicion entre Cancelado y Saldo pasaria
        // desapercibida si solo se verificara que la compra se creo.
        assert.equal(Number(compra.compraCancelado), 200000);
        assert.equal(Number(compra.compraSaldo), 800000);
        assert.equal(Number(compra.compraEfectivo), 200000);
        assert.equal(Number(compra.compraTransaccion), 0);
    });
});

test('crear guarda FechaCompromiso cuando la compra es de una sola cuota', async () => {
    await withRollback(async (connection) => {
        const {usuarioId, terceroId} = await datosBase(connection);

        const compraId = await Compras.crear(connection, {
            pEmpId: 1, pUsuId: usuarioId, pTerceroId: terceroId,
            pTerceroTipoDoc: null, pTerceroNumeroDoc: null, pTerceroNombre: 'PROVEEDOR UNA CUOTA',
            pNumeroDocumentoSoporte: null, pTipoCompra: 'CREDITO',
            pValorSubtotal: 500000, pValorDescuento: 0, pValorCancelado: 0, pValorSaldo: 500000,
            pValorEfectivo: 0, pValorTransaccion: 0,
            pFechaCompromiso: '2026-10-15 00:00:00', pNumeroCuotas: 1, pValorCuota: 500000
        });

        const compra = await Compras.traerPorId({pEmpId: 1, pId: compraId}, connection);
        assert.ok(compra.compraFechaCompromiso instanceof Date);
        // el dia que se escribio es el dia que quedo: Helpers/fechas.js existe para esto.
        assert.equal(compra.compraFechaCompromiso.getDate(), 15);
        assert.equal(compra.compraFechaCompromiso.getMonth(), 9); // octubre
    });
});

test('crear deja los campos del credito en null para una compra de contado', async () => {
    await withRollback(async (connection) => {
        const {usuarioId, terceroId} = await datosBase(connection);

        const compraId = await Compras.crear(connection, {
            pEmpId: 1, pUsuId: usuarioId, pTerceroId: terceroId,
            pTerceroTipoDoc: null, pTerceroNumeroDoc: null, pTerceroNombre: 'CONTADO',
            pNumeroDocumentoSoporte: null, pTipoCompra: 'CONTADO',
            pValorSubtotal: 1000, pValorDescuento: 0, pValorCancelado: 1000, pValorSaldo: 0,
            pValorEfectivo: 1000, pValorTransaccion: 0
        });

        const compra = await Compras.traerPorId({pEmpId: 1, pId: compraId}, connection);
        assert.equal(compra.compraNumeroCuotas, null);
        assert.equal(compra.compraValorCuota, null);
        assert.equal(compra.compraFechaCompromiso, null);
    });
});

test('anular marca la compra y guarda motivo, usuario y fecha', async () => {
    await withRollback(async (connection) => {
        const {usuarioId, terceroId} = await datosBase(connection);

        const compraId = await Compras.crear(connection, {
            pEmpId: 1, pUsuId: usuarioId, pTerceroId: terceroId,
            pTerceroTipoDoc: null, pTerceroNumeroDoc: null, pTerceroNombre: 'PARA ANULAR',
            pNumeroDocumentoSoporte: null, pTipoCompra: 'CONTADO',
            pValorSubtotal: 1000, pValorDescuento: 0, pValorCancelado: 1000, pValorSaldo: 0,
            pValorEfectivo: 1000, pValorTransaccion: 0
        });

        const filas = await Compras.anular(
            {pEmpId: 1, pId: compraId, pUsuId: usuarioId, pMotivo: 'Devolución total al proveedor'},
            connection
        );
        assert.equal(filas, 1);

        const compra = await Compras.traerPorId({pEmpId: 1, pId: compraId}, connection);
        assert.equal(Number(compra.compraEstado), 0);
        assert.equal(compra.compraMotivoAnulacion, 'Devolución total al proveedor');
        assert.ok(compra.compraFechaAnulacion instanceof Date);
        assert.ok(compra.compraUsuarioAnulador);  // el nombre del usuario, via JOIN
    });
});

test('anular una compra ya anulada devuelve 0 filas', async () => {
    await withRollback(async (connection) => {
        const {usuarioId, terceroId} = await datosBase(connection);

        const compraId = await Compras.crear(connection, {
            pEmpId: 1, pUsuId: usuarioId, pTerceroId: terceroId,
            pTerceroTipoDoc: null, pTerceroNumeroDoc: null, pTerceroNombre: 'DOBLE ANULACION',
            pNumeroDocumentoSoporte: null, pTipoCompra: 'CONTADO',
            pValorSubtotal: 1000, pValorDescuento: 0, pValorCancelado: 1000, pValorSaldo: 0,
            pValorEfectivo: 1000, pValorTransaccion: 0
        });

        const primera = await Compras.anular({pEmpId:1, pId:compraId, pUsuId:usuarioId, pMotivo:'Primera'}, connection);
        const segunda = await Compras.anular({pEmpId:1, pId:compraId, pUsuId:usuarioId, pMotivo:'Segunda'}, connection);
        assert.equal(primera, 1);
        // el AND Estado = TRUE del WHERE hace la operacion idempotente EN LA BASE: sin ventana
        // de carrera entre un SELECT de chequeo y el UPDATE.
        assert.equal(segunda, 0);

        // y el motivo de la primera no se piso.
        const compra = await Compras.traerPorId({pEmpId: 1, pId: compraId}, connection);
        assert.equal(compra.compraMotivoAnulacion, 'Primera');
    });
});

test('anular no toca una compra de otra empresa', async () => {
    await withRollback(async (connection) => {
        const {usuarioId, terceroId} = await datosBase(connection);

        const compraId = await Compras.crear(connection, {
            pEmpId: 1, pUsuId: usuarioId, pTerceroId: terceroId,
            pTerceroTipoDoc: null, pTerceroNumeroDoc: null, pTerceroNombre: 'AJENA',
            pNumeroDocumentoSoporte: null, pTipoCompra: 'CONTADO',
            pValorSubtotal: 1000, pValorDescuento: 0, pValorCancelado: 1000, pValorSaldo: 0,
            pValorEfectivo: 1000, pValorTransaccion: 0
        });

        const filas = await Compras.anular({pEmpId: 2, pId: compraId, pUsuId: usuarioId, pMotivo: 'Intruso'}, connection);
        assert.equal(filas, 0);
    });
});

test('traerTodo expone la fecha de compromiso y el numero de cuotas', async () => {
    await withRollback(async (connection) => {
        const {usuarioId, terceroId} = await datosBase(connection);

        await Compras.crear(connection, {
            pEmpId: 1, pUsuId: usuarioId, pTerceroId: terceroId,
            pTerceroTipoDoc: null, pTerceroNumeroDoc: null, pTerceroNombre: 'EN LISTADO',
            pNumeroDocumentoSoporte: null, pTipoCompra: 'CREDITO',
            pValorSubtotal: 500000, pValorDescuento: 0, pValorCancelado: 0, pValorSaldo: 500000,
            pValorEfectivo: 0, pValorTransaccion: 0,
            pFechaCompromiso: '2026-10-15 00:00:00', pNumeroCuotas: 1, pValorCuota: 500000
        });

        const filas = await Compras.traerTodo({pEmpId: 1, pOffset: 0}, connection);
        const fila = filas.find(f => f.compraTercero === 'EN LISTADO');
        assert.ok(fila, 'la compra recien creada deberia estar en la primera pagina');
        assert.equal(fila.compraNumeroCuotas, 1);
        assert.ok(fila.compraFechaCompromiso instanceof Date);
    });
});
