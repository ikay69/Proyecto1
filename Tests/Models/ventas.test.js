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

        const ventaId = await Ventas.crear(connection, {
            pEmpId:1, pUsuId:usuarioId, pTerceroId:terceroId,
            pTerceroTipoDoc:'CC', pTerceroNumeroDoc:'123', pTerceroNombre:'CLIENTE DE PRUEBA',
            pTipoVenta:'CONTADO', pValorSubtotal:2000, pValorDescuento:0,
            pValorCancelado:2000, pValorSaldo:0, pValorEfectivo:2000, pValorTransaccion:0
        });

        await VentaDetalles.crearVarias(connection, {
            pEmpId:1, pVentaId:ventaId,
            lineas:[{ArticuloId:articuloId, ArticuloNombre:'ARTICULO DE PRUEBA VENTA', Cantidad:2, PrecioVentaUnidad:1000}]
        });

        const lineas = await VentaDetalles.traerPorVenta({pEmpId:1, pVentaId:ventaId}, connection);

        assert.equal(lineas.length, 1);
        assert.equal(Number(lineas[0].detCantidad), 2);
        assert.equal(Number(lineas[0].detPrecioVentaUnidad), 1000);
        assert.equal(Number(lineas[0].detArticuloId), Number(articuloId));
        assert.equal(lineas[0].detArticuloNombre, 'ARTICULO DE PRUEBA VENTA');
    });
});
