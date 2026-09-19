import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../Database/config.js';
import Compras from '../../Models/compras.js';
import CompraDetalles from '../../Models/compraDetalles.js';
import Existencias from '../../Models/existencias.js';
import ArticuloPropiedades from '../../Models/articuloPropiedades.js';
import { crearCompraContado } from '../../Helpers/compraService.js';

// crearCompraContado CONFIRMA su propia transaccion, asi que estas pruebas no pueden correr
// dentro de withRollback: siembran con conexiones propias y limpian a mano en el finally,
// igual que Tests/Helpers/ventaService.test.js.

// Articulos.CodigoSKU es VARCHAR(12) con UNIQUE (EmpresaId, CodigoSKU): 'C' + tiempo en base36
// (8) + 2 caracteres al azar = 11 caracteres.
const generarSKUDePrueba = () => {
    const tiempo = Date.now().toString(36);
    const azar = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
    return `C${tiempo}${azar}`;
};

const crearBodegaDePrueba = async (usuarioId) => {
    const nombre = `BODEGA COMPRA ${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const [insertResult] = await pool.query(
        `INSERT INTO Bodegas(EmpresaId, UsuarioIdCreador, Nombre) VALUES (1, ?, ?);`,
        [usuarioId, nombre]
    );
    return insertResult.insertId;
};

// siembra el articulo y su bolsa DISPONIBLE escribiendo directo en las tablas, sin pasar por
// registrarMovimientoTransaccional: asi el unico movimiento que puede existir despues es el de
// la compra, y las aserciones sobre Movimientos son exactas. Mismo razonamiento que
// ventaService.test.js.
const sembrarArticuloConExistencia = async ({usuarioId, productoId, bodegaId, cantidad, costo}) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [insertResult] = await conn.query(
            `INSERT INTO Articulos(EmpresaId, UsuarioIdCreador, ProductoId, CodigoSKU, Nombre)
             VALUES (1, ?, ?, ?, 'ARTICULO DE COMPRA DE PRUEBA');`,
            [usuarioId, productoId, generarSKUDePrueba()]
        );
        const articuloId = insertResult.insertId;
        await Existencias.upsertCantidadYCosto(conn, {
            pEmpId: 1, pBodegaId: bodegaId, pArticuloId: articuloId, pBolsaEstado: 'DISPONIBLE',
            pPropietarioId: null, pDelta: cantidad, pCosto: costo
        });
        await conn.commit();
        return articuloId;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const limpiarArticulo = async (articuloId) => {
    if (!articuloId) return;
    await pool.query(`DELETE FROM Movimientos WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM Existencias WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM ArticuloPropiedades WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM Articulos WHERE Id = ?;`, [articuloId]);
};

const limpiarCompra = async (compraId) => {
    if (!compraId) return;
    await pool.query(`DELETE FROM CompraDetalles WHERE CompraId = ?;`, [compraId]);
    await pool.query(`DELETE FROM Compras WHERE Id = ?;`, [compraId]);
};

const limpiarBodega = async (bodegaId) => {
    if (!bodegaId) return;
    await pool.query(`DELETE FROM Bodegas WHERE Id = ?;`, [bodegaId]);
};

const traerContexto = async () => {
    const [productoRows] = await pool.query(`SELECT Id FROM Productos WHERE EmpresaId = 1 LIMIT 1;`);
    const [usuarioRows] = await pool.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    const [terceroRows] = await pool.query(`SELECT Id FROM Terceros WHERE EmpresaId = 1 LIMIT 1;`);
    if (productoRows.length === 0 || terceroRows.length === 0) {
        throw new Error('Se requiere un Producto y un Tercero en la empresa 1 para estas pruebas');
    }
    return {productoId: productoRows[0].Id, usuarioId: usuarioRows[0].Id, terceroId: terceroRows[0].Id};
};

const datosCabecera = (ctx, total) => ({
    pEmpId: 1, pUsuId: ctx.usuarioId, pTerceroId: ctx.terceroId,
    pTerceroTipoDoc: null, pTerceroNumeroDoc: null, pTerceroNombre: 'VENDEDOR DE PRUEBA',
    pNumeroDocumentoSoporte: null,
    pValorDescuento: 0, pValorEfectivo: total, pValorTransaccion: 0
});

test('compra de articulo existente sube la existencia y deja el movimiento de ENTRADA', async () => {
    const ctx = await traerContexto();
    let bodegaId = null, articuloId = null, compraId = null;
    try {
        bodegaId = await crearBodegaDePrueba(ctx.usuarioId);
        articuloId = await sembrarArticuloConExistencia({
            usuarioId: ctx.usuarioId, productoId: ctx.productoId, bodegaId, cantidad: 10, costo: 100
        });

        compraId = await crearCompraContado({
            ...datosCabecera(ctx, 1000),
            articulosComprados: [{
                idArticulo: articuloId, idBodega: bodegaId,
                ArticuloNombre: 'ARTICULO DE COMPRA DE PRUEBA', Cantidad: 10, CostoUnidad: 100
            }]
        });

        assert.ok(compraId > 0);

        const bolsa = await Existencias.traerBolsa({
            pEmpId: 1, pBodegaId: bodegaId, pArticuloId: articuloId,
            pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
        });
        assert.equal(Number(bolsa.Cantidad), 20);

        const [movs] = await pool.query(
            `SELECT TipoMovimiento, Motivo, TipoOrigen, OrigenId FROM Movimientos WHERE ArticuloId = ?;`,
            [articuloId]
        );
        assert.equal(movs.length, 1);
        assert.equal(movs[0].TipoMovimiento, 'ENTRADA');
        assert.equal(movs[0].Motivo, 'COMPRA');
        assert.equal(movs[0].TipoOrigen, 'COMPRA');
        assert.equal(Number(movs[0].OrigenId), compraId);

        const cabecera = await Compras.traerPorId({pEmpId: 1, pId: compraId});
        assert.equal(cabecera.compraTipoCompra, 'CONTADO');
        assert.equal(Number(cabecera.compraSubtotal), 1000);
        assert.equal(Number(cabecera.compraDescuento), 0);
        assert.equal(Number(cabecera.compraCancelado), 1000);
        assert.equal(Number(cabecera.compraSaldo), 0);
        assert.equal(Number(cabecera.compraEfectivo), 1000);
        assert.equal(Number(cabecera.compraTransaccion), 0);
    } finally {
        await limpiarCompra(compraId);
        await limpiarArticulo(articuloId);
        await limpiarBodega(bodegaId);
    }
});

test('la compra recalcula el costo promedio ponderado: 10 a 100 mas 10 a 200 da 150', async () => {
    const ctx = await traerContexto();
    let bodegaId = null, articuloId = null, compraId = null;
    try {
        bodegaId = await crearBodegaDePrueba(ctx.usuarioId);
        articuloId = await sembrarArticuloConExistencia({
            usuarioId: ctx.usuarioId, productoId: ctx.productoId, bodegaId, cantidad: 10, costo: 100
        });

        compraId = await crearCompraContado({
            ...datosCabecera(ctx, 2000),
            articulosComprados: [{
                idArticulo: articuloId, idBodega: bodegaId,
                ArticuloNombre: 'ARTICULO DE COMPRA DE PRUEBA', Cantidad: 10, CostoUnidad: 200
            }]
        });

        const bolsa = await Existencias.traerBolsa({
            pEmpId: 1, pBodegaId: bodegaId, pArticuloId: articuloId,
            pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
        });
        assert.equal(Number(bolsa.Cantidad), 20);
        assert.equal(Number(bolsa.CostoUnitario), 150);
    } finally {
        await limpiarCompra(compraId);
        await limpiarArticulo(articuloId);
        await limpiarBodega(bodegaId);
    }
});

test('una compra puede dar de alta un articulo nuevo sin precio de venta y no vendible, con sus propiedades', async () => {
    const ctx = await traerContexto();
    //se busca una Propiedad real de la empresa 1 en vez de fijar un id: el spec (S9) pide que
    //este camino cubra tambien las propiedades del articulo nuevo, que es justo donde vivia el
    //Finding 1 (un idPropiedad de otra empresa se aceptaba sin comprobar el limite de empresa).
    const [propiedadRows] = await pool.query(
        `SELECT Id, TipoDato FROM Propiedades WHERE EmpresaId = 1 AND Estado = 1 LIMIT 1;`
    );
    if (propiedadRows.length === 0) throw new Error('Se requiere al menos una Propiedad activa en la empresa 1 para esta prueba');
    const propiedad = propiedadRows[0];
    const valorPropiedad = propiedad.TipoDato === 'NUMERO' ? '12.5' : 'VALOR DE PRUEBA';

    let bodegaId = null, compraId = null, articuloNuevoId = null;
    try {
        bodegaId = await crearBodegaDePrueba(ctx.usuarioId);

        compraId = await crearCompraContado({
            ...datosCabecera(ctx, 180000),
            articulosComprados: [{
                idBodega: bodegaId, Cantidad: 1, CostoUnidad: 180000,
                articuloNuevo: {
                    pProductoId: ctx.productoId,
                    pNombre: 'ANILLO ORO 18K USADO',
                    pDescripcion: 'con rayones',
                    pPropiedades: [{idPropiedad: propiedad.Id, Valor: valorPropiedad}]
                }
            }]
        });

        const lineas = await CompraDetalles.traerPorCompra({pEmpId: 1, pCompraId: compraId});
        articuloNuevoId = lineas.length > 0 ? lineas[0].detArticuloId : null;
        assert.equal(lineas.length, 1);
        assert.equal(lineas[0].detArticuloNombre, 'ANILLO ORO 18K USADO');

        const [artRows] = await pool.query(
            `SELECT CodigoSKU, PrecioVentaUnitario, Vender FROM Articulos WHERE Id = ?;`, [articuloNuevoId]
        );
        assert.equal(artRows[0].PrecioVentaUnitario, null);
        assert.equal(Number(artRows[0].Vender), 0);
        assert.equal(artRows[0].CodigoSKU, `ART${String(articuloNuevoId).padStart(8, '0')}`);

        //las propiedades del articulo nuevo deben haber llegado a ArticuloPropiedades
        const propiedadesGuardadas = await ArticuloPropiedades.traerPorArticulo({pEmpId: 1, pArticuloId: articuloNuevoId});
        assert.equal(propiedadesGuardadas.length, 1);
        assert.equal(propiedadesGuardadas[0].propId, propiedad.Id);
        assert.equal(propiedadesGuardadas[0].propValor, valorPropiedad);

        const bolsa = await Existencias.traerBolsa({
            pEmpId: 1, pBodegaId: bodegaId, pArticuloId: articuloNuevoId,
            pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
        });
        assert.equal(Number(bolsa.Cantidad), 1);
        assert.equal(Number(bolsa.CostoUnitario), 180000);
    } finally {
        //limpiarArticulo ya borra ArticuloPropiedades antes de borrar el Articulo (ver arriba),
        //asi que no hace falta una limpieza adicional para las propiedades de esta prueba.
        await limpiarCompra(compraId);
        await limpiarArticulo(articuloNuevoId);
        await limpiarBodega(bodegaId);
    }
});

test('una compra que falla a mitad no deja cabecera, lineas, movimientos ni articulos huerfanos', async () => {
    const ctx = await traerContexto();
    let bodegaId = null;
    try {
        bodegaId = await crearBodegaDePrueba(ctx.usuarioId);

        const comprasAntes = await Compras.contarTodo({pEmpId: 1});
        const [articulosAntes] = await pool.query(`SELECT COUNT(*) AS total FROM Articulos WHERE EmpresaId = 1;`);

        //la segunda linea apunta a una bodega inexistente: el INSERT de CompraDetalles viola el
        //FK contra Bodegas y toda la transaccion se revierte, incluido el articulo de la primera.
        await assert.rejects(crearCompraContado({
            ...datosCabecera(ctx, 200000),
            articulosComprados: [
                {
                    idBodega: bodegaId, Cantidad: 1, CostoUnidad: 100000,
                    articuloNuevo: {pProductoId: ctx.productoId, pNombre: 'PIEZA QUE NO DEBE QUEDAR', pDescripcion: null, pPropiedades: []}
                },
                {
                    idBodega: 999999999, Cantidad: 1, CostoUnidad: 100000,
                    articuloNuevo: {pProductoId: ctx.productoId, pNombre: 'PIEZA QUE TAMPOCO', pDescripcion: null, pPropiedades: []}
                }
            ]
        }));

        const comprasDespues = await Compras.contarTodo({pEmpId: 1});
        const [articulosDespues] = await pool.query(`SELECT COUNT(*) AS total FROM Articulos WHERE EmpresaId = 1;`);

        assert.equal(Number(comprasDespues), Number(comprasAntes));
        assert.equal(Number(articulosDespues[0].total), Number(articulosAntes[0].total));

        const [huerfanos] = await pool.query(
            `SELECT Id FROM Articulos WHERE Nombre IN ('PIEZA QUE NO DEBE QUEDAR','PIEZA QUE TAMPOCO');`
        );
        assert.equal(huerfanos.length, 0);
    } finally {
        const [restos] = await pool.query(
            `SELECT Id FROM Articulos WHERE EmpresaId = 1 AND Nombre IN ('PIEZA QUE NO DEBE QUEDAR','PIEZA QUE TAMPOCO');`
        );
        for (const resto of restos) await limpiarArticulo(resto.Id);
        await limpiarBodega(bodegaId);
    }
});

test('rechaza una compra de contado cuyo pago no cubre el total', async () => {
    const ctx = await traerContexto();
    let bodegaId = null, articuloId = null;
    try {
        bodegaId = await crearBodegaDePrueba(ctx.usuarioId);
        articuloId = await sembrarArticuloConExistencia({
            usuarioId: ctx.usuarioId, productoId: ctx.productoId, bodegaId, cantidad: 5, costo: 100
        });

        await assert.rejects(crearCompraContado({
            ...datosCabecera(ctx, 500),
            articulosComprados: [{
                idArticulo: articuloId, idBodega: bodegaId,
                ArticuloNombre: 'ARTICULO DE COMPRA DE PRUEBA', Cantidad: 10, CostoUnidad: 100
            }]
        }), /exactamente el total/);

        //no debe haber tocado la existencia sembrada
        const bolsa = await Existencias.traerBolsa({
            pEmpId: 1, pBodegaId: bodegaId, pArticuloId: articuloId,
            pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
        });
        assert.equal(Number(bolsa.Cantidad), 5);
    } finally {
        await limpiarArticulo(articuloId);
        await limpiarBodega(bodegaId);
    }
});

test('el mismo articulo en dos bodegas distintas queda como dos lineas', async () => {
    const ctx = await traerContexto();
    let bodegaA = null, bodegaB = null, articuloId = null, compraId = null;
    try {
        bodegaA = await crearBodegaDePrueba(ctx.usuarioId);
        bodegaB = await crearBodegaDePrueba(ctx.usuarioId);
        articuloId = await sembrarArticuloConExistencia({
            usuarioId: ctx.usuarioId, productoId: ctx.productoId, bodegaId: bodegaA, cantidad: 1, costo: 100
        });

        compraId = await crearCompraContado({
            ...datosCabecera(ctx, 300),
            articulosComprados: [
                {idArticulo: articuloId, idBodega: bodegaA, ArticuloNombre: 'ARTICULO DE COMPRA DE PRUEBA', Cantidad: 1, CostoUnidad: 100},
                {idArticulo: articuloId, idBodega: bodegaB, ArticuloNombre: 'ARTICULO DE COMPRA DE PRUEBA', Cantidad: 2, CostoUnidad: 100}
            ]
        });

        const lineas = await CompraDetalles.traerPorCompra({pEmpId: 1, pCompraId: compraId});
        assert.equal(lineas.length, 2);
        for (const linea of lineas) {
            assert.equal(Number(linea.detCostoUnidad), 100);
        }
    } finally {
        await limpiarCompra(compraId);
        await limpiarArticulo(articuloId);
        await limpiarBodega(bodegaA);
        await limpiarBodega(bodegaB);
    }
});

test('asigna el rol PROVEEDOR al tercero que no lo tenia, y no lo duplica al repetir', async () => {
    const ctx = await traerContexto();
    let bodegaId = null, articuloId = null, compraA = null, compraB = null;

    //NO se usa ctx.terceroId: `traerContexto` toma el primer Tercero de la empresa 1, que en la
    //base de desarrollo ya tiene el rol PROVEEDOR sembrado. Con ese tercero la prueba solo
    //ejercitaria el camino "ya lo tenia" y jamas verificaria la asignacion, que es justo lo que
    //debe probar. Se busca explicitamente uno que NO lo tenga.
    const [sinRol] = await pool.query(
        `SELECT t.Id FROM Terceros t
         WHERE t.EmpresaId = 1 AND t.Estado = 1
           AND NOT EXISTS (SELECT 1 FROM TercerosRoles r
                           WHERE r.EmpresaId = 1 AND r.TerceroId = t.Id AND r.Rol = 'PROVEEDOR')
         LIMIT 1;`
    );
    if (sinRol.length === 0) {
        throw new Error('Se requiere un Tercero activo de la empresa 1 sin rol PROVEEDOR para esta prueba');
    }
    const terceroId = sinRol[0].Id;

    const contarRol = async () => {
        const [rows] = await pool.query(
            `SELECT Id FROM TercerosRoles WHERE EmpresaId = 1 AND TerceroId = ? AND Rol = 'PROVEEDOR';`,
            [terceroId]
        );
        return rows.length;
    };

    const lineaDePrueba = () => ([{
        idArticulo: articuloId, idBodega: bodegaId,
        ArticuloNombre: 'ARTICULO DE COMPRA DE PRUEBA', Cantidad: 1, CostoUnidad: 100
    }]);

    try {
        bodegaId = await crearBodegaDePrueba(ctx.usuarioId);
        articuloId = await sembrarArticuloConExistencia({
            usuarioId: ctx.usuarioId, productoId: ctx.productoId, bodegaId, cantidad: 1, costo: 100
        });

        assert.equal(await contarRol(), 0);

        compraA = await crearCompraContado({
            ...datosCabecera(ctx, 100), pTerceroId: terceroId, articulosComprados: lineaDePrueba()
        });
        assert.equal(await contarRol(), 1); //se asigno

        compraB = await crearCompraContado({
            ...datosCabecera(ctx, 100), pTerceroId: terceroId, articulosComprados: lineaDePrueba()
        });
        assert.equal(await contarRol(), 1); //no se duplico
    } finally {
        await limpiarCompra(compraA);
        await limpiarCompra(compraB);
        await limpiarArticulo(articuloId);
        await limpiarBodega(bodegaId);
        //el rol no existia antes de la prueba (lo acabamos de comprobar), asi que borrarlo
        //siempre es correcto: no destruye datos ajenos.
        await pool.query(
            `DELETE FROM TercerosRoles WHERE EmpresaId = 1 AND TerceroId = ? AND Rol = 'PROVEEDOR';`,
            [terceroId]
        );
    }
});
