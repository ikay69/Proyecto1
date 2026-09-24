import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movimientoValidaKardexFiltros } from '../../Helpers/movimientos.js';

// mismo doble de `res` que el resto de las pruebas de validacion: guarda status y cuerpo.
const construirRes = () => {
    const res = {statusCode: null, cuerpo: null};
    res.status = (codigo) => { res.statusCode = codigo; return res; };
    res.json = (cuerpo) => { res.cuerpo = cuerpo; return res; };
    return res;
};

const correr = async (body) => {
    const res = construirRes();
    let paso = false;
    await movimientoValidaKardexFiltros({body}, res, () => { paso = true; });
    return {paso, res};
};

const filtrosValidos = (extra = {}) => ({
    idArticulo: 1, idBodega: '', fechaInicio: '2026-09-01', fechaFin: '2026-09-30', pagina: 1, ...extra
});

test('el kardex acepta un rango de fechas valido', async () => {
    assert.equal((await correr(filtrosValidos())).paso, true);
    assert.equal((await correr(filtrosValidos({fechaInicio: '2026-09-01 08:00:00'}))).paso, true);
});

//las dos fechas siguen siendo OBLIGATORIAS en el kardex, a diferencia del listado de Compras:
//un kardex sin rango recorreria la vida entera del articulo.
test('el kardex sigue exigiendo las dos fechas', async () => {
    for (const vacio of [undefined, null, '']) {
        const inicio = await correr(filtrosValidos({fechaInicio: vacio}));
        assert.equal(inicio.paso, false, `fechaInicio ${String(vacio)} no debio pasar`);
        assert.match(inicio.res.cuerpo.msg, /Fecha inicio/);

        const fin = await correr(filtrosValidos({fechaFin: vacio}));
        assert.equal(fin.paso, false, `fechaFin ${String(vacio)} no debio pasar`);
        assert.match(fin.res.cuerpo.msg, /Fecha fin/);
    }
});

//Date.parse acepta '2026-02-31' y lo corre al 3 de marzo; normalizarFecha lo rechaza. Importa
//porque el Controller del kardex normaliza la cota superior con ese mismo helper: si una fecha
//que no existe llega hasta ahi, lanza y el usuario recibe un 500 en vez de un 400 que explica
//que se equivoco al escribir la fecha.
test('el kardex rechaza fechas que no existen en el calendario', async () => {
    const inicio = await correr(filtrosValidos({fechaInicio: '2026-02-31'}));
    assert.equal(inicio.paso, false);
    assert.equal(inicio.res.statusCode, 400);
    assert.match(inicio.res.cuerpo.msg, /Fecha inicio/);

    const fin = await correr(filtrosValidos({fechaFin: '2026-13-01'}));
    assert.equal(fin.paso, false);
    assert.equal(fin.res.statusCode, 400);
    assert.match(fin.res.cuerpo.msg, /Fecha fin/);
});

test('el kardex rechaza basura en las fechas', async () => {
    for (const mala of ['manana', '30/09/2026', 20260930]) {
        const {paso, res} = await correr(filtrosValidos({fechaFin: mala}));
        assert.equal(paso, false, `fechaFin ${String(mala)} no debio pasar`);
        assert.equal(res.statusCode, 400);
    }
});
