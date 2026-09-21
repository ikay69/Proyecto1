import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compraValidaDatos, compraValidaAnulacion } from '../../Helpers/compras.js';

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

test('POR_ABONO ya no es un tipo de compra valido', async () => {
    // dejo de existir en el dominio: ahora son dos modalidades, no tres.
    const {paso, res} = await correr(bodyValido({TipoCompra: 'POR_ABONO'}));
    assert.equal(paso, false);
    assert.equal(res.statusCode, 401);
    assert.match(res.cuerpo.msg, /Tipo de compra/);
});

test('CONTADO exige algun valor cancelado', async () => {
    const {paso, res} = await correr(bodyValido({ValorEfectivo: 0, ValorTransaccion: 0}));
    assert.equal(paso, false);
    assert.equal(res.statusCode, 401);
    assert.match(res.cuerpo.msg, /valor cancelado/);
});

test('CREDITO NO exige valor cancelado: el pago inicial es opcional', async () => {
    const {paso} = await correr(bodyValido({
        TipoCompra: 'CREDITO', ValorEfectivo: 0, ValorTransaccion: 0,
        NumeroCuotas: 3, ValorCuota: 350000
    }));
    assert.equal(paso, true);
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

// ---- campos del credito ----

const creditoBody = (extra = {}) => bodyValido({
    TipoCompra: 'CREDITO', ValorEfectivo: 0, ValorTransaccion: 0,
    NumeroCuotas: 3, ValorCuota: 350000, ...extra
});

test('CREDITO acepta un pago inicial parcial', async () => {
    assert.equal((await correr(creditoBody({ValorEfectivo: 50000}))).paso, true);
});

test('CREDITO exige NumeroCuotas entero mayor o igual a 1', async () => {
    for (const valor of [undefined, null, 0, -1, 1.5, '3']) {
        const {paso, res} = await correr(creditoBody({NumeroCuotas: valor}));
        assert.equal(paso, false, `NumeroCuotas=${valor} deberia rechazarse`);
        assert.equal(res.statusCode, 401);
    }
});

test('CREDITO de 1 cuota exige FechaCompromiso', async () => {
    const {paso, res} = await correr(creditoBody({NumeroCuotas: 1, ValorCuota: 1000000}));
    assert.equal(paso, false);
    assert.match(res.cuerpo.msg, /fecha de pago/);
});

test('CREDITO de 1 cuota con FechaCompromiso valida pasa', async () => {
    const {paso} = await correr(creditoBody({
        NumeroCuotas: 1, ValorCuota: 1000000, FechaCompromiso: '2026-10-15'
    }));
    assert.equal(paso, true);
});

test('CREDITO de varias cuotas no exige FechaCompromiso', async () => {
    assert.equal((await correr(creditoBody({NumeroCuotas: 6}))).paso, true);
});

test('CREDITO acepta ValorCuota nulo solo si trae el detalle de Cuotas', async () => {
    const sinDetalle = await correr(creditoBody({ValorCuota: null}));
    assert.equal(sinDetalle.paso, false);

    const conDetalle = await correr(creditoBody({
        ValorCuota: null,
        Cuotas: [{NumCuota: 1, ValorCuota: 400000}, {NumCuota: 2, ValorCuota: 300000}]
    }));
    assert.equal(conDetalle.paso, true);
});

test('CREDITO rechaza un detalle de Cuotas invalido', async () => {
    const repetida = await correr(creditoBody({
        Cuotas: [{NumCuota: 1, ValorCuota: 100}, {NumCuota: 1, ValorCuota: 200}]
    }));
    assert.equal(repetida.paso, false);
    assert.match(repetida.res.cuerpo.msg, /repetid/);

    const fueraDeRango = await correr(creditoBody({Cuotas: [{NumCuota: 9, ValorCuota: 100}]}));
    assert.equal(fueraDeRango.paso, false);

    const nula = await correr(creditoBody({Cuotas: [null]}));
    assert.equal(nula.paso, false);
    assert.equal(nula.res.statusCode, 401);  // 401, no 500: la guarda no deja estallar
});

test('CONTADO ignora los campos del credito en vez de rechazarlos', async () => {
    // el front puede mandar el formulario completo con los campos del credito en cero o
    // nulos; eso no es un error, simplemente no aplica.
    const {paso} = await correr(bodyValido({NumeroCuotas: null, ValorCuota: null, FechaCompromiso: null}));
    assert.equal(paso, true);
});

// ---- compraValidaAnulacion ----

const correrAnulacion = async (body) => {
    const res = construirRes();
    let paso = false;
    await compraValidaAnulacion({body}, res, () => { paso = true; });
    return {paso, res};
};

test('la anulacion exige un motivo', async () => {
    for (const motivo of [undefined, null, '', '   ', 123]) {
        const {paso, res} = await correrAnulacion({MotivoAnulacion: motivo});
        assert.equal(paso, false, `motivo=${motivo} deberia rechazarse`);
        assert.equal(res.statusCode, 401);
    }
});

test('la anulacion rechaza un motivo de menos de 5 caracteres', async () => {
    const {paso, res} = await correrAnulacion({MotivoAnulacion: 'malo'});
    assert.equal(paso, false);
    assert.match(res.cuerpo.msg, /5 caracteres/);
});

test('la anulacion cuenta los caracteres despues de recortar espacios', async () => {
    const {paso} = await correrAnulacion({MotivoAnulacion: '   malo   '});
    assert.equal(paso, false);
});

test('la anulacion rechaza un motivo de mas de 300 caracteres', async () => {
    const {paso, res} = await correrAnulacion({MotivoAnulacion: 'x'.repeat(301)});
    assert.equal(paso, false);
    assert.match(res.cuerpo.msg, /300/);
});

test('la anulacion acepta un motivo valido', async () => {
    assert.equal((await correrAnulacion({MotivoAnulacion: 'Devolución total al proveedor'})).paso, true);
    assert.equal((await correrAnulacion({MotivoAnulacion: 'x'.repeat(300)})).paso, true);
});
