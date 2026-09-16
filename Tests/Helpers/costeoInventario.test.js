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

test('calcularCostoPromedioPonderado: rechaza la primera entrada sin costo entrante', () => {
    assert.throws(() => calcularCostoPromedioPonderado({
        cantidadActual: 0, costoActual: null, cantidadEntrante: 10
    }), /obligatorio en la primera entrada/);

    assert.throws(() => calcularCostoPromedioPonderado({
        cantidadActual: 0, costoActual: null, cantidadEntrante: 10, costoEntrante: null
    }), /obligatorio en la primera entrada/);
});

test('calcularCostoPromedioPonderado: entrada posterior sin costo conserva el promedio vigente', () => {
    assert.equal(calcularCostoPromedioPonderado({
        cantidadActual: 10, costoActual: 50, cantidadEntrante: 5
    }), 50);

    assert.equal(calcularCostoPromedioPonderado({
        cantidadActual: 10, costoActual: 50, cantidadEntrante: 5, costoEntrante: null
    }), 50);
});

test('calcularCostoPromedioPonderado: rechaza costo entrante negativo con existencia previa', () => {
    assert.throws(() => calcularCostoPromedioPonderado({
        cantidadActual: 10, costoActual: 50, cantidadEntrante: 5, costoEntrante: -1
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

test('calcularCostoProduccion: rechaza un consumo sin costo unitario registrado', () => {
    assert.throws(() => calcularCostoProduccion([
        { cantidad: 2, costoUnitario: 100 },
        { cantidad: 1, costoUnitario: null }
    ]), /no tiene un costo unitario registrado/);

    assert.throws(() => calcularCostoProduccion([
        { cantidad: 1 }
    ]), /no tiene un costo unitario registrado/);
});

test('calcularCostoUnitarioProducido: divide el costo total entre la cantidad producida', () => {
    const costo = calcularCostoUnitarioProducido({ costoTotalConsumos: 250, cantidadProducida: 5 });
    assert.equal(costo, 50);
});
