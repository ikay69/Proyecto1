import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback } from '../dbTestUtils.js';
import Ventas from '../../Models/ventas.js';
import VentaDetalles from '../../Models/ventaDetalles.js';

const crearArticuloYTerceroDePrueba = async (connection, empId = 1) => {
    const [productoRows] = await connection.query(`SELECT Id FROM Productos WHERE EmpresaId = ? LIMIT 1;`, [empId]);
    const [usuarioRows] = await connection.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    const [terceroRows] = await connection.query(`SELECT Id FROM Terceros WHERE EmpresaId = ? LIMIT 1;`, [empId]);
    if (terceroRows.length === 0) {
        throw new Error('Se requiere al menos un Tercero en la empresa 1 para esta prueba');
    }

    const [insertArt] = await connection.query(
        `INSERT INTO Articulos(EmpresaId, UsuarioIdCreador, ProductoId, CodigoSKU, Nombre)
         VALUES (?, ?, ?, ?, 'ARTICULO DE PRUEBA VENTA');`,
        [empId, usuarioRows[0].Id, productoRows[0].Id, `TV${Date.now().toString(36)}`]
    );
    return { articuloId: insertArt.insertId, usuarioId: usuarioRows[0].Id, terceroId: terceroRows[0].Id };
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

// Vendedores.Nombre tiene UNIQUE (EmpresaId, Nombre): cada vendedor de prueba usa un nombre unico.
const crearVendedorDePrueba = async (connection, usuarioId, empId = 1) => {
    const nombre = `VENDEDOR PRUEBA ${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const [insertResult] = await connection.query(
        `INSERT INTO Vendedores(EmpresaId, UsuarioIdCreador, Nombre) VALUES (?, ?, ?);`,
        [empId, usuarioId, nombre]
    );
    return { vendedorId: insertResult.insertId, nombre };
};

const cabeceraDePrueba = (usuarioId, terceroId, extra = {}) => ({
    pEmpId:1, pUsuId:usuarioId, pTerceroId:terceroId,
    pTerceroTipoDoc:'CC', pTerceroNumeroDoc:'123', pTerceroNombre:'CLIENTE DE PRUEBA',
    pTipoVenta:'CONTADO', pValorSubtotal:1000, pValorDescuento:0,
    pValorCancelado:1000, pValorSaldo:0, pValorEfectivo:1000, pValorTransaccion:0,
    ...extra
});

test('Ventas.crear inserta la cabecera y traerPorId la devuelve', async () => {
    await withRollback(async (connection) => {
        const { usuarioId, terceroId } = await crearArticuloYTerceroDePrueba(connection);

        const ventaId = await Ventas.crear(connection, {
            pEmpId:1, pUsuId:usuarioId, pTerceroId:terceroId,
            pTerceroTipoDoc:'CC', pTerceroNumeroDoc:'123', pTerceroNombre:'CLIENTE DE PRUEBA',
            pTipoVenta:'CONTADO', pValorSubtotal:1000, pValorDescuento:0,
            pValorCancelado:1000, pValorSaldo:0, pValorEfectivo:1000, pValorTransaccion:0
        });

        assert.ok(ventaId > 0);

        const venta = await Ventas.traerPorId({pEmpId:1, pId:ventaId}, connection);
        assert.equal(Number(venta.ventaSubtotal), 1000);
        assert.equal(venta.ventaTipoVenta, 'CONTADO');
        assert.equal(venta.ventaTercero, 'CLIENTE DE PRUEBA');
        assert.equal(venta.ventaTerceroTipoDoc, 'CC');
        assert.equal(venta.ventaTerceroNumeroDoc, '123');
        assert.equal(Number(venta.ventaTerceroId), Number(terceroId));
        assert.equal(Number(venta.ventaDescuento), 0);
        assert.equal(Number(venta.ventaCancelado), 1000);
        assert.equal(Number(venta.ventaSaldo), 0);
        assert.equal(Number(venta.ventaEfectivo), 1000);
        assert.equal(Number(venta.ventaTransaccion), 0);
    });
});

test('VentaDetalles.crearVarias inserta una fila por linea y traerPorVenta las devuelve', async () => {
    await withRollback(async (connection) => {
        const { articuloId, usuarioId, terceroId } = await crearArticuloYTerceroDePrueba(connection);
        const bodegaId = await crearBodegaDePrueba(connection, usuarioId);

        const ventaId = await Ventas.crear(connection, {
            pEmpId:1, pUsuId:usuarioId, pTerceroId:terceroId,
            pTerceroTipoDoc:'CC', pTerceroNumeroDoc:'123', pTerceroNombre:'CLIENTE DE PRUEBA',
            pTipoVenta:'CONTADO', pValorSubtotal:2000, pValorDescuento:0,
            pValorCancelado:2000, pValorSaldo:0, pValorEfectivo:2000, pValorTransaccion:0
        });

        await VentaDetalles.crearVarias(connection, {
            pEmpId:1, pVentaId:ventaId,
            lineas:[{ArticuloId:articuloId, BodegaId:bodegaId, ArticuloNombre:'ARTICULO DE PRUEBA VENTA', Cantidad:2, PrecioVentaUnidad:1000}]
        });

        const lineas = await VentaDetalles.traerPorVenta({pEmpId:1, pVentaId:ventaId}, connection);

        assert.equal(lineas.length, 1);
        assert.equal(Number(lineas[0].detCantidad), 2);
        assert.equal(Number(lineas[0].detPrecioVentaUnidad), 1000);
        assert.equal(Number(lineas[0].detArticuloId), Number(articuloId));
        assert.equal(lineas[0].detArticuloNombre, 'ARTICULO DE PRUEBA VENTA');
        assert.equal(lineas[0].detBodegaId, bodegaId);
    });
});

test('Ventas.crear sin vendedor deja VendedorId en NULL', async () => {
    await withRollback(async (connection) => {
        const { usuarioId, terceroId } = await crearArticuloYTerceroDePrueba(connection);

        const ventaId = await Ventas.crear(connection, cabeceraDePrueba(usuarioId, terceroId));

        const venta = await Ventas.traerPorId({pEmpId:1, pId:ventaId}, connection);
        assert.equal(venta.ventaVendedorId, null);
        assert.equal(venta.ventaVendedor, null);
    });
});

test('Ventas.crear guarda el VendedorId y traerPorId devuelve su nombre', async () => {
    await withRollback(async (connection) => {
        const { usuarioId, terceroId } = await crearArticuloYTerceroDePrueba(connection);
        const { vendedorId, nombre } = await crearVendedorDePrueba(connection, usuarioId);

        const ventaId = await Ventas.crear(connection, cabeceraDePrueba(usuarioId, terceroId, {pVendedorId: vendedorId}));

        const venta = await Ventas.traerPorId({pEmpId:1, pId:ventaId}, connection);
        assert.equal(Number(venta.ventaVendedorId), Number(vendedorId));
        assert.equal(venta.ventaVendedor, nombre);
    });
});

test('Ventas.traerTodo con pVendedorId 0 trae las ventas con y sin vendedor', async () => {
    await withRollback(async (connection) => {
        const { usuarioId, terceroId } = await crearArticuloYTerceroDePrueba(connection);
        const { vendedorId } = await crearVendedorDePrueba(connection, usuarioId);

        const sinVendedor = await Ventas.crear(connection, cabeceraDePrueba(usuarioId, terceroId));
        const conVendedor = await Ventas.crear(connection, cabeceraDePrueba(usuarioId, terceroId, {pVendedorId: vendedorId}));

        // las dos ventas acaban de crearse: con ORDER BY FechaCreacion DESC, Id DESC encabezan la pagina 1
        const ids = (await Ventas.traerTodo({pEmpId:1, pOffset:0, pVendedorId:0}, connection)).map(v => Number(v.ventaId));
        assert.ok(ids.includes(Number(sinVendedor)), 'deberia traer la venta sin vendedor');
        assert.ok(ids.includes(Number(conVendedor)), 'deberia traer la venta con vendedor');
    });
});

test('Ventas.traerTodo con un pVendedorId trae solo las ventas de ese vendedor', async () => {
    await withRollback(async (connection) => {
        const { usuarioId, terceroId } = await crearArticuloYTerceroDePrueba(connection);
        const primero = await crearVendedorDePrueba(connection, usuarioId);
        const segundo = await crearVendedorDePrueba(connection, usuarioId);

        const sinVendedor = await Ventas.crear(connection, cabeceraDePrueba(usuarioId, terceroId));
        const delPrimero = await Ventas.crear(connection, cabeceraDePrueba(usuarioId, terceroId, {pVendedorId: primero.vendedorId}));
        const delSegundo = await Ventas.crear(connection, cabeceraDePrueba(usuarioId, terceroId, {pVendedorId: segundo.vendedorId}));

        const ids = (await Ventas.traerTodo({pEmpId:1, pOffset:0, pVendedorId:primero.vendedorId}, connection)).map(v => Number(v.ventaId));

        assert.deepEqual(ids, [Number(delPrimero)]);
        assert.ok(!ids.includes(Number(delSegundo)));
        assert.ok(!ids.includes(Number(sinVendedor)));
    });
});

test('Ventas.traerTodo con pVendedorId -1 trae solo las ventas sin vendedor', async () => {
    await withRollback(async (connection) => {
        const { usuarioId, terceroId } = await crearArticuloYTerceroDePrueba(connection);
        const { vendedorId } = await crearVendedorDePrueba(connection, usuarioId);

        const sinVendedor = await Ventas.crear(connection, cabeceraDePrueba(usuarioId, terceroId));
        const conVendedor = await Ventas.crear(connection, cabeceraDePrueba(usuarioId, terceroId, {pVendedorId: vendedorId}));

        const filas = await Ventas.traerTodo({pEmpId:1, pOffset:0, pVendedorId:-1}, connection);
        const ids = filas.map(v => Number(v.ventaId));

        assert.ok(ids.includes(Number(sinVendedor)));
        assert.ok(!ids.includes(Number(conVendedor)));
        // ninguna fila del resultado puede traer vendedor
        assert.deepEqual(filas.filter(v => v.ventaVendedorId !== null), []);
    });
});

test('Ventas.contarTodo aplica el mismo filtro de vendedor que traerTodo', async () => {
    await withRollback(async (connection) => {
        const { usuarioId, terceroId } = await crearArticuloYTerceroDePrueba(connection);
        const { vendedorId } = await crearVendedorDePrueba(connection, usuarioId);

        const antesTodas = await Ventas.contarTodo({pEmpId:1, pVendedorId:0}, connection);
        const antesSin = await Ventas.contarTodo({pEmpId:1, pVendedorId:-1}, connection);
        assert.equal(await Ventas.contarTodo({pEmpId:1, pVendedorId:vendedorId}, connection), 0);

        await Ventas.crear(connection, cabeceraDePrueba(usuarioId, terceroId));
        await Ventas.crear(connection, cabeceraDePrueba(usuarioId, terceroId, {pVendedorId: vendedorId}));

        assert.equal(await Ventas.contarTodo({pEmpId:1, pVendedorId:0}, connection), antesTodas + 2);
        assert.equal(await Ventas.contarTodo({pEmpId:1, pVendedorId:-1}, connection), antesSin + 1);
        assert.equal(await Ventas.contarTodo({pEmpId:1, pVendedorId:vendedorId}, connection), 1);
    });
});
