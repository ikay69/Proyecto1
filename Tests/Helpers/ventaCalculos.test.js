import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    calcularSubtotalLineas,
    calcularSaldoVenta,
    validarSaldoContado
} from '../../Helpers/ventaCalculos.js';

test('calcularSubtotalLineas suma cantidad por precio de cada linea', () => {
    const subtotal = calcularSubtotalLineas([
        { Cantidad: 2, PrecioVentaUnidad: 1000 },
        { Cantidad: 1, PrecioVentaUnidad: 500 }
    ]);
    assert.equal(subtotal, 2500);
});

test('calcularSubtotalLineas rechaza una lista vacia', () => {
    assert.throws(() => calcularSubtotalLineas([]));
});

test('calcularSubtotalLineas rechaza cantidad menor o igual a cero', () => {
    assert.throws(() => calcularSubtotalLineas([{ Cantidad: 0, PrecioVentaUnidad: 100 }]));
});

test('calcularSubtotalLineas rechaza precio menor o igual a cero', () => {
    assert.throws(() => calcularSubtotalLineas([{ Cantidad: 1, PrecioVentaUnidad: 0 }]));
});

test('calcularSaldoVenta calcula cancelado y saldo correctamente', () => {
    const { cancelado, saldo } = calcularSaldoVenta({ subtotal: 1000, descuento: 100, efectivo: 900, transaccion: 0 });
    assert.equal(cancelado, 900);
    assert.equal(saldo, 0);
});

test('calcularSaldoVenta combina efectivo y transaccion', () => {
    const { cancelado, saldo } = calcularSaldoVenta({ subtotal: 1000, descuento: 0, efectivo: 600, transaccion: 400 });
    assert.equal(cancelado, 1000);
    assert.equal(saldo, 0);
});

test('calcularSaldoVenta rechaza descuento mayor al subtotal', () => {
    assert.throws(() => calcularSaldoVenta({ subtotal: 100, descuento: 200, efectivo: 0, transaccion: 0 }));
});

test('calcularSaldoVenta rechaza valores de pago negativos', () => {
    assert.throws(() => calcularSaldoVenta({ subtotal: 100, descuento: 0, efectivo: -10, transaccion: 0 }));
});

test('validarSaldoContado acepta saldo exactamente cero', () => {
    assert.doesNotThrow(() => validarSaldoContado(0));
});

test('validarSaldoContado acepta un residuo de redondeo de un centavo', () => {
    assert.doesNotThrow(() => validarSaldoContado(0.009));
});

test('validarSaldoContado rechaza un saldo distinto de cero', () => {
    assert.throws(() => validarSaldoContado(50));
});
