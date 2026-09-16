import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../Database/config.js';
import Ventas from '../../Models/ventas.js';
import VentaDetalles from '../../Models/ventaDetalles.js';
import Existencias from '../../Models/existencias.js';
import Movimientos from '../../Models/movimientos.js';
import TercerosRoles from '../../Models/tercrosRoles.js';
import { crearVentaContado, agruparLineasPorArticulo } from '../../Helpers/ventaService.js';

// crearVentaContado CONFIRMA su propia transaccion, asi que estas pruebas no pueden correr dentro
// de withRollback: siembran con conexiones propias y limpian a mano en el finally, igual que
// Tests/Helpers/produccionService.test.js.

// Articulos.CodigoSKU es VARCHAR(12) con UNIQUE (EmpresaId, CodigoSKU): 'V' + tiempo en base36 (8)
// + 2 caracteres al azar = 11 caracteres.
const generarSKUDePrueba = (prefijo = 'V') => {
    const tiempo = Date.now().toString(36);
    const azar = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
    return `${prefijo}${tiempo}${azar}`;
};

// Siembra el articulo y su bolsa DISPONIBLE escribiendo directo en las tablas, sin pasar por
// registrarMovimientoTransaccional. Dos razones (las mismas que documenta produccionService.test.js):
//  - el unico movimiento que puede existir despues es el de la venta, asi las aserciones sobre
//    Movimientos ("cero rastro") son exactas;
//  - registrarMovimientoTransaccional bloquea una bolsa todavia inexistente (SELECT ... FOR UPDATE
//    deja un gap lock en uq_existencias_bolsa) y recien despues inserta; ese patron produce
//    deadlocks intermitentes de InnoDB cuando varios archivos de prueba corren a la vez.
const sembrarArticuloConExistencia = async ({empId, usuarioId, productoId, cantidad, costo}) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [insertResult] = await conn.query(
            `INSERT INTO Articulos(EmpresaId, UsuarioIdCreador, ProductoId, CodigoSKU, Nombre, CostoUnitario)
             VALUES (?, ?, ?, ?, 'ARTICULO DE VENTA DE PRUEBA', ?);`,
            [empId, usuarioId, productoId, generarSKUDePrueba(), costo]
        );
        const articuloId = insertResult.insertId;
        await Existencias.upsertCantidad(conn, {
            pEmpId: empId, pArticuloId: articuloId, pBolsaEstado: 'DISPONIBLE',
            pPropietarioId: null, pDelta: cantidad
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

// Movimientos, Existencias, VentaDetalles y ArticuloPropiedades se borran primero: sus FK contra
// Articulos son RESTRICT y bloquearian el DELETE del articulo.
const limpiarArticulo = async (articuloId) => {
    if (!articuloId) return;
    await pool.query(`DELETE FROM Movimientos WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM Existencias WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM ArticuloPropiedades WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM Articulos WHERE Id = ?;`, [articuloId]);
};

const limpiarVenta = async (ventaId) => {
    if (!ventaId) return;
    await pool.query(`DELETE FROM VentaDetalles WHERE VentaId = ?;`, [ventaId]);
    await pool.query(`DELETE FROM Ventas WHERE Id = ?;`, [ventaId]);
};

const traerContexto = async () => {
    const [productoRows] = await pool.query(`SELECT Id FROM Productos WHERE EmpresaId = 1 LIMIT 1;`);
    const [usuarioRows] = await pool.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    const [terceroRows] = await pool.query(`SELECT Id FROM Terceros WHERE EmpresaId = 1 LIMIT 1;`);
    if (terceroRows.length === 0) throw new Error('Se requiere un Tercero en la empresa 1 para esta prueba');
    return { productoId: productoRows[0].Id, usuarioId: usuarioRows[0].Id, terceroId: terceroRows[0].Id };
};

// solo se borra el rol CLIENTE si NO existia antes de la prueba: si el tercero de la base de
// desarrollo ya era cliente, borrarlo seria destruir datos ajenos a la prueba.
const rolClienteExistia = async (terceroId) => {
    const rol = await TercerosRoles.traerPorTerceroRol({pEmpId: 1, pTerId: terceroId, pRol: 'CLIENTE'});
    return rol !== null;
};

const limpiarRolCliente = async (terceroId, existiaAntes) => {
    if (existiaAntes) return;
    await pool.query(`DELETE FROM TercerosRoles WHERE EmpresaId = 1 AND TerceroId = ? AND Rol = 'CLIENTE';`, [terceroId]);
};

test('agruparLineasPorArticulo suma cantidades del mismo articulo', () => {
    const resultado = agruparLineasPorArticulo([
        {idArticulo:1, ArticuloNombre:'A', Cantidad:2, PrecioVentaUnidad:100},
        {idArticulo:1, ArticuloNombre:'A', Cantidad:3, PrecioVentaUnidad:100}
    ]);
    assert.equal(resultado.length, 1);
    assert.equal(resultado[0].Cantidad, 5);
});

test('agruparLineasPorArticulo rechaza el mismo articulo con precios distintos', () => {
    assert.throws(() => agruparLineasPorArticulo([
        {idArticulo:1, ArticuloNombre:'A', Cantidad:2, PrecioVentaUnidad:100},
        {idArticulo:1, ArticuloNombre:'A', Cantidad:1, PrecioVentaUnidad:150}
    ]), /precios distintos/i);
});

test('agruparLineasPorArticulo conserva articulos distintos por separado', () => {
    const resultado = agruparLineasPorArticulo([
        {idArticulo:1, ArticuloNombre:'A', Cantidad:2, PrecioVentaUnidad:100},
        {idArticulo:2, ArticuloNombre:'B', Cantidad:1, PrecioVentaUnidad:50}
    ]);
    assert.equal(resultado.length, 2);
    assert.equal(resultado[0].idArticulo, 1);
    assert.equal(resultado[1].idArticulo, 2);
});

test('crearVentaContado descuenta existencia y registra la venta con sus lineas', async () => {
    const { productoId, usuarioId, terceroId } = await traerContexto();
    const teniaRolCliente = await rolClienteExistia(terceroId);

    let articuloId, ventaId;
    try {
        articuloId = await sembrarArticuloConExistencia({empId:1, usuarioId, productoId, cantidad:10, costo:100});

        ventaId = await crearVentaContado({
            pEmpId:1, pUsuId:usuarioId, pTerceroId:terceroId,
            pTerceroTipoDoc:'CC', pTerceroNumeroDoc:'999', pTerceroNombre:'CLIENTE DE PRUEBA',
            pValorDescuento:0, pValorEfectivo:6000, pValorTransaccion:0,
            articulosVendidos:[{idArticulo:articuloId, ArticuloNombre:'ARTICULO VENTA DE PRUEBA', Cantidad:2, PrecioVentaUnidad:3000}]
        });

        const bolsas = await Existencias.traerBolsasPorArticulo({pEmpId:1, pArticuloId:articuloId});
        const disponible = bolsas.find(b => b.existBolsa === 'DISPONIBLE');
        assert.equal(Number(disponible.existCantidad), 8);

        const venta = await Ventas.traerPorId({pEmpId:1, pId:ventaId});
        assert.equal(Number(venta.ventaSubtotal), 6000);
        assert.equal(Number(venta.ventaCancelado), 6000);
        assert.equal(Number(venta.ventaSaldo), 0);
        assert.equal(venta.ventaTipoVenta, 'CONTADO');

        const lineas = await VentaDetalles.traerPorVenta({pEmpId:1, pVentaId:ventaId});
        assert.equal(lineas.length, 1);
        assert.equal(Number(lineas[0].detCantidad), 2);
        assert.equal(Number(lineas[0].detPrecioVentaUnidad), 3000);

        const movimientos = await Movimientos.traerPorOrigen({pEmpId:1, pTipoOrigen:'VENTA', pOrigenId:ventaId});
        assert.equal(movimientos.length, 1);
        assert.equal(movimientos[0].movTipo, 'SALIDA');
        assert.equal(movimientos[0].movBolsa, 'DISPONIBLE');
        assert.equal(Number(movimientos[0].movCantidad), 2);

        // el rol CLIENTE se asigna solo, sin que el llamador tenga que pedirlo
        const rol = await TercerosRoles.traerPorTerceroRol({pEmpId:1, pTerId:terceroId, pRol:'CLIENTE'});
        assert.notEqual(rol, null);
    } finally {
        await limpiarVenta(ventaId);
        await limpiarArticulo(articuloId);
        await limpiarRolCliente(terceroId, teniaRolCliente);
    }
});

test('crearVentaContado agrupa dos lineas del mismo articulo en una sola fila y un solo movimiento', async () => {
    const { productoId, usuarioId, terceroId } = await traerContexto();
    const teniaRolCliente = await rolClienteExistia(terceroId);

    let articuloId, ventaId;
    try {
        articuloId = await sembrarArticuloConExistencia({empId:1, usuarioId, productoId, cantidad:10, costo:100});

        ventaId = await crearVentaContado({
            pEmpId:1, pUsuId:usuarioId, pTerceroId:terceroId,
            pTerceroTipoDoc:'CC', pTerceroNumeroDoc:'999', pTerceroNombre:'CLIENTE DE PRUEBA',
            pValorDescuento:0, pValorEfectivo:9000, pValorTransaccion:0,
            articulosVendidos:[
                {idArticulo:articuloId, ArticuloNombre:'ARTICULO VENTA DE PRUEBA', Cantidad:2, PrecioVentaUnidad:3000},
                {idArticulo:articuloId, ArticuloNombre:'ARTICULO VENTA DE PRUEBA', Cantidad:1, PrecioVentaUnidad:3000}
            ]
        });

        const lineas = await VentaDetalles.traerPorVenta({pEmpId:1, pVentaId:ventaId});
        assert.equal(lineas.length, 1);
        assert.equal(Number(lineas[0].detCantidad), 3);

        const movimientos = await Movimientos.traerPorOrigen({pEmpId:1, pTipoOrigen:'VENTA', pOrigenId:ventaId});
        assert.equal(movimientos.length, 1);
        assert.equal(Number(movimientos[0].movCantidad), 3);

        const bolsas = await Existencias.traerBolsasPorArticulo({pEmpId:1, pArticuloId:articuloId});
        assert.equal(Number(bolsas.find(b => b.existBolsa === 'DISPONIBLE').existCantidad), 7);
    } finally {
        await limpiarVenta(ventaId);
        await limpiarArticulo(articuloId);
        await limpiarRolCliente(terceroId, teniaRolCliente);
    }
});

test('crearVentaContado rechaza un saldo distinto de cero y no toca inventario', async () => {
    const { productoId, usuarioId, terceroId } = await traerContexto();
    const teniaRolCliente = await rolClienteExistia(terceroId);

    let articuloId;
    try {
        articuloId = await sembrarArticuloConExistencia({empId:1, usuarioId, productoId, cantidad:10, costo:100});

        await assert.rejects(
            () => crearVentaContado({
                pEmpId:1, pUsuId:usuarioId, pTerceroId:terceroId,
                pTerceroTipoDoc:'CC', pTerceroNumeroDoc:'999', pTerceroNombre:'CLIENTE DE PRUEBA',
                pValorDescuento:0, pValorEfectivo:100, pValorTransaccion:0,
                articulosVendidos:[{idArticulo:articuloId, ArticuloNombre:'ARTICULO VENTA DE PRUEBA', Cantidad:2, PrecioVentaUnidad:3000}]
            }),
            /cubrir/i
        );

        const bolsas = await Existencias.traerBolsasPorArticulo({pEmpId:1, pArticuloId:articuloId});
        const disponible = bolsas.find(b => b.existBolsa === 'DISPONIBLE');
        assert.equal(Number(disponible.existCantidad), 10);

        const [movimientos] = await pool.query(`SELECT Id FROM Movimientos WHERE ArticuloId = ?;`, [articuloId]);
        assert.equal(movimientos.length, 0);
    } finally {
        await limpiarArticulo(articuloId);
        await limpiarRolCliente(terceroId, teniaRolCliente);
    }
});

test('crearVentaContado rechaza una venta sin articulos antes de tocar la base de datos', async () => {
    const { usuarioId, terceroId } = await traerContexto();

    const [ventasAntes] = await pool.query(`SELECT COUNT(*) AS total FROM Ventas WHERE EmpresaId = 1;`);

    await assert.rejects(
        () => crearVentaContado({
            pEmpId:1, pUsuId:usuarioId, pTerceroId:terceroId,
            pTerceroTipoDoc:'CC', pTerceroNumeroDoc:'999', pTerceroNombre:'CLIENTE DE PRUEBA',
            pValorDescuento:0, pValorEfectivo:0, pValorTransaccion:0,
            articulosVendidos:[]
        }),
        /al menos una l/i
    );

    const [ventasDespues] = await pool.query(`SELECT COUNT(*) AS total FROM Ventas WHERE EmpresaId = 1;`);
    assert.equal(Number(ventasDespues[0].total), Number(ventasAntes[0].total));
});

// Esta es la prueba que justifica que toda la venta viva en UNA sola transaccion: la primera linea
// tiene saldo y se aplica, la segunda no. Si cada movimiento corriera en su propia transaccion, la
// primera salida quedaria confirmada (bolsa en 8) y la cabecera/lineas de la venta tambien.
test('crearVentaContado revierte la venta completa si una linea posterior no tiene existencia', async () => {
    const { productoId, usuarioId, terceroId } = await traerContexto();
    const teniaRolCliente = await rolClienteExistia(terceroId);

    let articuloConSaldoId, articuloSinSaldoId;
    try {
        articuloConSaldoId = await sembrarArticuloConExistencia({empId:1, usuarioId, productoId, cantidad:10, costo:100});
        articuloSinSaldoId = await sembrarArticuloConExistencia({empId:1, usuarioId, productoId, cantidad:1, costo:50});

        const [ventasAntes] = await pool.query(`SELECT COUNT(*) AS total FROM Ventas WHERE EmpresaId = 1;`);

        await assert.rejects(
            () => crearVentaContado({
                pEmpId:1, pUsuId:usuarioId, pTerceroId:terceroId,
                pTerceroTipoDoc:'CC', pTerceroNumeroDoc:'999', pTerceroNombre:'CLIENTE DE PRUEBA',
                pValorDescuento:0, pValorEfectivo:8000, pValorTransaccion:0,
                articulosVendidos:[
                    {idArticulo:articuloConSaldoId, ArticuloNombre:'LINEA QUE SI ALCANZA', Cantidad:2, PrecioVentaUnidad:3000},
                    {idArticulo:articuloSinSaldoId, ArticuloNombre:'LINEA SIN EXISTENCIA', Cantidad:2, PrecioVentaUnidad:1000}
                ]
            }),
            /Existencia insuficiente/
        );

        // la salida de la primera linea se revirtio: sigue en 10, no en 8
        const bolsas = await Existencias.traerBolsasPorArticulo({pEmpId:1, pArticuloId:articuloConSaldoId});
        assert.equal(Number(bolsas.find(b => b.existBolsa === 'DISPONIBLE').existCantidad), 10);
        const bolsasSinSaldo = await Existencias.traerBolsasPorArticulo({pEmpId:1, pArticuloId:articuloSinSaldoId});
        assert.equal(Number(bolsasSinSaldo.find(b => b.existBolsa === 'DISPONIBLE').existCantidad), 1);

        // ningun movimiento quedo en el kardex
        const [movimientos] = await pool.query(
            `SELECT Id FROM Movimientos WHERE ArticuloId IN (?, ?);`,
            [articuloConSaldoId, articuloSinSaldoId]
        );
        assert.equal(movimientos.length, 0);

        // ni la cabecera de la venta ni sus lineas quedaron
        const [ventasDespues] = await pool.query(`SELECT COUNT(*) AS total FROM Ventas WHERE EmpresaId = 1;`);
        assert.equal(Number(ventasDespues[0].total), Number(ventasAntes[0].total));
        const [detalles] = await pool.query(
            `SELECT Id FROM VentaDetalles WHERE ArticuloId IN (?, ?);`,
            [articuloConSaldoId, articuloSinSaldoId]
        );
        assert.equal(detalles.length, 0);
    } finally {
        await limpiarArticulo(articuloConSaldoId);
        await limpiarArticulo(articuloSinSaldoId);
        await limpiarRolCliente(terceroId, teniaRolCliente);
    }
});
