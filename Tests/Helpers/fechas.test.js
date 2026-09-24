import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarFecha, normalizarFechaFin, esFechaValida } from '../../Helpers/fechas.js';

test('normalizarFecha devuelve null para vacio, nulo e indefinido', () => {
    assert.equal(normalizarFecha(null), null);
    assert.equal(normalizarFecha(undefined), null);
    assert.equal(normalizarFecha(''), null);
});

test('normalizarFecha NO corre el dia con una fecha simple', () => {
    // el bug que esta funcion existe para evitar: new Date('2026-10-15') es medianoche UTC,
    // y en una sesion MySQL en UTC-5 se guardaria como 2026-10-14 19:00:00.
    assert.equal(normalizarFecha('2026-10-15'), '2026-10-15 00:00:00');
});

test('normalizarFecha acepta fecha con hora, en ISO o con espacio', () => {
    assert.equal(normalizarFecha('2026-10-15T14:30'), '2026-10-15 14:30:00');
    assert.equal(normalizarFecha('2026-10-15T14:30:45'), '2026-10-15 14:30:45');
    assert.equal(normalizarFecha('2026-10-15 09:05:00'), '2026-10-15 09:05:00');
});

test('normalizarFecha ignora el sufijo de zona de un ISO completo', () => {
    assert.equal(normalizarFecha('2026-10-15T00:00:00.000Z'), '2026-10-15 00:00:00');
});

test('normalizarFecha rechaza fechas que no existen en el calendario', () => {
    assert.throws(() => normalizarFecha('2026-02-31'), /Fecha inv/);
    assert.throws(() => normalizarFecha('2026-13-01'), /Fecha inv/);
    assert.throws(() => normalizarFecha('2026-00-10'), /Fecha inv/);
});

test('normalizarFecha rechaza basura', () => {
    assert.throws(() => normalizarFecha('manana'), /Fecha inv/);
    assert.throws(() => normalizarFecha('15/10/2026'), /Fecha inv/);
    assert.throws(() => normalizarFecha(12345), /Fecha inv/);
});

test('normalizarFecha acepta un 29 de febrero bisiesto', () => {
    assert.equal(normalizarFecha('2028-02-29'), '2028-02-29 00:00:00');
});

//---- normalizarFechaFin: la cota superior de un rango ----

test('normalizarFechaFin lleva una fecha sin hora al final del dia', () => {
    // una cota superior solo-fecha es medianoche, y contra un TIMESTAMP dejaria fuera todo
    // lo ocurrido ese mismo dia. 23:59:59 es el ultimo segundo que la columna puede guardar.
    assert.equal(normalizarFechaFin('2026-10-15'), '2026-10-15 23:59:59');
});

test('normalizarFechaFin respeta la hora que venga explicita', () => {
    // si el cliente mando una hora es una cota que eligio a proposito, no se toca.
    assert.equal(normalizarFechaFin('2026-10-15T14:30'), '2026-10-15 14:30:00');
    assert.equal(normalizarFechaFin('2026-10-15 09:05:00'), '2026-10-15 09:05:00');
    assert.equal(normalizarFechaFin('2026-10-15T00:00:00.000Z'), '2026-10-15 00:00:00');
});

test('normalizarFechaFin devuelve null para vacio, nulo e indefinido', () => {
    assert.equal(normalizarFechaFin(null), null);
    assert.equal(normalizarFechaFin(undefined), null);
    assert.equal(normalizarFechaFin(''), null);
});

test('normalizarFechaFin rechaza lo mismo que normalizarFecha', () => {
    assert.throws(() => normalizarFechaFin('2026-02-31'), /Fecha inv/);
    assert.throws(() => normalizarFechaFin('manana'), /Fecha inv/);
});

test('normalizarFechaFin acepta un Date y no lo lleva al final del dia', () => {
    // un Date siempre trae hora, asi que nunca es "solo fecha".
    assert.equal(normalizarFechaFin(new Date(2026, 9, 15, 8, 0, 0)), '2026-10-15 08:00:00');
});

test('esFechaValida es false para vacio y basura, true para una fecha', () => {
    assert.equal(esFechaValida(null), false);
    assert.equal(esFechaValida(''), false);
    assert.equal(esFechaValida('manana'), false);
    assert.equal(esFechaValida('2026-10-15'), true);
});
