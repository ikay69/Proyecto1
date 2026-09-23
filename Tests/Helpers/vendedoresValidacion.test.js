import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vdrValidaNombre, vdrValidaFiltros } from '../../Helpers/vendedores.js';

// vdrValidaNombre y vdrValidaFiltros son middlewares de ruta: o llaman a next() o cortan con
// un status y un json. Estos dobles capturan cual de las dos cosas paso.
const dobleRes = () => ({
    codigo: null,
    cuerpo: null,
    status(codigo){ this.codigo = codigo; return this; },
    json(cuerpo){ this.cuerpo = cuerpo; return this; }
});

const correr = async (middleware, body) => {
    const res = dobleRes();
    let paso = false;
    await middleware({body}, res, () => { paso = true; });
    return {paso, codigo: res.codigo, msg: res.cuerpo ? res.cuerpo.msg : null};
};

test('vdrValidaNombre deja pasar un nombre valido', async () => {
    const r = await correr(vdrValidaNombre, {Nombre: 'juan perez'});
    assert.equal(r.paso, true);
});

test('vdrValidaNombre rechaza nombre vacio o ausente', async () => {
    for (const body of [{Nombre: '   '}, {Nombre: ''}, {}]) {
        const r = await correr(vdrValidaNombre, body);
        assert.equal(r.paso, false);
        assert.equal(r.codigo, 400);
        assert.match(r.msg, /nombre no puede estar/i);
    }
});

test('vdrValidaNombre rechaza nombre de mas de 100 caracteres', async () => {
    const r = await correr(vdrValidaNombre, {Nombre: 'A'.repeat(101)});
    assert.equal(r.paso, false);
    assert.match(r.msg, /100/);
});

test('vdrValidaNombre acepta exactamente 100 caracteres', async () => {
    const r = await correr(vdrValidaNombre, {Nombre: 'A'.repeat(100)});
    assert.equal(r.paso, true);
});

test('vdrValidaFiltros deja pasar los filtros minimos', async () => {
    const r = await correr(vdrValidaFiltros, {campoOrdenar: 1, pagina: 1});
    assert.equal(r.paso, true);
});

test('vdrValidaFiltros rechaza pagina que no es entera', async () => {
    for (const pagina of ['1', 1.5, undefined]) {
        const r = await correr(vdrValidaFiltros, {campoOrdenar: 1, pagina});
        assert.equal(r.paso, false);
        assert.match(r.msg, /pagina/i);
    }
});

test('vdrValidaFiltros solo acepta campoOrdenar 1 o 2', async () => {
    for (const campoOrdenar of [0, 3, '1', undefined]) {
        const r = await correr(vdrValidaFiltros, {campoOrdenar, pagina: 1});
        assert.equal(r.paso, false);
        assert.match(r.msg, /orden/i);
    }
});

test('vdrValidaFiltros acepta estadoFiltro 0, 1 y 2', async () => {
    for (const estadoFiltro of [0, 1, 2]) {
        const r = await correr(vdrValidaFiltros, {campoOrdenar: 1, pagina: 1, estadoFiltro});
        assert.equal(r.paso, true, 'estadoFiltro ' + estadoFiltro);
    }
});

test('vdrValidaFiltros acepta que estadoFiltro no venga', async () => {
    const r = await correr(vdrValidaFiltros, {campoOrdenar: 1, pagina: 1});
    assert.equal(r.paso, true);
});

test('vdrValidaFiltros rechaza estadoFiltro fuera de 0, 1 y 2', async () => {
    for (const estadoFiltro of [3, -1, '1', true, null]) {
        const r = await correr(vdrValidaFiltros, {campoOrdenar: 1, pagina: 1, estadoFiltro});
        assert.equal(r.paso, false, 'estadoFiltro ' + String(estadoFiltro));
        assert.match(r.msg, /estado/i);
    }
});

test('vdrValidaFiltros rechaza textoFiltro de mas de 100 caracteres', async () => {
    const r = await correr(vdrValidaFiltros, {campoOrdenar: 1, pagina: 1, textoFiltro: 'A'.repeat(101)});
    assert.equal(r.paso, false);
    assert.match(r.msg, /100/);
});

test('vdrValidaFiltros acepta textoFiltro vacio o ausente', async () => {
    for (const textoFiltro of ['   ', '', undefined]) {
        const r = await correr(vdrValidaFiltros, {campoOrdenar: 1, pagina: 1, textoFiltro});
        assert.equal(r.paso, true);
    }
});
