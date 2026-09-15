import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarPropietarioBolsa, BOLSAS_VALIDAS } from '../../Helpers/existenciaReglas.js';

test('BOLSAS_VALIDAS tiene las 6 bolsas del diseño', () => {
    assert.deepEqual(BOLSAS_VALIDAS, [
        'DISPONIBLE', 'RESERVADO', 'PRESTADO_A_TALLER',
        'RECIBIDO_DE_TALLER', 'EN_GARANTIA_EMPENO', 'EN_REPARACION'
    ]);
});

test('validarPropietarioBolsa: DISPONIBLE sin propietario es válido', () => {
    const error = validarPropietarioBolsa({ bolsaEstado: 'DISPONIBLE', propietarioId: null });
    assert.equal(error, null);
});

test('validarPropietarioBolsa: DISPONIBLE con propietario es inválido', () => {
    const error = validarPropietarioBolsa({ bolsaEstado: 'DISPONIBLE', propietarioId: 5 });
    assert.match(error, /no debe tener un propietario/);
});

test('validarPropietarioBolsa: PRESTADO_A_TALLER sin propietario es inválido', () => {
    const error = validarPropietarioBolsa({ bolsaEstado: 'PRESTADO_A_TALLER', propietarioId: null });
    assert.match(error, /requiere un propietario/);
});

test('validarPropietarioBolsa: EN_GARANTIA_EMPENO con propietario es válido', () => {
    const error = validarPropietarioBolsa({ bolsaEstado: 'EN_GARANTIA_EMPENO', propietarioId: 9 });
    assert.equal(error, null);
});
