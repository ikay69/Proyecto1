import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    calcularCostoPromedioPonderado,
    calcularCostoProduccion,
    calcularCostoUnitarioProducido
} from '../../Helpers/costeoInventario.js';

test('calcularCostoPromedioPonderado: primera entrada sin costo previo', () => {
    const resultado = calcularCostoPromedioPonderado({
        cantidadActual: 0, costoActual: null, cantidadEntrante: 10, costoEntrante: 50
    });
    assert.equal(resultado, 50);
});

test('calcularCostoPromedioPonderado: promedia con existencia previa', () => {
    const resultado = calcularCostoPromedioPonderado({
        cantidadActual: 10, costoActual: 50, cantidadEntrante: 10, costoEntrante: 70
    });
    assert.equal(resultado, 60);
});

test('calcularCostoPromedioPonderado: redondea a 2 decimales', () => {
    const resultado = calcularCostoPromedioPonderado({
        cantidadActual: 3, costoActual: 10, cantidadEntrante: 1, costoEntrante: 10.005
    });
    assert.equal(resultado, 10);
});

test('calcularCostoPromedioPonderado: rechaza cantidad entrante <= 0', () => {
    assert.throws(() => calcularCostoPromedioPonderado({
        cantidadActual: 0, costoActual: null, cantidadEntrante: 0, costoEntrante: 10
    }));
});

test('calcularCostoProduccion: suma cantidad * costoUnitario de cada consumo', () => {
    const total = calcularCostoProduccion([
        { cantidad: 2, costoUnitario: 100 },
        { cantidad: 1, costoUnitario: 50 }
    ]);
    assert.equal(total, 250);
});

test('calcularCostoProduccion: rechaza lista vacía', () => {
    assert.throws(() => calcularCostoProduccion([]));
});

test('calcularCostoUnitarioProducido: divide el costo total entre la cantidad producida', () => {
    const costo = calcularCostoUnitarioProducido({ costoTotalConsumos: 250, cantidadProducida: 5 });
    assert.equal(costo, 50);
});
