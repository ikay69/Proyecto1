import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarDatosArticulo } from '../../Helpers/articulos.js';

test('acepta un articulo minimo valido', () => {
    assert.equal(validarDatosArticulo({Nombre: 'ANILLO'}), null);
});

test('rechaza nombre vacio o ausente', () => {
    assert.match(validarDatosArticulo({Nombre: '   '}), /nombre no puede estar/i);
    assert.match(validarDatosArticulo({}), /nombre no puede estar/i);
});

test('rechaza nombre de mas de 150 caracteres y descripcion de mas de 300', () => {
    assert.match(validarDatosArticulo({Nombre: 'A'.repeat(151)}), /150/);
    assert.match(validarDatosArticulo({Nombre: 'ANILLO', Descripcion: 'D'.repeat(301)}), /300/);
});

test('rechaza precio de venta negativo o no numerico', () => {
    assert.match(validarDatosArticulo({Nombre: 'ANILLO', PrecioVentaUnitario: -1}), /precio/i);
    assert.match(validarDatosArticulo({Nombre: 'ANILLO', PrecioVentaUnitario: 'mucho'}), /precio/i);
});

test('rechaza Propiedades mal formadas', () => {
    assert.match(validarDatosArticulo({Nombre: 'ANILLO', Propiedades: 'no es lista'}), /lista/i);
    assert.match(validarDatosArticulo({Nombre: 'ANILLO', Propiedades: [null]}), /idPropiedad/);
    assert.match(validarDatosArticulo({Nombre: 'ANILLO', Propiedades: [{idPropiedad: 1.5, Valor: 'x'}]}), /idPropiedad/);
    assert.match(validarDatosArticulo({Nombre: 'ANILLO', Propiedades: [{idPropiedad: 1, Valor: '  '}]}), /valor/i);
    assert.match(validarDatosArticulo({Nombre: 'ANILLO', Propiedades: [{idPropiedad: 1, Valor: 'V'.repeat(151)}]}), /150/);
});

test('acepta Propiedades bien formadas', () => {
    assert.equal(validarDatosArticulo({Nombre: 'ANILLO', Propiedades: [{idPropiedad: 1, Valor: '18K'}]}), null);
});
