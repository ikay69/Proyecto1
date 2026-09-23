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

//---- filtros y orden del listado paginado ----
//
//Las tres compras de estas pruebas se siembran con FechaCreacion en 2037 (el tope del TIMESTAMP
//de MySQL) para que queden siempre en la primera pagina, y con marcas 'ZZ...' para no chocar con
//los datos sembrados de la base de desarrollo.

const sembrarTresCompras = async (connection) => {
    const {usuarioId} = await datosBase(connection);
    const [terceroRows] = await connection.query(`SELECT Id FROM Terceros WHERE EmpresaId = 1 ORDER BY Id LIMIT 2;`);
    if (terceroRows.length < 2) throw new Error('Se requieren dos Terceros en la empresa 1 para esta prueba');
    const terceroA = terceroRows[0].Id;
    const terceroB = terceroRows[1].Id;

    const crear = async ({terceroId, tipoDoc, numeroDoc, nombre, soporte}) => Compras.crear(connection, {
        pEmpId: 1, pUsuId: usuarioId, pTerceroId: terceroId,
        pTerceroTipoDoc: tipoDoc, pTerceroNumeroDoc: numeroDoc, pTerceroNombre: nombre,
        pNumeroDocumentoSoporte: soporte, pTipoCompra: 'CONTADO',
        pValorSubtotal: 1000, pValorDescuento: 0, pValorCancelado: 1000, pValorSaldo: 0,
        pValorEfectivo: 1000, pValorTransaccion: 0
    });

    //A: tercero A, con documento soporte. B: tercero A, sin documento soporte (NULL a proposito).
    //C: tercero B.
    const idA = await crear({terceroId: terceroA, tipoDoc: 'ZC', numeroDoc: 'ZZ-100', nombre: 'ZZ ALFA',   soporte: 'ZZFV-001'});
    const idB = await crear({terceroId: terceroA, tipoDoc: 'ZN', numeroDoc: 'ZZ-200', nombre: 'ZZ BRAVO',  soporte: null});
    const idC = await crear({terceroId: terceroB, tipoDoc: 'ZP', numeroDoc: 'ZZ-300', nombre: 'ZZ CHARLIE', soporte: 'ZZFV-003'});

    await connection.query(
        `UPDATE Compras SET FechaCreacion = '2037-01-01 00:00:00' WHERE Id IN (?,?,?);`,
        [idA, idB, idC]
    );

    return {terceroA, terceroB, idA, idB, idC};
};

//solo las filas sembradas por la prueba, en el orden en que las devolvio el listado
const soloSembradas = (filas, ids) => filas.filter(f => ids.includes(f.compraId)).map(f => f.compraId);

test('traerTodo filtra por TerceroId y con 0 trae los de todos los terceros', async () => {
    await withRollback(async (connection) => {
        const {terceroA, terceroB, idA, idB, idC} = await sembrarTresCompras(connection);
        const todas = [idA, idB, idC];

        const deA = await Compras.traerTodo({pEmpId: 1, pOffset: 0, pTerceroId: terceroA}, connection);
        assert.deepEqual(soloSembradas(deA, todas).sort(), [idA, idB].sort());
        assert.ok(deA.every(f => Number(f.compraTerceroId) === Number(terceroA)),
            'el filtro no debe dejar pasar compras de otro tercero');

        const deB = await Compras.traerTodo({pEmpId: 1, pOffset: 0, pTerceroId: terceroB}, connection);
        assert.deepEqual(soloSembradas(deB, todas), [idC]);

        //0 y el ausente son el mismo caso: todos los terceros
        const conCero = await Compras.traerTodo({pEmpId: 1, pOffset: 0, pTerceroId: 0}, connection);
        assert.deepEqual(soloSembradas(conCero, todas).sort(), todas.slice().sort());

        const sinFiltro = await Compras.traerTodo({pEmpId: 1, pOffset: 0}, connection);
        assert.deepEqual(soloSembradas(sinFiltro, todas).sort(), todas.slice().sort());
    });
});

//el defecto clasico de estos listados: filtrar el listado y no el conteo. Si se separan,
//cantData deja de corresponder con las paginas y el front pagina al vacio.
test('contarTodo aplica los mismos filtros que traerTodo', async () => {
    await withRollback(async (connection) => {
        const {terceroA, terceroB} = await sembrarTresCompras(connection);

        for (const filtros of [
            {},
            {pTerceroId: terceroA},
            {pTerceroId: terceroB},
            {pCampoOrden: 'TerceroNombre', pTexto: '%ZZ %'},
            {pCampoOrden: 'NumeroDocumentoSoporte', pTexto: '%ZZFV%'},
            {pCampoOrden: 'TerceroNombre', pTexto: '%ZZ %', pTerceroId: terceroA}
        ]) {
            const total = await Compras.contarTodo({pEmpId: 1, ...filtros}, connection);
            const filas = await Compras.traerTodo({pEmpId: 1, pOffset: 0, ...filtros}, connection);
            assert.equal(Number(total), filas.length,
                `el conteo y el listado no cuadran para ${JSON.stringify(filtros)}`);
        }
    });
});

test('traerTodo ordena por el campo pedido, en el sentido pedido', async () => {
    await withRollback(async (connection) => {
        const {idA, idB, idC} = await sembrarTresCompras(connection);
        const todas = [idA, idB, idC];

        const porNombreAsc = await Compras.traerTodo(
            {pEmpId: 1, pOffset: 0, pCampoOrden: 'TerceroNombre', pOrden: 'ASC'}, connection);
        assert.deepEqual(soloSembradas(porNombreAsc, todas), [idA, idB, idC], 'ALFA, BRAVO, CHARLIE');

        const porNombreDesc = await Compras.traerTodo(
            {pEmpId: 1, pOffset: 0, pCampoOrden: 'TerceroNombre', pOrden: 'DESC'}, connection);
        assert.deepEqual(soloSembradas(porNombreDesc, todas), [idC, idB, idA]);

        const porNumeroDoc = await Compras.traerTodo(
            {pEmpId: 1, pOffset: 0, pCampoOrden: 'TerceroNumeroDoc', pOrden: 'ASC'}, connection);
        assert.deepEqual(soloSembradas(porNumeroDoc, todas), [idA, idB, idC]);

        const porTipoDoc = await Compras.traerTodo(
            {pEmpId: 1, pOffset: 0, pCampoOrden: 'TerceroTipoDoc', pOrden: 'DESC'}, connection);
        assert.deepEqual(soloSembradas(porTipoDoc, todas), [idC, idB, idA], 'ZP, ZN, ZC');
    });
});

//el desempate por c.Id va en el MISMO sentido que el orden pedido: con las tres compras en la
//misma FechaCreacion, el unico criterio que queda es el Id.
test('el desempate por Id sigue el sentido del orden pedido', async () => {
    await withRollback(async (connection) => {
        const {idA, idB, idC} = await sembrarTresCompras(connection);
        const todas = [idA, idB, idC];

        const desc = await Compras.traerTodo(
            {pEmpId: 1, pOffset: 0, pCampoOrden: 'FechaCreacion', pOrden: 'DESC'}, connection);
        assert.deepEqual(soloSembradas(desc, todas), [idC, idB, idA]);

        const asc = await Compras.traerTodo(
            {pEmpId: 1, pOffset: 0, pCampoOrden: 'FechaCreacion', pOrden: 'ASC'}, connection);
        //en ASC las sembradas son las ULTIMAS (su fecha es la mas alta), pero entre ellas el
        //orden relativo debe ser el ascendente por Id
        assert.deepEqual(soloSembradas(asc, todas), [idA, idB, idC]);
    });
});

test('el textoFiltro filtra por la misma columna por la que se ordena', async () => {
    await withRollback(async (connection) => {
        const {idA, idB, idC} = await sembrarTresCompras(connection);
        const todas = [idA, idB, idC];

        const porNombre = await Compras.traerTodo(
            {pEmpId: 1, pOffset: 0, pCampoOrden: 'TerceroNombre', pTexto: '%BRAVO%'}, connection);
        assert.deepEqual(soloSembradas(porNombre, todas), [idB]);

        const porSoporte = await Compras.traerTodo(
            {pEmpId: 1, pOffset: 0, pCampoOrden: 'NumeroDocumentoSoporte', pTexto: '%ZZFV-003%'}, connection);
        assert.deepEqual(soloSembradas(porSoporte, todas), [idC]);

        //el texto se aplica a la columna de ORDEN, no a todas: buscar un nombre mientras se
        //ordena por documento soporte no devuelve nada.
        const cruzado = await Compras.traerTodo(
            {pEmpId: 1, pOffset: 0, pCampoOrden: 'NumeroDocumentoSoporte', pTexto: '%BRAVO%'}, connection);
        assert.deepEqual(soloSembradas(cruzado, todas), []);
    });
});

//NumeroDocumentoSoporte, TerceroTipoDoc y TerceroNumeroDoc son NULL-ables, y `NULL LIKE '%%'`
//es NULL, no TRUE: si el "sin filtro" se implementara como un LIKE '%%' en vez de como la
//ausencia del predicado, las compras sin documento soporte desaparecerian del listado.
//Si esta prueba falla, ese es el bug: revisar filtroTexto en Models/compras.js.
test('sin textoFiltro las compras con documento soporte NULL siguen apareciendo', async () => {
    await withRollback(async (connection) => {
        const {idA, idB, idC} = await sembrarTresCompras(connection);
        const todas = [idA, idB, idC];

        const filas = await Compras.traerTodo(
            {pEmpId: 1, pOffset: 0, pCampoOrden: 'NumeroDocumentoSoporte', pTexto: '%%'}, connection);
        const devueltas = soloSembradas(filas, todas);
        assert.ok(devueltas.includes(idB), 'la compra sin documento soporte debe seguir en el listado');
        assert.equal(devueltas.length, 3);

        const total = await Compras.contarTodo(
            {pEmpId: 1, pCampoOrden: 'NumeroDocumentoSoporte', pTexto: '%%'}, connection);
        const totalSinCampo = await Compras.contarTodo({pEmpId: 1}, connection);
        assert.equal(Number(total), Number(totalSinCampo));
    });
});

//pCampoOrden es el unico dato del listado que llega al SQL interpolado. La lista blanca del
//modelo es lo que cierra la inyeccion: cualquier cosa fuera de ella cae a FechaCreacion en vez
//de viajar al ORDER BY. Si esta prueba empieza a fallar, no la relajes: la inyeccion vuelve.
test('un campo de orden fuera de la lista blanca cae a FechaCreacion sin llegar al SQL', async () => {
    await withRollback(async (connection) => {
        const {idA, idB, idC} = await sembrarTresCompras(connection);
        const todas = [idA, idB, idC];

        const esperado = await Compras.traerTodo(
            {pEmpId: 1, pOffset: 0, pCampoOrden: 'FechaCreacion', pOrden: 'DESC'}, connection);

        for (const campo of ['Id; DROP TABLE Compras', 'ValorSubtotal', '', null, undefined]) {
            const filas = await Compras.traerTodo(
                {pEmpId: 1, pOffset: 0, pCampoOrden: campo, pOrden: 'DESC'}, connection);
            assert.deepEqual(soloSembradas(filas, todas), soloSembradas(esperado, todas),
                `pCampoOrden ${String(campo)} debio caer a FechaCreacion`);
        }

        //el sentido tambien: cualquier cosa que no sea ASC ordena DESC
        const raro = await Compras.traerTodo(
            {pEmpId: 1, pOffset: 0, pCampoOrden: 'FechaCreacion', pOrden: 'DESC; DROP TABLE Compras'}, connection);
        assert.deepEqual(soloSembradas(raro, todas), soloSembradas(esperado, todas));
    });
});

test('traerTodo expone el tercero completo para las columnas por las que se puede ordenar', async () => {
    await withRollback(async (connection) => {
        const {terceroA, idA} = await sembrarTresCompras(connection);

        const filas = await Compras.traerTodo({pEmpId: 1, pOffset: 0}, connection);
        const fila = filas.find(f => f.compraId === idA);

        assert.ok(fila, 'la compra sembrada deberia estar en la primera pagina');
        assert.equal(Number(fila.compraTerceroId), Number(terceroA));
        assert.equal(fila.compraTerceroTipoDoc, 'ZC');
        assert.equal(fila.compraTerceroNumeroDoc, 'ZZ-100');
        assert.equal(fila.compraTercero, 'ZZ ALFA');
        assert.equal(fila.compraDocumentoSoporte, 'ZZFV-001');
    });
});
