import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redondear } from '../../Helpers/dinero.js';

test('redondear deja dos decimales', () => {
    assert.equal(redondear(10.005), 10.01);
    assert.equal(redondear(10.004), 10);
    assert.equal(redondear(1500), 1500);
});

test('redondear absorbe el error de punto flotante de una suma', () => {
    assert.equal(redondear(0.1 + 0.2), 0.3);
});

test('redondear convierte cadenas numericas', () => {
    assert.equal(redondear('15.556'), 15.56);
});
