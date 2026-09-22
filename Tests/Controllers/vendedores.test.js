import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../Database/config.js';
import Vendedores from '../../Models/vendedores.js';
import vendedoresControllers from '../../Controllers/vendedores.js';

// Los controladores se invocan directo, sin Express ni JWT: la ruta real solo les pone
// middlewares de validacion delante y toda la logica vive aqui.

const crearResSpy = () => {
    const res = {statusCode: null, body: null};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    return res;
};

// El marcador empieza por ZZ y sirve de textoFiltro: con LIKE '%marcador%' el listado
// paginado solo ve las filas de esta prueba.
const nuevoMarcador = () => 'ZZCTRL' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase();

const usuarioDePrueba = async () => {
    const [rows] = await pool.query('SELECT Id FROM Usuarios LIMIT 1;');
    if (rows.length === 0) throw new Error('Se requiere al menos un Usuario para correr estas pruebas');
    return rows[0].Id;
};

const limpiar = async (marcador) => {
    await pool.query('DELETE FROM Vendedores WHERE Nombre LIKE ?;', ['%' + marcador + '%']);
};

test('crear guarda el nombre en mayusculas y sin espacios de sobra', async () => {
    const marcador = nuevoMarcador();
    const usuarioId = await usuarioDePrueba();
    try {
        const res = crearResSpy();
        await vendedoresControllers.crear(
            {body: {idEmpresa: 1, Nombre: '  ' + marcador.toLowerCase() + ' juan  '}, usuario: {Id: usuarioId}},
            res
        );

        assert.equal(res.statusCode, 200);
        const guardado = await Vendedores.traerPorNombre({pEmpId: 1, pNombre: marcador + ' JUAN'});
        assert.ok(guardado, 'el vendedor deberia haberse guardado en mayusculas');
    } finally {
        await limpiar(marcador);
    }
});

test('crear rechaza con 400 un nombre que ya existe en la empresa', async () => {
    const marcador = nuevoMarcador();
    const usuarioId = await usuarioDePrueba();
    try {
        const req = {body: {idEmpresa: 1, Nombre: marcador + ' ANA'}, usuario: {Id: usuarioId}};
        await vendedoresControllers.crear(req, crearResSpy());

        const res = crearResSpy();
        await vendedoresControllers.crear(req, res);

        assert.equal(res.statusCode, 400);
        assert.match(res.body.msg, /ya existe/i);
    } finally {
        await limpiar(marcador);
    }
});

test('editar rechaza con 401 un nombre que ya usa otro vendedor', async () => {
    const marcador = nuevoMarcador();
    const usuarioId = await usuarioDePrueba();
    try {
        const primeroId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' UNO'});
        const segundoId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' DOS'});
        assert.ok(primeroId > 0);

        const res = crearResSpy();
        await vendedoresControllers.editar(
            {body: {idEmpresa: 1, idVendedor: segundoId, Nombre: marcador + ' UNO', Estado: true}, usuario: {Id: usuarioId}},
            res
        );

        assert.equal(res.statusCode, 401);
        assert.match(res.body.msg, /ya existe/i);
    } finally {
        await limpiar(marcador);
    }
});

test('editar deja renombrar un vendedor conservando su propio nombre', async () => {
    const marcador = nuevoMarcador();
    const usuarioId = await usuarioDePrueba();
    try {
        const id = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' UNO'});

        const res = crearResSpy();
        await vendedoresControllers.editar(
            {body: {idEmpresa: 1, idVendedor: id, Nombre: marcador + ' UNO', Estado: false}, usuario: {Id: usuarioId}},
            res
        );

        assert.equal(res.statusCode, 200);
        const vendedor = await Vendedores.traerPorId({pId: id, pEmpId: 1});
        assert.equal(Boolean(vendedor.vdrEstado), false);
    } finally {
        await limpiar(marcador);
    }
});

test('listarTodos traduce estadoFiltro 1 a activos, 2 a inactivos y 0 a todos', async () => {
    const marcador = nuevoMarcador();
    const usuarioId = await usuarioDePrueba();
    try {
        const activoId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' ACTIVO'});
        const inactivoId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' INACTIVO'});
        await Vendedores.editar({pEmpId: 1, pId: inactivoId, pNombre: marcador + ' INACTIVO', pEstado: false});

        const listar = async (estadoFiltro) => {
            const res = crearResSpy();
            await vendedoresControllers.listarTodos(
                {body: {idEmpresa: 1, campoOrdenar: 1, orden: 'ASC', pagina: 1, textoFiltro: marcador, estadoFiltro}},
                res
            );
            assert.equal(res.statusCode, 200);
            return res.body;
        };

        const activos = await listar(1);
        assert.equal(activos.cantData, 1);
        assert.deepEqual(activos.data.map(v => v.vdrId), [activoId]);

        const inactivos = await listar(2);
        assert.equal(inactivos.cantData, 1);
        assert.deepEqual(inactivos.data.map(v => v.vdrId), [inactivoId]);

        const todos = await listar(0);
        assert.equal(todos.cantData, 2);
        assert.deepEqual(todos.data.map(v => v.vdrId), [activoId, inactivoId]);
    } finally {
        await limpiar(marcador);
    }
});

test('listarTodos sin estadoFiltro lista los dos estados', async () => {
    const marcador = nuevoMarcador();
    const usuarioId = await usuarioDePrueba();
    try {
        await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' ACTIVO'});
        const inactivoId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' INACTIVO'});
        await Vendedores.editar({pEmpId: 1, pId: inactivoId, pNombre: marcador + ' INACTIVO', pEstado: false});

        const res = crearResSpy();
        await vendedoresControllers.listarTodos(
            {body: {idEmpresa: 1, campoOrdenar: 1, orden: 'ASC', pagina: 1, textoFiltro: marcador}},
            res
        );

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.cantData, 2);
    } finally {
        await limpiar(marcador);
    }
});

test('listarTodos desactiva el textoFiltro cuando se ordena por fecha', async () => {
    const marcador = nuevoMarcador();
    const usuarioId = await usuarioDePrueba();
    try {
        await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' ACTIVO'});

        const res = crearResSpy();
        await vendedoresControllers.listarTodos(
            {body: {idEmpresa: 1, campoOrdenar: 2, orden: 'DESC', pagina: 1, textoFiltro: marcador, estadoFiltro: 0}},
            res
        );

        // campoOrdenar 2 es FechaCreacion: el texto no se aplica, asi que el total es el de
        // toda la empresa y no solo el de las filas del marcador
        const total = await Vendedores.contarTodoFiltro({pEmpId: 1, pCampoOrden: 'FechaCreacion', pOrden: 'DESC', pTexto: '%%', pEstado: -1});
        assert.equal(res.body.cantData, total);
    } finally {
        await limpiar(marcador);
    }
});

test('listarActivos devuelve data con vdrId y vdrNombre', async () => {
    const marcador = nuevoMarcador();
    const usuarioId = await usuarioDePrueba();
    try {
        const activoId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' ACTIVO'});
        const inactivoId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' INACTIVO'});
        await Vendedores.editar({pEmpId: 1, pId: inactivoId, pNombre: marcador + ' INACTIVO', pEstado: false});

        const res = crearResSpy();
        await vendedoresControllers.listarActivos({body: {idEmpresa: 1}}, res);

        assert.equal(res.statusCode, 200);
        const mios = res.body.data.filter(v => String(v.vdrNombre).includes(marcador));
        assert.deepEqual(mios, [{vdrId: activoId, vdrNombre: marcador + ' ACTIVO'}]);
    } finally {
        await limpiar(marcador);
    }
});

test('listarPorId responde 401 cuando el vendedor no es de la empresa', async () => {
    const res = crearResSpy();
    await vendedoresControllers.listarPorId({body: {idEmpresa: 999999, idVendedor: 1}}, res);

    assert.equal(res.statusCode, 401);
});
