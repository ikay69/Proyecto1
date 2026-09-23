import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cuotaValidaDatos, cuotaValidaEdicion } from '../../Helpers/compraCuotas.js';

const construirRes = () => {
    const res = {statusCode: null, cuerpo: null};
    res.status = (codigo) => { res.statusCode = codigo; return res; };
    res.json = (cuerpo) => { res.cuerpo = cuerpo; return res; };
    return res;
};

const correrCon = (middleware) => async (body) => {
    const res = construirRes();
    let paso = false;
    await middleware({body}, res, () => { paso = true; });
    return {paso, res};
};

const correrAlta = correrCon(cuotaValidaDatos);
const correrEdicion = correrCon(cuotaValidaEdicion);

// ---- alta ----

test('el alta acepta una cuota minima valida', async () => {
    assert.equal((await correrAlta({NumCuota: 1, ValorCuota: 100000})).paso, true);
});

test('el alta acepta fecha y estado explicitos', async () => {
    assert.equal((await correrAlta({
        NumCuota: 2, ValorCuota: 100000, FechaPago: '2026-11-15', Estado: 'CANCELADA'
    })).paso, true);
});

test('el alta exige NumCuota entero mayor o igual a 1', async () => {
    for (const valor of [undefined, null, 0, -1, 1.5, '2']) {
        const {paso, res} = await correrAlta({NumCuota: valor, ValorCuota: 100000});
        assert.equal(paso, false, `NumCuota=${valor} deberia rechazarse`);
        assert.equal(res.statusCode, 400);
    }
});

test('el alta exige ValorCuota mayor a cero', async () => {
    for (const valor of [undefined, null, 0, -1, 'mucho']) {
        assert.equal((await correrAlta({NumCuota: 1, ValorCuota: valor})).paso, false,
                     `ValorCuota=${valor} deberia rechazarse`);
    }
});

test('el alta acepta una cuota sin fecha de pago', async () => {
    assert.equal((await correrAlta({NumCuota: 1, ValorCuota: 100, FechaPago: null})).paso, true);
});

test('el alta rechaza una fecha de pago invalida', async () => {
    const {paso, res} = await correrAlta({NumCuota: 1, ValorCuota: 100, FechaPago: '2026-02-31'});
    assert.equal(paso, false);
    assert.match(res.cuerpo.msg, /fecha de pago/);
});

test('el alta rechaza un estado fuera del dominio', async () => {
    const {paso, res} = await correrAlta({NumCuota: 1, ValorCuota: 100, Estado: 'PAGADA'});
    assert.equal(paso, false);
    assert.match(res.cuerpo.msg, /PENDIENTE o CANCELADA/);
});

// ---- edicion ----

test('la edicion acepta cambiar un solo campo', async () => {
    assert.equal((await correrEdicion({Estado: 'CANCELADA'})).paso, true);
    assert.equal((await correrEdicion({FechaPago: '2027-01-15'})).paso, true);
    assert.equal((await correrEdicion({ValorCuota: 85000})).paso, true);
    assert.equal((await correrEdicion({NumCuota: 4})).paso, true);
});

test('la edicion rechaza una peticion que no cambia nada', async () => {
    // un no-op silencioso responderia 200 sin haber hecho nada: es un error del llamador.
    const {paso, res} = await correrEdicion({});
    assert.equal(paso, false);
    assert.match(res.cuerpo.msg, /nada que actualizar/);
});

test('la edicion permite vaciar la fecha de pago con null', async () => {
    assert.equal((await correrEdicion({FechaPago: null})).paso, true);
});

test('la edicion valida los campos que si vienen', async () => {
    assert.equal((await correrEdicion({ValorCuota: 0})).paso, false);
    assert.equal((await correrEdicion({NumCuota: 0})).paso, false);
    assert.equal((await correrEdicion({Estado: 'PAGADA'})).paso, false);
    assert.equal((await correrEdicion({FechaPago: 'manana'})).paso, false);
});
