import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ventaValidaDatos, ventaValidaFiltros } from '../../Helpers/ventas.js';

// doble de `res` minimo: guarda el status y el cuerpo en vez de escribir en un socket.
const construirRes = () => {
    const res = {statusCode: null, cuerpo: null};
    res.status = (codigo) => { res.statusCode = codigo; return res; };
    res.json = (cuerpo) => { res.cuerpo = cuerpo; return res; };
    return res;
};

// corre el middleware y devuelve {paso, msg}: `paso` es true si llamo a next().
const correr = async (middleware, body) => {
    const res = construirRes();
    let paso = false;
    await middleware({body}, res, () => { paso = true; });
    return {paso, statusCode: res.statusCode, msg: res.cuerpo ? res.cuerpo.msg : null};
};

const lineaValida = {idBodega: 1, idArticulo: 7, Cantidad: 2, PrecioVentaUnidad: 50000};

const ventaValida = (extra = {}) => ({
    idTercero: 5, TipoVenta: 'CONTADO', ValorEfectivo: 100000,
    Articulos: [lineaValida], ...extra
});

test('ventaValidaDatos acepta una venta sin idVendedor', async () => {
    const r = await correr(ventaValidaDatos, ventaValida());
    assert.equal(r.paso, true);
});

test('ventaValidaDatos acepta una venta con idVendedor entero', async () => {
    const r = await correr(ventaValidaDatos, ventaValida({idVendedor: 7}));
    assert.equal(r.paso, true);
});

test('ventaValidaDatos acepta idVendedor null como "sin vendedor"', async () => {
    const r = await correr(ventaValidaDatos, ventaValida({idVendedor: null}));
    assert.equal(r.paso, true);
});

test('ventaValidaDatos rechaza un idVendedor que no es entero positivo', async () => {
    for (const idVendedor of ['7', 7.5, 0, -1, true, {}]) {
        const r = await correr(ventaValidaDatos, ventaValida({idVendedor}));
        assert.equal(r.paso, false, 'idVendedor ' + String(idVendedor));
        assert.equal(r.statusCode, 401);
        assert.match(r.msg, /vendedor/i);
    }
});

test('ventaValidaFiltros acepta el filtro sin idVendedor', async () => {
    const r = await correr(ventaValidaFiltros, {pagina: 1});
    assert.equal(r.paso, true);
});

test('ventaValidaFiltros acepta idVendedor 0, -1 y un id concreto', async () => {
    for (const idVendedor of [0, -1, 7]) {
        const r = await correr(ventaValidaFiltros, {pagina: 1, idVendedor});
        assert.equal(r.paso, true, 'idVendedor ' + idVendedor);
    }
});

test('ventaValidaFiltros rechaza un idVendedor que no es entero o es menor que -1', async () => {
    for (const idVendedor of ['0', 1.5, -2, null, true]) {
        const r = await correr(ventaValidaFiltros, {pagina: 1, idVendedor});
        assert.equal(r.paso, false, 'idVendedor ' + String(idVendedor));
        assert.equal(r.statusCode, 401);
        assert.match(r.msg, /vendedor/i);
    }
});

test('ventaValidaFiltros sigue rechazando una pagina que no es entera', async () => {
    const r = await correr(ventaValidaFiltros, {pagina: '1', idVendedor: 0});
    assert.equal(r.paso, false);
    assert.match(r.msg, /pagina/i);
});
