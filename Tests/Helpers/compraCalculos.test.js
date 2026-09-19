import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    agruparLineasCompra,
    calcularSubtotalCompra,
    calcularSaldoCompra,
    validarSaldoContadoCompra
} from '../../Helpers/compraCalculos.js';

const lineaExistente = (idArticulo, idBodega, Cantidad, CostoUnidad) => ({
    idArticulo, idBodega, ArticuloNombre: `ARTICULO ${idArticulo}`, Cantidad, CostoUnidad
});

const lineaNueva = (idBodega, Cantidad, CostoUnidad, pNombre) => ({
    idBodega, Cantidad, CostoUnidad,
    articuloNuevo: { pProductoId: 3, pNombre, pDescripcion: null, pPropiedades: [] }
});

test('agrupa dos lineas del mismo articulo y bodega sumando cantidades', () => {
    const lineas = agruparLineasCompra([
        lineaExistente(7, 1, 2, 50000),
        lineaExistente(7, 1, 3, 50000)
    ]);
    assert.equal(lineas.length, 1);
    assert.equal(lineas[0].Cantidad, 5);
});

test('rechaza el mismo articulo y bodega con costos distintos', () => {
    assert.throws(
        () => agruparLineasCompra([lineaExistente(7, 1, 2, 50000), lineaExistente(7, 1, 3, 60000)]),
        /costos distintos/
    );
});

test('agrupa el mismo articulo y bodega aunque uno de los ids llegue como string numerico', () => {
    const lineas = agruparLineasCompra([
        lineaExistente('7', 1, 2, 50000),
        lineaExistente(7, '1', 3, 50000)
    ]);
    assert.equal(lineas.length, 1);
    assert.equal(lineas[0].Cantidad, 5);
});

test('el mismo articulo en bodegas distintas queda como dos lineas', () => {
    const lineas = agruparLineasCompra([lineaExistente(7, 1, 2, 50000), lineaExistente(7, 2, 3, 50000)]);
    assert.equal(lineas.length, 2);
});

test('las lineas de articulo nuevo nunca se fusionan aunque compartan nombre', () => {
    const lineas = agruparLineasCompra([
        lineaNueva(1, 1, 180000, 'ANILLO ORO 18K'),
        lineaNueva(1, 1, 180000, 'ANILLO ORO 18K')
    ]);
    assert.equal(lineas.length, 2);
});

test('subtotal suma cantidad por costo, con cantidades decimales', () => {
    const subtotal = calcularSubtotalCompra([
        lineaExistente(7, 1, 15.5, 40000),
        lineaExistente(8, 1, 1, 180000)
    ]);
    assert.equal(subtotal, 800000);
});

test('subtotal rechaza un arreglo vacio', () => {
    assert.throws(() => calcularSubtotalCompra([]), /al menos una linea|al menos una línea/);
});

test('subtotal rechaza cantidad o costo no positivos', () => {
    assert.throws(() => calcularSubtotalCompra([lineaExistente(7, 1, 0, 40000)]), /cantidad/);
    assert.throws(() => calcularSubtotalCompra([lineaExistente(7, 1, 1, 0)]), /costo/);
});

test('cancelado es efectivo mas transaccion, y saldo descuenta el descuento', () => {
    const { cancelado, saldo } = calcularSaldoCompra({
        subtotal: 800000, descuento: 50000, efectivo: 700000, transaccion: 50000
    });
    assert.equal(cancelado, 750000);
    assert.equal(saldo, 0);
});

test('rechaza descuento negativo, descuento mayor al subtotal y pagos negativos', () => {
    assert.throws(() => calcularSaldoCompra({subtotal: 100, descuento: -1, efectivo: 100, transaccion: 0}), /negativo/);
    assert.throws(() => calcularSaldoCompra({subtotal: 100, descuento: 200, efectivo: 100, transaccion: 0}), /superar el subtotal/);
    assert.throws(() => calcularSaldoCompra({subtotal: 100, descuento: 0, efectivo: -5, transaccion: 0}), /negativos/);
});

test('contado acepta saldo cero y un centavo de descuadre, rechaza dos', () => {
    assert.doesNotThrow(() => validarSaldoContadoCompra(0));
    assert.doesNotThrow(() => validarSaldoContadoCompra(0.01));
    assert.doesNotThrow(() => validarSaldoContadoCompra(-0.01));
    assert.throws(() => validarSaldoContadoCompra(0.02), /exactamente el total/);
    assert.throws(() => validarSaldoContadoCompra(-0.02), /exactamente el total/);
});
