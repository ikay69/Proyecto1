import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../Database/config.js';
import Vendedores from '../../Models/vendedores.js';

// El modelo de Vendedores consulta con pool.query, igual que Categorias y Bodegas, asi que no
// acepta una connection y withRollback no puede deshacer sus escrituras. Se limpia a mano en
// un finally, como en tercerosRoles.test.js.

// Vendedores.Nombre tiene UNIQUE (EmpresaId, Nombre). El marcador ademas sirve de textoFiltro:
// con LIKE '%marcador%' el listado paginado solo ve las filas de esta prueba.
const nuevoMarcador = () => 'ZZPRUEBA' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase();

const usuarioDePrueba = async () => {
    const [rows] = await pool.query('SELECT Id FROM Usuarios LIMIT 1;');
    if (rows.length === 0) throw new Error('Se requiere al menos un Usuario para correr estas pruebas');
    return rows[0].Id;
};

const borrar = async (ids) => {
    for (const id of ids.filter(Boolean)) {
        await pool.query('DELETE FROM Vendedores WHERE Id = ?;', [id]);
    }
};

test('crear inserta la fila y traerPorNombre la encuentra', async () => {
    const usuarioId = await usuarioDePrueba();
    const nombre = nuevoMarcador() + ' JUAN';
    let id;
    try {
        id = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: nombre});
        assert.ok(id > 0);

        const encontrado = await Vendedores.traerPorNombre({pEmpId: 1, pNombre: nombre});
        assert.ok(encontrado);
        assert.equal(encontrado.Id, id);
        assert.equal(encontrado.Nombre, nombre);
    } finally {
        await borrar([id]);
    }
});

test('crear deja el vendedor activo', async () => {
    const usuarioId = await usuarioDePrueba();
    let id;
    try {
        id = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: nuevoMarcador() + ' ANA'});

        const vendedor = await Vendedores.traerPorId({pId: id, pEmpId: 1});
        assert.equal(Boolean(vendedor.vdrEstado), true);
    } finally {
        await borrar([id]);
    }
});

test('traerPorId devuelve los alias con prefijo vdr', async () => {
    const usuarioId = await usuarioDePrueba();
    const nombre = nuevoMarcador() + ' LUIS';
    let id;
    try {
        id = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: nombre});

        const vendedor = await Vendedores.traerPorId({pId: id, pEmpId: 1});
        assert.deepEqual(
            Object.keys(vendedor).sort(),
            ['vdrEmp', 'vdrEstado', 'vdrFecCreacion', 'vdrId', 'vdrNombre', 'vdrUsuario']
        );
        assert.equal(vendedor.vdrId, id);
        assert.equal(vendedor.vdrNombre, nombre);
        assert.equal(Number(vendedor.vdrEmp), 1);
    } finally {
        await borrar([id]);
    }
});

test('traerPorId no cruza empresas', async () => {
    const usuarioId = await usuarioDePrueba();
    let id;
    try {
        id = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: nuevoMarcador() + ' PEDRO'});

        assert.equal(await Vendedores.traerPorId({pId: id, pEmpId: 999999}), null);
    } finally {
        await borrar([id]);
    }
});

test('editar cambia el nombre y el estado', async () => {
    const usuarioId = await usuarioDePrueba();
    const marcador = nuevoMarcador();
    let id;
    try {
        id = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' ANTES'});

        const filas = await Vendedores.editar({pEmpId: 1, pId: id, pNombre: marcador + ' DESPUES', pEstado: false});
        assert.equal(filas, 1);

        const vendedor = await Vendedores.traerPorId({pId: id, pEmpId: 1});
        assert.equal(vendedor.vdrNombre, marcador + ' DESPUES');
        assert.equal(Boolean(vendedor.vdrEstado), false);
    } finally {
        await borrar([id]);
    }
});

test('traerActivos devuelve solo vdrId y vdrNombre de los activos', async () => {
    const usuarioId = await usuarioDePrueba();
    const marcador = nuevoMarcador();
    let activoId, inactivoId;
    try {
        activoId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' ACTIVO'});
        inactivoId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' INACTIVO'});
        await Vendedores.editar({pEmpId: 1, pId: inactivoId, pNombre: marcador + ' INACTIVO', pEstado: false});

        const activos = await Vendedores.traerActivos({pEmpId: 1});
        const mios = activos.filter(v => String(v.vdrNombre).includes(marcador));

        assert.equal(mios.length, 1);
        assert.deepEqual(Object.keys(mios[0]).sort(), ['vdrId', 'vdrNombre']);
        assert.equal(mios[0].vdrId, activoId);
        assert.equal(mios[0].vdrNombre, marcador + ' ACTIVO');
    } finally {
        await borrar([activoId, inactivoId]);
    }
});

test('traerTodo filtra por estado: -1 todos, 1 activos, 0 inactivos', async () => {
    const usuarioId = await usuarioDePrueba();
    const marcador = nuevoMarcador();
    const texto = '%' + marcador + '%';
    let activoId, inactivoId;
    try {
        activoId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' ACTIVO'});
        inactivoId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' INACTIVO'});
        await Vendedores.editar({pEmpId: 1, pId: inactivoId, pNombre: marcador + ' INACTIVO', pEstado: false});

        const base = {pEmpId: 1, pCampoOrden: 'Nombre', pOrden: 'ASC', pOffset: 0, pTexto: texto};

        const todos = await Vendedores.traerTodo({...base, pEstado: -1});
        assert.deepEqual(todos.map(v => v.vdrId), [activoId, inactivoId]);

        const activos = await Vendedores.traerTodo({...base, pEstado: 1});
        assert.deepEqual(activos.map(v => v.vdrId), [activoId]);

        const inactivos = await Vendedores.traerTodo({...base, pEstado: 0});
        assert.deepEqual(inactivos.map(v => v.vdrId), [inactivoId]);
    } finally {
        await borrar([activoId, inactivoId]);
    }
});

test('traerTodo ignora el texto cuando el filtro es %% y respeta el orden DESC', async () => {
    const usuarioId = await usuarioDePrueba();
    const marcador = nuevoMarcador();
    let aId, bId;
    try {
        aId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' A'});
        bId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' B'});

        const todos = await Vendedores.traerTodo({
            pEmpId: 1, pCampoOrden: 'Nombre', pOrden: 'DESC', pOffset: 0, pTexto: '%%', pEstado: -1
        });
        const mios = todos.filter(v => String(v.vdrNombre).includes(marcador)).map(v => v.vdrId);

        // el marcador empieza por ZZ: con orden descendente por Nombre estas filas encabezan la pagina
        assert.deepEqual(mios, [bId, aId]);
    } finally {
        await borrar([aId, bId]);
    }
});

test('contarTodoFiltro cuenta lo mismo que devuelve traerTodo con el mismo filtro', async () => {
    const usuarioId = await usuarioDePrueba();
    const marcador = nuevoMarcador();
    const texto = '%' + marcador + '%';
    let activoId, inactivoId;
    try {
        activoId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' ACTIVO'});
        inactivoId = await Vendedores.crear({pEmpId: 1, pUsuIdCrea: usuarioId, pNombre: marcador + ' INACTIVO'});
        await Vendedores.editar({pEmpId: 1, pId: inactivoId, pNombre: marcador + ' INACTIVO', pEstado: false});

        const base = {pEmpId: 1, pCampoOrden: 'Nombre', pOrden: 'ASC', pTexto: texto};

        for (const estado of [-1, 1, 0]) {
            const total = await Vendedores.contarTodoFiltro({...base, pEstado: estado});
            const filas = await Vendedores.traerTodo({...base, pOffset: 0, pEstado: estado});
            assert.equal(total, filas.length, 'estado ' + estado);
        }
    } finally {
        await borrar([activoId, inactivoId]);
    }
});
