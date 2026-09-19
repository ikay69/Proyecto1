import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compraValidaDatos } from '../../Helpers/compras.js';

// doble de `res` minimo: guarda el status y el cuerpo en vez de escribir en un socket.
const construirRes = () => {
    const res = {statusCode: null, cuerpo: null};
    res.status = (codigo) => { res.statusCode = codigo; return res; };
    res.json = (cuerpo) => { res.cuerpo = cuerpo; return res; };
    return res;
};

// corre el middleware y devuelve {paso, res}: `paso` es true si llamo a next().
const correr = async (body) => {
    const res = construirRes();
    let paso = false;
    await compraValidaDatos({body}, res, () => { paso = true; });
    return {paso, res};
};

const lineaValida = {idBodega: 1, idArticulo: 7, Cantidad: 2, CostoUnidad: 50000};

const bodyValido = (extra = {}) => ({
    idTercero: 5, TipoCompra: 'CONTADO', ValorEfectivo: 100000,
    Articulos: [lineaValida], ...extra
});

test('acepta una compra minima valida', async () => {
    const {paso} = await correr(bodyValido());
    assert.equal(paso, true);
});

test('rechaza tipo de compra invalido', async () => {
    const {paso, res} = await correr(bodyValido({TipoCompra: 'REGALO'}));
    assert.equal(paso, false);
    assert.equal(res.statusCode, 401);
    assert.match(res.cuerpo.msg, /Tipo de compra/);
});

test('acepta POR_ABONO y CREDITO en el validador (el Controller los rechaza despues)', async () => {
    assert.equal((await correr(bodyValido({TipoCompra: 'POR_ABONO'}))).paso, true);
    assert.equal((await correr(bodyValido({TipoCompra: 'CREDITO'}))).paso, true);
});

test('exige algun valor cancelado', async () => {
    const {paso, res} = await correr(bodyValido({ValorEfectivo: 0, ValorTransaccion: 0}));
    assert.equal(paso, false);
    assert.match(res.cuerpo.msg, /valor cancelado/);
});

test('rechaza documento soporte de mas de 50 caracteres', async () => {
    const {paso, res} = await correr(bodyValido({NumeroDocumentoSoporte: 'F'.repeat(51)}));
    assert.equal(paso, false);
    assert.match(res.cuerpo.msg, /50/);
});

test('rechaza arreglo de articulos vacio y de mas de 200 lineas', async () => {
    assert.equal((await correr(bodyValido({Articulos: []}))).paso, false);
    assert.equal((await correr(bodyValido({Articulos: new Array(201).fill(lineaValida)}))).paso, false);
});

test('rechaza una linea que trae idArticulo y ArticuloNuevo a la vez', async () => {
    const {paso, res} = await correr(bodyValido({Articulos: [{
        ...lineaValida,
        ArticuloNuevo: {idProducto: 3, Nombre: 'ANILLO'}
    }]}));
    assert.equal(paso, false);
    assert.match(res.cuerpo.msg, /idArticulo o ArticuloNuevo/);
});

test('rechaza una linea que no trae ni idArticulo ni ArticuloNuevo', async () => {
    const {paso, res} = await correr(bodyValido({Articulos: [{idBodega: 1, Cantidad: 1, CostoUnidad: 100}]}));
    assert.equal(paso, false);
    assert.match(res.cuerpo.msg, /idArticulo o ArticuloNuevo/);
});

test('acepta una linea de articulo nuevo bien formada', async () => {
    const {paso} = await correr(bodyValido({Articulos: [{
        idBodega: 1, Cantidad: 1, CostoUnidad: 180000,
        ArticuloNuevo: {idProducto: 3, Nombre: 'ANILLO ORO 18K', Propiedades: [{idPropiedad: 2, Valor: '18K'}]}
    }]}));
    assert.equal(paso, true);
});

test('rechaza una linea de articulo nuevo sin idProducto o con nombre vacio', async () => {
    assert.equal((await correr(bodyValido({Articulos: [{
        idBodega: 1, Cantidad: 1, CostoUnidad: 1, ArticuloNuevo: {Nombre: 'ANILLO'}
    }]}))).paso, false);

    assert.equal((await correr(bodyValido({Articulos: [{
        idBodega: 1, Cantidad: 1, CostoUnidad: 1, ArticuloNuevo: {idProducto: 3, Nombre: '  '}
    }]}))).paso, false);
});

test('rechaza cantidad o costo no positivos, y bodega no entera', async () => {
    assert.equal((await correr(bodyValido({Articulos: [{...lineaValida, Cantidad: 0}]}))).paso, false);
    assert.equal((await correr(bodyValido({Articulos: [{...lineaValida, CostoUnidad: 0}]}))).paso, false);
    assert.equal((await correr(bodyValido({Articulos: [{...lineaValida, idBodega: 'uno'}]}))).paso, false);
});

test('rechaza un elemento null en el arreglo de articulos sin estallar', async () => {
    const {paso, res} = await correr(bodyValido({Articulos: [null]}));
    assert.equal(paso, false);
    assert.equal(res.statusCode, 401);
});
