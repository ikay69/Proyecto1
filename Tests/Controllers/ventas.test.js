import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../Database/config.js';
import Ventas from '../../Models/ventas.js';
import ventasControllers from '../../Controllers/ventas.js';

// Los controladores se invocan directo, sin Express ni JWT: la ruta real solo les pone
// middlewares de validacion delante.

const crearResSpy = () => {
    const res = {statusCode: null, body: null};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    return res;
};

const traerContexto = async () => {
    const [usuarioRows] = await pool.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    const [terceroRows] = await pool.query(`SELECT Id FROM Terceros WHERE EmpresaId = 1 AND Estado = 1 LIMIT 1;`);
    if (terceroRows.length === 0) throw new Error('Se requiere un Tercero activo en la empresa 1 para estas pruebas');
    return { usuarioId: usuarioRows[0].Id, terceroId: terceroRows[0].Id };
};

// Vendedores.Nombre tiene UNIQUE (EmpresaId, Nombre): cada vendedor de prueba usa un nombre unico.
const crearVendedor = async (usuarioId, {empId = 1, estado = true} = {}) => {
    const nombre = 'VENDEDOR CTRL ' + Date.now() + '-' + Math.floor(Math.random() * 100000);
    const [insertResult] = await pool.query(
        `INSERT INTO Vendedores(EmpresaId, UsuarioIdCreador, Nombre, Estado) VALUES (?, ?, ?, ?);`,
        [empId, usuarioId, nombre, estado]
    );
    return insertResult.insertId;
};

// las cabeceras de prueba se insertan sin lineas: estas pruebas miran el filtro del listado,
// no el inventario. Ventas.VendedorId es un FK RESTRICT, asi que las ventas se borran antes
// que sus vendedores.
const crearVentaSuelta = async ({usuarioId, terceroId, vendedorId = null}) => {
    const [insertResult] = await pool.query(
        `INSERT INTO Ventas(EmpresaId, UsuarioIdCreador, TerceroId, TerceroNombre, VendedorId,
                            TipoVenta, ValorSubtotal, ValorCancelado, ValorSaldo, ValorEfectivo)
         VALUES (1, ?, ?, 'CLIENTE DE PRUEBA CTRL', ?, 'CONTADO', 1000, 1000, 0, 1000);`,
        [usuarioId, terceroId, vendedorId]
    );
    return insertResult.insertId;
};

const limpiar = async (ventaIds, vendedorIds) => {
    for (const id of ventaIds.filter(Boolean)) await pool.query(`DELETE FROM Ventas WHERE Id = ?;`, [id]);
    for (const id of vendedorIds.filter(Boolean)) await pool.query(`DELETE FROM Vendedores WHERE Id = ?;`, [id]);
};

const cuerpoVenta = (terceroId, extra = {}) => ({
    idEmpresa: 1, idTercero: terceroId, TipoVenta: 'CONTADO',
    ValorEfectivo: 1000, ValorDescuento: 0, ValorTransaccion: 0,
    Articulos: [{idArticulo: 1, idBodega: 1, Cantidad: 1, PrecioVentaUnidad: 1000}],
    ...extra
});

test('crear rechaza con 400 un vendedor de otra empresa', async () => {
    const { usuarioId, terceroId } = await traerContexto();
    let vendedorAjenoId;
    try {
        vendedorAjenoId = await crearVendedor(usuarioId, {empId: 2});

        const res = crearResSpy();
        await ventasControllers.crear(
            {body: cuerpoVenta(terceroId, {idVendedor: vendedorAjenoId}), usuario: {Id: usuarioId}},
            res
        );

        assert.equal(res.statusCode, 400);
        assert.match(res.body.msg, /vendedor/i);
    } finally {
        await limpiar([], [vendedorAjenoId]);
    }
});

test('crear rechaza con 400 un vendedor inactivo', async () => {
    const { usuarioId, terceroId } = await traerContexto();
    let vendedorInactivoId;
    try {
        vendedorInactivoId = await crearVendedor(usuarioId, {estado: false});

        const res = crearResSpy();
        await ventasControllers.crear(
            {body: cuerpoVenta(terceroId, {idVendedor: vendedorInactivoId}), usuario: {Id: usuarioId}},
            res
        );

        assert.equal(res.statusCode, 400);
        assert.match(res.body.msg, /vendedor/i);
    } finally {
        await limpiar([], [vendedorInactivoId]);
    }
});

test('crear rechaza con 400 un idVendedor que no existe', async () => {
    const { usuarioId, terceroId } = await traerContexto();

    const res = crearResSpy();
    await ventasControllers.crear(
        {body: cuerpoVenta(terceroId, {idVendedor: 99999999}), usuario: {Id: usuarioId}},
        res
    );

    assert.equal(res.statusCode, 400);
    assert.match(res.body.msg, /vendedor/i);
});

test('listarTodas con un idVendedor trae solo las ventas de ese vendedor', async () => {
    const { usuarioId, terceroId } = await traerContexto();
    let primeroId, segundoId, ventaSin, ventaPrimero, ventaSegundo;
    try {
        primeroId = await crearVendedor(usuarioId);
        segundoId = await crearVendedor(usuarioId);
        ventaSin = await crearVentaSuelta({usuarioId, terceroId});
        ventaPrimero = await crearVentaSuelta({usuarioId, terceroId, vendedorId: primeroId});
        ventaSegundo = await crearVentaSuelta({usuarioId, terceroId, vendedorId: segundoId});

        const res = crearResSpy();
        await ventasControllers.listarTodas({body: {idEmpresa: 1, pagina: 1, idVendedor: primeroId}}, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.cantData, 1);
        assert.deepEqual(res.body.data.map(v => Number(v.ventaId)), [Number(ventaPrimero)]);
        assert.ok(!res.body.data.some(v => Number(v.ventaId) === Number(ventaSegundo)));
        assert.ok(!res.body.data.some(v => Number(v.ventaId) === Number(ventaSin)));
    } finally {
        await limpiar([ventaSin, ventaPrimero, ventaSegundo], [primeroId, segundoId]);
    }
});

test('listarTodas con idVendedor -1 trae solo las ventas sin vendedor', async () => {
    const { usuarioId, terceroId } = await traerContexto();
    let vendedorId, ventaSin, ventaCon;
    try {
        vendedorId = await crearVendedor(usuarioId);
        ventaSin = await crearVentaSuelta({usuarioId, terceroId});
        ventaCon = await crearVentaSuelta({usuarioId, terceroId, vendedorId});

        const res = crearResSpy();
        await ventasControllers.listarTodas({body: {idEmpresa: 1, pagina: 1, idVendedor: -1}}, res);

        assert.equal(res.statusCode, 200);
        const ids = res.body.data.map(v => Number(v.ventaId));
        assert.ok(ids.includes(Number(ventaSin)));
        assert.ok(!ids.includes(Number(ventaCon)));
        assert.deepEqual(res.body.data.filter(v => v.ventaVendedorId !== null), []);
    } finally {
        await limpiar([ventaSin, ventaCon], [vendedorId]);
    }
});

test('listarTodas sin idVendedor trae las ventas con y sin vendedor', async () => {
    const { usuarioId, terceroId } = await traerContexto();
    let vendedorId, ventaSin, ventaCon;
    try {
        vendedorId = await crearVendedor(usuarioId);
        ventaSin = await crearVentaSuelta({usuarioId, terceroId});
        ventaCon = await crearVentaSuelta({usuarioId, terceroId, vendedorId});

        const res = crearResSpy();
        await ventasControllers.listarTodas({body: {idEmpresa: 1, pagina: 1}}, res);

        assert.equal(res.statusCode, 200);
        // las dos acaban de crearse: con ORDER BY FechaCreacion DESC, Id DESC encabezan la pagina 1
        const ids = res.body.data.map(v => Number(v.ventaId));
        assert.ok(ids.includes(Number(ventaSin)));
        assert.ok(ids.includes(Number(ventaCon)));
        assert.equal(res.body.cantData, await Ventas.contarTodo({pEmpId: 1, pVendedorId: 0}));
    } finally {
        await limpiar([ventaSin, ventaCon], [vendedorId]);
    }
});

test('listarTodas devuelve el nombre del vendedor en ventaVendedor', async () => {
    const { usuarioId, terceroId } = await traerContexto();
    let vendedorId, ventaId;
    try {
        vendedorId = await crearVendedor(usuarioId);
        const [nombreRows] = await pool.query(`SELECT Nombre FROM Vendedores WHERE Id = ?;`, [vendedorId]);
        ventaId = await crearVentaSuelta({usuarioId, terceroId, vendedorId});

        const res = crearResSpy();
        await ventasControllers.listarTodas({body: {idEmpresa: 1, pagina: 1, idVendedor: vendedorId}}, res);

        assert.equal(res.body.data[0].ventaVendedor, nombreRows[0].Nombre);
        assert.equal(Number(res.body.data[0].ventaVendedorId), Number(vendedorId));
    } finally {
        await limpiar([ventaId], [vendedorId]);
    }
});
