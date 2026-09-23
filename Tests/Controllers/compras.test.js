import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../Database/config.js';
import Propiedades from '../../Models/propiedades.js';
import comprasControllers from '../../Controllers/compras.js';

// comprasControllers.crear se invoca directo, sin pasar por Express/JWT: la ruta real ya delega
// toda la logica de negocio en este metodo, y llamarlo directo alcanza para probar el Finding 1
// (el boundary check de las Propiedades de un ArticuloNuevo) sin montar un servidor HTTP.

// stub minimo de Response: status().json() y status().send(). El send() hace falta porque
// eliminarCuota responde 204, que por definicion no lleva cuerpo; sin el, la llamada lanzaria
// TypeError, el catch del Controller lo convertiria en 400 y la prueba mediria el doble en vez
// del codigo.
const crearResSpy = () => {
    const res = {statusCode: null, body: null};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    res.send = (payload) => { res.body = payload ?? null; return res; };
    return res;
};

const limpiarArticulo = async (articuloId) => {
    if (!articuloId) return;
    await pool.query(`DELETE FROM Movimientos WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM Existencias WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM ArticuloPropiedades WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM CompraDetalles WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM Articulos WHERE Id = ?;`, [articuloId]);
};

test('rechaza con 400 un ArticuloNuevo cuya Propiedad pertenece a otra empresa', async () => {
    const [usuarioRows] = await pool.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    const [terceroRows] = await pool.query(`SELECT Id FROM Terceros WHERE EmpresaId = 1 LIMIT 1;`);
    const [productoRows] = await pool.query(`SELECT Id FROM Productos WHERE EmpresaId = 1 LIMIT 1;`);
    const [bodegaRows] = await pool.query(`SELECT Id FROM Bodegas WHERE EmpresaId = 1 AND Estado = 1 LIMIT 1;`);
    if (usuarioRows.length === 0 || terceroRows.length === 0 || productoRows.length === 0 || bodegaRows.length === 0) {
        throw new Error('Se requieren datos base (Usuario, Tercero, Producto, Bodega) de la empresa 1 para esta prueba');
    }

    let propiedadAjenaId = null;
    const nombreArticulo = 'ARTICULO PRUEBA PROPIEDAD AJENA';
    try {
        // Propiedad que pertenece a la empresa 2, no a la 1 que hace la compra: simula
        // exactamente el escenario del Finding 1 (fk_articulopropiedades_propiedad referencia
        // Propiedades.Id de forma global, sin acotar por empresa).
        propiedadAjenaId = await Propiedades.crear({
            pEmpId: 2, pUsuIdCrea: usuarioRows[0].Id, pNombre: 'PROPIEDAD AJENA DE PRUEBA', pTipoDato: 'TEXTO'
        });

        const req = {
            usuario: {Id: usuarioRows[0].Id},
            body: {
                idEmpresa: 1, idTercero: terceroRows[0].Id, TipoCompra: 'CONTADO',
                NumeroDocumentoSoporte: null, ValorDescuento: 0, ValorEfectivo: 180000, ValorTransaccion: 0,
                Articulos: [{
                    idBodega: bodegaRows[0].Id, Cantidad: 1, CostoUnidad: 180000,
                    ArticuloNuevo: {
                        idProducto: productoRows[0].Id, Nombre: nombreArticulo, Descripcion: null,
                        Propiedades: [{idPropiedad: propiedadAjenaId, Valor: 'x'}]
                    }
                }]
            }
        };
        const res = crearResSpy();

        await comprasControllers.crear(req, res);

        assert.equal(res.statusCode, 400);
        assert.equal(res.body.msg, 'Propiedad inválida');

        // sin el boundary check la compra se habria confirmado: el articulo NO debe existir
        const [articulosCreados] = await pool.query(`SELECT Id FROM Articulos WHERE Nombre = ?;`, [nombreArticulo]);
        assert.equal(articulosCreados.length, 0);
    } finally {
        const [restos] = await pool.query(`SELECT Id FROM Articulos WHERE Nombre = ?;`, [nombreArticulo]);
        for (const resto of restos) {
            const [detalleRows] = await pool.query(`SELECT CompraId FROM CompraDetalles WHERE ArticuloId = ?;`, [resto.Id]);
            await limpiarArticulo(resto.Id);
            for (const detalle of detalleRows) {
                await pool.query(`DELETE FROM Compras WHERE Id = ?;`, [detalle.CompraId]);
            }
        }
        if (propiedadAjenaId) {
            await pool.query(`DELETE FROM Propiedades WHERE Id = ?;`, [propiedadAjenaId]);
        }
    }
});

// ---- contexto compartido de las pruebas del credito, la anulacion y las cuotas ----

const contextoDeCompra = async () => {
    const [usuarioRows] = await pool.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    const [terceroRows] = await pool.query(`SELECT Id FROM Terceros WHERE EmpresaId = 1 LIMIT 1;`);
    const [articuloRows] = await pool.query(`SELECT Id FROM Articulos WHERE EmpresaId = 1 AND Estado = 1 LIMIT 1;`);
    const [bodegaRows] = await pool.query(`SELECT Id FROM Bodegas WHERE EmpresaId = 1 AND Estado = 1 LIMIT 1;`);
    if (!usuarioRows.length || !terceroRows.length || !articuloRows.length || !bodegaRows.length) {
        throw new Error('Se requieren Usuario, Tercero, Articulo y Bodega de la empresa 1 para estas pruebas');
    }
    return {
        usuarioId: usuarioRows[0].Id, terceroId: terceroRows[0].Id,
        articuloId: articuloRows[0].Id, bodegaId: bodegaRows[0].Id
    };
};

const reqDeCompra = (ctx, body) => ({
    usuario: {Id: ctx.usuarioId},
    body: {
        idEmpresa: 1, idTercero: ctx.terceroId,
        NumeroDocumentoSoporte: null, ValorDescuento: 0,
        Articulos: [{idArticulo: ctx.articuloId, idBodega: ctx.bodegaId, Cantidad: 2, CostoUnidad: 100000}],
        ...body
    }
});

const borrarCompra = async (compraId) => {
    if (!compraId) return;
    await pool.query(`DELETE FROM CompraCuotas WHERE CompraId = ?;`, [compraId]);
    await pool.query(`DELETE FROM Movimientos WHERE TipoOrigen='COMPRA' AND OrigenId = ?;`, [compraId]);
    await pool.query(`DELETE FROM CompraDetalles WHERE CompraId = ?;`, [compraId]);
    await pool.query(`DELETE FROM Compras WHERE Id = ?;`, [compraId]);
};

// crea una compra a credito y devuelve su Id. El llamador limpia.
const crearCompraCredito = async (ctx, numeroCuotas = 4) => {
    const res = crearResSpy();
    await comprasControllers.crear(reqDeCompra(ctx, {
        TipoCompra: 'CREDITO', ValorEfectivo: 0, ValorTransaccion: 0,
        NumeroCuotas: numeroCuotas, ValorCuota: 60000
    }), res);
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    return res.body.idCompra;
};

test('el Controller ya NO rechaza la modalidad CREDITO', async () => {
    const ctx = await contextoDeCompra();
    let compraId = null;
    try {
        const res = crearResSpy();
        await comprasControllers.crear(reqDeCompra(ctx, {
            TipoCompra: 'CREDITO', ValorEfectivo: 0, ValorTransaccion: 0,
            NumeroCuotas: 2, ValorCuota: 110000, FechaCompromiso: null
        }), res);

        // antes de esta fase respondia 400 "Esta modalidad de compra aun no esta disponible".
        assert.equal(res.statusCode, 200, JSON.stringify(res.body));
        assert.ok(res.body.idCompra > 0);
        compraId = res.body.idCompra;
    } finally {
        await borrarCompra(compraId);
    }
});

test('listarPorId devuelve las cuotas de una compra a credito y un arreglo vacio en una de contado', async () => {
    const ctx = await contextoDeCompra();
    let compraCredito = null, compraContado = null;
    try {
        const resCredito = crearResSpy();
        await comprasControllers.crear(reqDeCompra(ctx, {
            TipoCompra: 'CREDITO', ValorEfectivo: 0, ValorTransaccion: 0,
            NumeroCuotas: 2, ValorCuota: null,
            Cuotas: [
                {NumCuota: 1, ValorCuota: 120000, FechaPago: '2026-10-15'},
                {NumCuota: 2, ValorCuota: 100000, FechaPago: null}
            ]
        }), resCredito);
        assert.equal(resCredito.statusCode, 200, JSON.stringify(resCredito.body));
        compraCredito = resCredito.body.idCompra;

        const resContado = crearResSpy();
        await comprasControllers.crear(reqDeCompra(ctx, {
            TipoCompra: 'CONTADO', ValorEfectivo: 200000, ValorTransaccion: 0
        }), resContado);
        assert.equal(resContado.statusCode, 200, JSON.stringify(resContado.body));
        compraContado = resContado.body.idCompra;

        const detalleCredito = crearResSpy();
        await comprasControllers.listarPorId({body: {idEmpresa: 1, idCompra: compraCredito}}, detalleCredito);
        assert.equal(detalleCredito.statusCode, 200);
        assert.equal(detalleCredito.body.data.cuotas.length, 2);
        assert.equal(detalleCredito.body.data.cuotas[0].cuoNumCuota, 1);
        assert.equal(Number(detalleCredito.body.data.cuotas[0].cuoValorCuota), 120000);
        // la fecha que escribio el usuario es la que quedo, sin correrse un dia.
        assert.equal(detalleCredito.body.data.cuotas[0].cuoFechaPago.getDate(), 15);
        assert.equal(detalleCredito.body.data.compraNumeroCuotas, 2);
        assert.equal(detalleCredito.body.data.compraValorCuota, null);

        const detalleContado = crearResSpy();
        await comprasControllers.listarPorId({body: {idEmpresa: 1, idCompra: compraContado}}, detalleContado);
        assert.deepEqual(detalleContado.body.data.cuotas, []);
    } finally {
        await borrarCompra(compraCredito);
        await borrarCompra(compraContado);
    }
});

// ---- anulacion ----

test('anular marca la compra, y anularla dos veces responde 400', async () => {
    const ctx = await contextoDeCompra();
    let compraId = null;
    try {
        const resCrear = crearResSpy();
        await comprasControllers.crear(reqDeCompra(ctx, {
            TipoCompra: 'CONTADO', ValorEfectivo: 200000, ValorTransaccion: 0
        }), resCrear);
        assert.equal(resCrear.statusCode, 200, JSON.stringify(resCrear.body));
        compraId = resCrear.body.idCompra;

        const primera = crearResSpy();
        await comprasControllers.anular({
            usuario: {Id: ctx.usuarioId},
            body: {idEmpresa: 1, idCompra: compraId, MotivoAnulacion: 'Devolución total al proveedor'}
        }, primera);
        assert.equal(primera.statusCode, 200, JSON.stringify(primera.body));

        const segunda = crearResSpy();
        await comprasControllers.anular({
            usuario: {Id: ctx.usuarioId},
            body: {idEmpresa: 1, idCompra: compraId, MotivoAnulacion: 'Otra vez'}
        }, segunda);
        assert.equal(segunda.statusCode, 400);
        assert.match(segunda.body.msg, /ya está anulada/);

        const detalle = crearResSpy();
        await comprasControllers.listarPorId({body: {idEmpresa: 1, idCompra: compraId}}, detalle);
        assert.equal(Number(detalle.body.data.compraEstado), 0);
        assert.equal(detalle.body.data.compraMotivoAnulacion, 'Devolución total al proveedor');
        assert.ok(detalle.body.data.compraUsuarioAnulador);
    } finally {
        await borrarCompra(compraId);
    }
});

test('anular una compra inexistente responde 400', async () => {
    const ctx = await contextoDeCompra();
    const res = crearResSpy();
    await comprasControllers.anular({
        usuario: {Id: ctx.usuarioId},
        body: {idEmpresa: 1, idCompra: 999999999, MotivoAnulacion: 'No existe'}
    }, res);
    assert.equal(res.statusCode, 400);
});

test('anular no alcanza una compra de otra empresa', async () => {
    const ctx = await contextoDeCompra();
    let compraId = null;
    try {
        const resCrear = crearResSpy();
        await comprasControllers.crear(reqDeCompra(ctx, {
            TipoCompra: 'CONTADO', ValorEfectivo: 200000, ValorTransaccion: 0
        }), resCrear);
        compraId = resCrear.body.idCompra;

        const res = crearResSpy();
        await comprasControllers.anular({
            usuario: {Id: ctx.usuarioId},
            body: {idEmpresa: 2, idCompra: compraId, MotivoAnulacion: 'Intruso de otra empresa'}
        }, res);
        assert.equal(res.statusCode, 400);

        const detalle = crearResSpy();
        await comprasControllers.listarPorId({body: {idEmpresa: 1, idCompra: compraId}}, detalle);
        assert.equal(Number(detalle.body.data.compraEstado), 1);   // sigue viva
    } finally {
        await borrarCompra(compraId);
    }
});

// ---- cuotas sueltas ----

test('crearCuota agrega una cuota y rechaza la repetida con 400', async () => {
    const ctx = await contextoDeCompra();
    let compraId = null;
    try {
        compraId = await crearCompraCredito(ctx);

        const primera = crearResSpy();
        await comprasControllers.crearCuota({body: {
            idEmpresa: 1, idCompra: compraId, NumCuota: 1, ValorCuota: 60000, FechaPago: '2026-10-15'
        }}, primera);
        assert.equal(primera.statusCode, 200, JSON.stringify(primera.body));
        assert.ok(primera.body.idCuota > 0);

        // uq_compracuota_numero: se detecta por el choque, no con un SELECT previo.
        const repetida = crearResSpy();
        await comprasControllers.crearCuota({body: {
            idEmpresa: 1, idCompra: compraId, NumCuota: 1, ValorCuota: 99999
        }}, repetida);
        assert.equal(repetida.statusCode, 400);
        assert.match(repetida.body.msg, /ya está registrada/);
    } finally {
        await borrarCompra(compraId);
    }
});

test('crearCuota rechaza un NumCuota que supera el NumeroCuotas de la compra', async () => {
    const ctx = await contextoDeCompra();
    let compraId = null;
    try {
        compraId = await crearCompraCredito(ctx, 3);

        const res = crearResSpy();
        await comprasControllers.crearCuota({body: {
            idEmpresa: 1, idCompra: compraId, NumCuota: 4, ValorCuota: 60000
        }}, res);
        // el tope es un dato de la base, por eso lo valida el Controller y no el middleware.
        assert.equal(res.statusCode, 400);
        assert.match(res.body.msg, /3/);
    } finally {
        await borrarCompra(compraId);
    }
});

test('crearCuota rechaza una compra de contado', async () => {
    const ctx = await contextoDeCompra();
    let compraId = null;
    try {
        const resCrear = crearResSpy();
        await comprasControllers.crear(reqDeCompra(ctx, {
            TipoCompra: 'CONTADO', ValorEfectivo: 200000, ValorTransaccion: 0
        }), resCrear);
        compraId = resCrear.body.idCompra;

        const res = crearResSpy();
        await comprasControllers.crearCuota({body: {
            idEmpresa: 1, idCompra: compraId, NumCuota: 1, ValorCuota: 100
        }}, res);
        assert.equal(res.statusCode, 400);
        assert.match(res.body.msg, /crédito/);
    } finally {
        await borrarCompra(compraId);
    }
});

test('actualizarCuota cambia estado y fecha, y puede vaciar la fecha', async () => {
    const ctx = await contextoDeCompra();
    let compraId = null;
    try {
        compraId = await crearCompraCredito(ctx);
        const alta = crearResSpy();
        await comprasControllers.crearCuota({body: {
            idEmpresa: 1, idCompra: compraId, NumCuota: 1, ValorCuota: 60000, FechaPago: '2026-10-15'
        }}, alta);
        const cuotaId = alta.body.idCuota;

        const cambio = crearResSpy();
        await comprasControllers.actualizarCuota({body: {
            idEmpresa: 1, idCuota: cuotaId, Estado: 'CANCELADA', FechaPago: '2026-10-20'
        }}, cambio);
        assert.equal(cambio.statusCode, 200, JSON.stringify(cambio.body));

        const detalle = crearResSpy();
        await comprasControllers.listarPorId({body: {idEmpresa: 1, idCompra: compraId}}, detalle);
        assert.equal(detalle.body.data.cuotas[0].cuoEstado, 'CANCELADA');
        assert.equal(detalle.body.data.cuotas[0].cuoFechaPago.getDate(), 20);
        assert.equal(Number(detalle.body.data.cuotas[0].cuoValorCuota), 60000);  // intacto

        const vaciar = crearResSpy();
        await comprasControllers.actualizarCuota({body: {idEmpresa: 1, idCuota: cuotaId, FechaPago: null}}, vaciar);
        assert.equal(vaciar.statusCode, 200);

        const detalle2 = crearResSpy();
        await comprasControllers.listarPorId({body: {idEmpresa: 1, idCompra: compraId}}, detalle2);
        assert.equal(detalle2.body.data.cuotas[0].cuoFechaPago, null);
    } finally {
        await borrarCompra(compraId);
    }
});

test('eliminarCuota borra la fila y responde 204', async () => {
    const ctx = await contextoDeCompra();
    let compraId = null;
    try {
        compraId = await crearCompraCredito(ctx);
        const alta = crearResSpy();
        await comprasControllers.crearCuota({body: {
            idEmpresa: 1, idCompra: compraId, NumCuota: 1, ValorCuota: 60000
        }}, alta);

        const res = crearResSpy();
        await comprasControllers.eliminarCuota({body: {idEmpresa: 1, idCuota: alta.body.idCuota}}, res);
        assert.equal(res.statusCode, 204);

        const detalle = crearResSpy();
        await comprasControllers.listarPorId({body: {idEmpresa: 1, idCompra: compraId}}, detalle);
        assert.equal(detalle.body.data.cuotas.length, 0);
    } finally {
        await borrarCompra(compraId);
    }
});

test('una compra anulada congela sus cuotas pero las sigue mostrando', async () => {
    const ctx = await contextoDeCompra();
    let compraId = null;
    try {
        compraId = await crearCompraCredito(ctx);
        const alta = crearResSpy();
        await comprasControllers.crearCuota({body: {
            idEmpresa: 1, idCompra: compraId, NumCuota: 1, ValorCuota: 60000
        }}, alta);
        const cuotaId = alta.body.idCuota;

        const anular = crearResSpy();
        await comprasControllers.anular({
            usuario: {Id: ctx.usuarioId},
            body: {idEmpresa: 1, idCompra: compraId, MotivoAnulacion: 'Devolución total al proveedor'}
        }, anular);
        assert.equal(anular.statusCode, 200, JSON.stringify(anular.body));

        // los tres endpoints de escritura rechazan...
        const agregar = crearResSpy();
        await comprasControllers.crearCuota({body: {
            idEmpresa: 1, idCompra: compraId, NumCuota: 2, ValorCuota: 60000
        }}, agregar);
        assert.equal(agregar.statusCode, 400);
        assert.match(agregar.body.msg, /anulada/);

        const editar = crearResSpy();
        await comprasControllers.actualizarCuota({body: {
            idEmpresa: 1, idCuota: cuotaId, Estado: 'CANCELADA'
        }}, editar);
        assert.equal(editar.statusCode, 400);

        const borrar = crearResSpy();
        await comprasControllers.eliminarCuota({body: {idEmpresa: 1, idCuota: cuotaId}}, borrar);
        assert.equal(borrar.statusCode, 400);

        // ...pero la lectura sigue funcionando: congelar no es ocultar.
        const detalle = crearResSpy();
        await comprasControllers.listarPorId({body: {idEmpresa: 1, idCompra: compraId}}, detalle);
        assert.equal(detalle.statusCode, 200);
        assert.equal(detalle.body.data.cuotas.length, 1);
        assert.equal(Number(detalle.body.data.compraEstado), 0);
    } finally {
        await borrarCompra(compraId);
    }
});

test('los endpoints de cuotas no alcanzan otra empresa', async () => {
    const ctx = await contextoDeCompra();
    let compraId = null;
    try {
        compraId = await crearCompraCredito(ctx);
        const alta = crearResSpy();
        await comprasControllers.crearCuota({body: {
            idEmpresa: 1, idCompra: compraId, NumCuota: 1, ValorCuota: 60000
        }}, alta);

        const editar = crearResSpy();
        await comprasControllers.actualizarCuota({body: {
            idEmpresa: 2, idCuota: alta.body.idCuota, Estado: 'CANCELADA'
        }}, editar);
        assert.equal(editar.statusCode, 400);

        const borrar = crearResSpy();
        await comprasControllers.eliminarCuota({body: {idEmpresa: 2, idCuota: alta.body.idCuota}}, borrar);
        assert.equal(borrar.statusCode, 400);
    } finally {
        await borrarCompra(compraId);
    }
});

//---- listarTodas: los filtros del listado paginado ----
//
//Estas pruebas NO pueden correr dentro de withRollback: listarTodas llama al modelo sin
//connection, o sea contra el pool, y una transaccion abierta en otra conexion no se ve desde
//ahi. Siembran filas de verdad, marcadas con 'ZZ', y las borran en el finally.

const sembrarComprasListado = async () => {
    const [usuarioRows] = await pool.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    const [terceroRows] = await pool.query(`SELECT Id FROM Terceros WHERE EmpresaId = 1 ORDER BY Id LIMIT 2;`);
    if (terceroRows.length < 2) throw new Error('Se requieren dos Terceros en la empresa 1 para esta prueba');
    const usuarioId = usuarioRows[0].Id;
    const terceroA = terceroRows[0].Id;
    const terceroB = terceroRows[1].Id;

    const crear = async (terceroId, tipoDoc, numeroDoc, nombre, soporte) => {
        const [res] = await pool.query(
            `INSERT INTO Compras(
                EmpresaId, UsuarioIdCreador, TerceroId, TerceroTipoDoc, TerceroNumeroDoc, TerceroNombre,
                NumeroDocumentoSoporte, TipoCompra, ValorSubtotal, ValorDescuento, ValorCancelado,
                ValorSaldo, ValorEfectivo, ValorTransaccion, FechaCreacion)
            VALUES(?,?,?,?,?,?,?,'CONTADO',1000,0,1000,0,1000,0,'2037-01-01 00:00:00');`,
            [1, usuarioId, terceroId, tipoDoc, numeroDoc, nombre, soporte]
        );
        return res.insertId;
    };

    const idA = await crear(terceroA, 'ZC', 'ZZ-100', 'ZZ ALFA',    'ZZFV-001');
    const idB = await crear(terceroA, 'ZN', 'ZZ-200', 'ZZ BRAVO',   null);
    const idC = await crear(terceroB, 'ZP', 'ZZ-300', 'ZZ CHARLIE', 'ZZFV-003');

    return {terceroA, terceroB, idA, idB, idC, ids: [idA, idB, idC]};
};

const listar = async (body) => {
    const res = crearResSpy();
    await comprasControllers.listarTodas({body}, res);
    return res;
};

const idsSembrados = (res, ids) => res.body.data.filter(f => ids.includes(f.compraId)).map(f => f.compraId);

test('listarTodas traduce campoOrdenar a su columna y respeta el orden', async () => {
    const ctx = await sembrarComprasListado();
    try {
        //4 = TerceroNombre
        const asc = await listar({idEmpresa: 1, campoOrdenar: 4, orden: 'ASC', pagina: 1});
        assert.equal(asc.statusCode, 200);
        assert.deepEqual(idsSembrados(asc, ctx.ids), [ctx.idA, ctx.idB, ctx.idC]);

        const desc = await listar({idEmpresa: 1, campoOrdenar: 4, orden: 'DESC', pagina: 1});
        assert.deepEqual(idsSembrados(desc, ctx.ids), [ctx.idC, ctx.idB, ctx.idA]);

        //2 = TerceroTipoDoc (ZC, ZN, ZP), 3 = TerceroNumeroDoc, 1 = NumeroDocumentoSoporte
        const porTipoDoc = await listar({idEmpresa: 1, campoOrdenar: 2, orden: 'ASC', pagina: 1});
        assert.deepEqual(idsSembrados(porTipoDoc, ctx.ids), [ctx.idA, ctx.idB, ctx.idC]);

        const porNumeroDoc = await listar({idEmpresa: 1, campoOrdenar: 3, orden: 'DESC', pagina: 1});
        assert.deepEqual(idsSembrados(porNumeroDoc, ctx.ids), [ctx.idC, ctx.idB, ctx.idA]);

        //5 = FechaCreacion: las tres comparten fecha, asi que decide el desempate por Id
        const porFecha = await listar({idEmpresa: 1, campoOrdenar: 5, orden: 'DESC', pagina: 1});
        assert.deepEqual(idsSembrados(porFecha, ctx.ids), [ctx.idC, ctx.idB, ctx.idA]);
    } finally {
        for (const id of ctx.ids) await borrarCompra(id);
    }
});

test('listarTodas con un idTercero trae solo las compras de ese tercero', async () => {
    const ctx = await sembrarComprasListado();
    try {
        const deA = await listar({idEmpresa: 1, campoOrdenar: 4, orden: 'ASC', pagina: 1, idTercero: ctx.terceroA});
        assert.deepEqual(idsSembrados(deA, ctx.ids), [ctx.idA, ctx.idB]);
        assert.ok(deA.body.data.every(f => Number(f.compraTerceroId) === Number(ctx.terceroA)));
        //cantData tiene que corresponder con lo que devuelve el listado, no con el total sin filtrar
        assert.equal(Number(deA.body.cantData), deA.body.data.length);

        const deB = await listar({idEmpresa: 1, campoOrdenar: 4, orden: 'ASC', pagina: 1, idTercero: ctx.terceroB});
        assert.deepEqual(idsSembrados(deB, ctx.ids), [ctx.idC]);
    } finally {
        for (const id of ctx.ids) await borrarCompra(id);
    }
});

test('listarTodas con idTercero 0 o ausente trae las compras de todos los terceros', async () => {
    const ctx = await sembrarComprasListado();
    try {
        const conCero = await listar({idEmpresa: 1, campoOrdenar: 4, orden: 'ASC', pagina: 1, idTercero: 0});
        assert.deepEqual(idsSembrados(conCero, ctx.ids), [ctx.idA, ctx.idB, ctx.idC]);

        const sinFiltro = await listar({idEmpresa: 1, campoOrdenar: 4, orden: 'ASC', pagina: 1});
        assert.deepEqual(idsSembrados(sinFiltro, ctx.ids), [ctx.idA, ctx.idB, ctx.idC]);
        assert.equal(Number(conCero.body.cantData), Number(sinFiltro.body.cantData));
    } finally {
        for (const id of ctx.ids) await borrarCompra(id);
    }
});

test('listarTodas filtra por texto sobre la columna de orden, y cantData lo acompaña', async () => {
    const ctx = await sembrarComprasListado();
    try {
        const porNombre = await listar({idEmpresa: 1, campoOrdenar: 4, orden: 'ASC', pagina: 1, textoFiltro: 'ZZ BRA'});
        assert.deepEqual(idsSembrados(porNombre, ctx.ids), [ctx.idB]);
        assert.equal(Number(porNombre.body.cantData), porNombre.body.data.length);

        //1 = NumeroDocumentoSoporte
        const porSoporte = await listar({idEmpresa: 1, campoOrdenar: 1, orden: 'ASC', pagina: 1, textoFiltro: 'ZZFV'});
        assert.deepEqual(idsSembrados(porSoporte, ctx.ids).sort(), [ctx.idA, ctx.idC].sort());

        //el texto en blanco es "sin filtro", no una busqueda de cadena vacia
        const enBlanco = await listar({idEmpresa: 1, campoOrdenar: 4, orden: 'ASC', pagina: 1, textoFiltro: '   '});
        assert.deepEqual(idsSembrados(enBlanco, ctx.ids), [ctx.idA, ctx.idB, ctx.idC]);
    } finally {
        for (const id of ctx.ids) await borrarCompra(id);
    }
});

//misma regla que en el resto de los listados: la fecha no es texto, asi que al ordenar por ella
//el textoFiltro se ignora en vez de devolver cero filas.
test('listarTodas desactiva el textoFiltro cuando se ordena por fecha', async () => {
    const ctx = await sembrarComprasListado();
    try {
        const res = await listar({idEmpresa: 1, campoOrdenar: 5, orden: 'DESC', pagina: 1, textoFiltro: 'NO EXISTE NADA ASI'});
        assert.deepEqual(idsSembrados(res, ctx.ids), [ctx.idC, ctx.idB, ctx.idA]);
    } finally {
        for (const id of ctx.ids) await borrarCompra(id);
    }
});

test('listarTodas combina el filtro de tercero con el de texto', async () => {
    const ctx = await sembrarComprasListado();
    try {
        //ZZ CHARLIE es del tercero B: pedirla filtrando por el tercero A no devuelve nada
        const vacio = await listar({
            idEmpresa: 1, campoOrdenar: 4, orden: 'ASC', pagina: 1,
            textoFiltro: 'ZZ CHARLIE', idTercero: ctx.terceroA
        });
        assert.deepEqual(idsSembrados(vacio, ctx.ids), []);

        const conAmbos = await listar({
            idEmpresa: 1, campoOrdenar: 4, orden: 'ASC', pagina: 1,
            textoFiltro: 'ZZ ', idTercero: ctx.terceroA
        });
        assert.deepEqual(idsSembrados(conAmbos, ctx.ids), [ctx.idA, ctx.idB]);
        assert.equal(Number(conAmbos.body.cantData), conAmbos.body.data.length);
    } finally {
        for (const id of ctx.ids) await borrarCompra(id);
    }
});

test('listarTodas ajusta una pagina fuera de rango en vez de devolver vacio', async () => {
    const ctx = await sembrarComprasListado();
    try {
        const lejos = await listar({idEmpresa: 1, campoOrdenar: 4, orden: 'ASC', pagina: 9999, idTercero: ctx.terceroB});
        assert.equal(lejos.statusCode, 200);
        assert.deepEqual(idsSembrados(lejos, ctx.ids), [ctx.idC], 'la pagina se recorta a la ultima con datos');

        const cero = await listar({idEmpresa: 1, campoOrdenar: 4, orden: 'ASC', pagina: 0, idTercero: ctx.terceroB});
        assert.deepEqual(idsSembrados(cero, ctx.ids), [ctx.idC]);
    } finally {
        for (const id of ctx.ids) await borrarCompra(id);
    }
});

test('listarTodas no alcanza las compras de otra empresa', async () => {
    const ctx = await sembrarComprasListado();
    try {
        const ajena = await listar({idEmpresa: 2, campoOrdenar: 4, orden: 'ASC', pagina: 1});
        assert.equal(ajena.statusCode, 200);
        assert.deepEqual(idsSembrados(ajena, ctx.ids), []);
    } finally {
        for (const id of ctx.ids) await borrarCompra(id);
    }
});
