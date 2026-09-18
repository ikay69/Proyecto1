import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../Database/config.js';
import Articulos from '../../Models/articulos.js';
import ArticuloPropiedades from '../../Models/articuloPropiedades.js';

const obtenerProductoYUsuarioDePrueba = async () => {
    const [productoRows] = await pool.query(`SELECT Id FROM Productos WHERE EmpresaId = 1 LIMIT 1;`);
    const [usuarioRows] = await pool.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    if (productoRows.length === 0) throw new Error('Se requiere un Producto en la empresa 1');
    return { productoId: productoRows[0].Id, usuarioId: usuarioRows[0].Id };
};

// Bodegas.Nombre tiene UNIQUE (EmpresaId, Nombre): cada bodega de prueba usa un nombre unico.
const crearBodegaDePrueba = async (usuarioId) => {
    const nombre = `BODEGA PRUEBA ${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const [insertResult] = await pool.query(
        `INSERT INTO Bodegas(EmpresaId, UsuarioIdCreador, Nombre) VALUES (1, ?, ?);`,
        [usuarioId, nombre]
    );
    return insertResult.insertId;
};

test('crear genera un CodigoSKU basado en el Id autogenerado', async () => {
    const { productoId, usuarioId } = await obtenerProductoYUsuarioDePrueba();
    let articuloId;
    try {
        articuloId = await Articulos.crear({
            pEmpId: 1, pUsuIdCrea: usuarioId, pProductoId: productoId,
            pNombre: 'ANILLO DE PRUEBA', pDescripcion: null,
            pPrecioVentaUnitario: null, pPropiedades: []
        });

        const articulo = await Articulos.traerPorId({ pId: articuloId, pEmpId: 1 });

        assert.equal(articulo.artSKU, `ART${String(articuloId).padStart(8,'0')}`);
    } finally {
        if (articuloId) await pool.query(`DELETE FROM Articulos WHERE Id = ?;`, [articuloId]);
    }
});

test('crear guarda las propiedades asociadas', async () => {
    const { productoId, usuarioId } = await obtenerProductoYUsuarioDePrueba();
    const [propiedadRows] = await pool.query(`SELECT Id FROM Propiedades WHERE EmpresaId = 1 LIMIT 1;`);
    if (propiedadRows.length === 0) {
        return; // no hay Propiedades de prueba en esta empresa, se omite
    }

    let articuloId;
    try {
        articuloId = await Articulos.crear({
            pEmpId: 1, pUsuIdCrea: usuarioId, pProductoId: productoId,
            pNombre: 'ANILLO CON PROPIEDADES', pDescripcion: null, pPrecioVentaUnitario: null,
            pPropiedades: [{ idPropiedad: propiedadRows[0].Id, Valor: '7' }]
        });

        const propiedades = await ArticuloPropiedades.traerPorArticulo({ pEmpId: 1, pArticuloId: articuloId });

        assert.equal(propiedades.length, 1);
        assert.equal(propiedades[0].propValor, '7');
    } finally {
        if (articuloId) {
            await pool.query(`DELETE FROM ArticuloPropiedades WHERE ArticuloId = ?;`, [articuloId]);
            await pool.query(`DELETE FROM Articulos WHERE Id = ?;`, [articuloId]);
        }
    }
});

test('editar reemplaza el set de propiedades', async () => {
    const { productoId, usuarioId } = await obtenerProductoYUsuarioDePrueba();
    const [propiedadRows] = await pool.query(`SELECT Id FROM Propiedades WHERE EmpresaId = 1 LIMIT 1;`);
    if (propiedadRows.length === 0) {
        return;
    }

    let articuloId;
    try {
        articuloId = await Articulos.crear({
            pEmpId: 1, pUsuIdCrea: usuarioId, pProductoId: productoId,
            pNombre: 'ANILLO A EDITAR', pDescripcion: null, pPrecioVentaUnitario: null,
            pPropiedades: [{ idPropiedad: propiedadRows[0].Id, Valor: '5' }]
        });

        await Articulos.editar({
            pEmpId: 1, pId: articuloId, pProductoId: productoId,
            pNombre: 'ANILLO EDITADO', pDescripcion: null, pPrecioVentaUnitario: null,
            pVender: true, pEstado: true,
            pPropiedades: [{ idPropiedad: propiedadRows[0].Id, Valor: '9' }]
        });

        const propiedades = await ArticuloPropiedades.traerPorArticulo({ pEmpId: 1, pArticuloId: articuloId });

        assert.equal(propiedades.length, 1);
        assert.equal(propiedades[0].propValor, '9');
    } finally {
        if (articuloId) {
            await pool.query(`DELETE FROM ArticuloPropiedades WHERE ArticuloId = ?;`, [articuloId]);
            await pool.query(`DELETE FROM Articulos WHERE Id = ?;`, [articuloId]);
        }
    }
});

test('traerVendibles solo devuelve articulos Vender=true, Estado=true, con existencia DISPONIBLE > 0 en la bodega consultada', async () => {
    const { productoId, usuarioId } = await obtenerProductoYUsuarioDePrueba();
    const bodegaId = await crearBodegaDePrueba(usuarioId);
    const otraBodegaId = await crearBodegaDePrueba(usuarioId);

    let idVendible, idNoVendible, idSinExistencia, idOtraBodega;
    try {
        idVendible = await Articulos.crear({
            pEmpId:1, pUsuIdCrea:usuarioId, pProductoId:productoId,
            pNombre:'ARTICULO VENDIBLE DE PRUEBA', pDescripcion:null, pPrecioVentaUnitario:100, pPropiedades:[]
        });
        await pool.query(
            `INSERT INTO Existencias(EmpresaId, BodegaId, ArticuloId, BolsaEstado, Cantidad) VALUES (1, ?, ?, 'DISPONIBLE', 5);`,
            [bodegaId, idVendible]
        );

        idNoVendible = await Articulos.crear({
            pEmpId:1, pUsuIdCrea:usuarioId, pProductoId:productoId,
            pNombre:'ARTICULO NO VENDIBLE DE PRUEBA', pDescripcion:null, pPrecioVentaUnitario:100, pPropiedades:[]
        });
        await Articulos.editar({
            pEmpId:1, pId:idNoVendible, pProductoId:productoId,
            pNombre:'ARTICULO NO VENDIBLE DE PRUEBA', pDescripcion:null, pPrecioVentaUnitario:100,
            pVender:false, pEstado:true, pPropiedades:[]
        });
        await pool.query(
            `INSERT INTO Existencias(EmpresaId, BodegaId, ArticuloId, BolsaEstado, Cantidad) VALUES (1, ?, ?, 'DISPONIBLE', 5);`,
            [bodegaId, idNoVendible]
        );

        idSinExistencia = await Articulos.crear({
            pEmpId:1, pUsuIdCrea:usuarioId, pProductoId:productoId,
            pNombre:'ARTICULO SIN EXISTENCIA DE PRUEBA', pDescripcion:null, pPrecioVentaUnitario:100, pPropiedades:[]
        });

        // existencia DISPONIBLE real, pero en OTRA bodega: no debe aparecer al consultar bodegaId
        idOtraBodega = await Articulos.crear({
            pEmpId:1, pUsuIdCrea:usuarioId, pProductoId:productoId,
            pNombre:'ARTICULO EN OTRA BODEGA DE PRUEBA', pDescripcion:null, pPrecioVentaUnitario:100, pPropiedades:[]
        });
        await pool.query(
            `INSERT INTO Existencias(EmpresaId, BodegaId, ArticuloId, BolsaEstado, Cantidad) VALUES (1, ?, ?, 'DISPONIBLE', 5);`,
            [otraBodegaId, idOtraBodega]
        );

        const resultado = await Articulos.traerVendibles({pEmpId:1, pBodegaId:bodegaId, pCampoOrden:'Nombre', pOrden:'ASC', pOffset:0, pTexto:'%%'});
        const ids = resultado.map(r => r.artId);

        assert.ok(ids.includes(idVendible));
        assert.ok(!ids.includes(idNoVendible));
        assert.ok(!ids.includes(idSinExistencia));
        assert.ok(!ids.includes(idOtraBodega));
    } finally {
        for (const id of [idVendible, idNoVendible, idSinExistencia, idOtraBodega]) {
            if (id) {
                await pool.query(`DELETE FROM Existencias WHERE ArticuloId = ?;`, [id]);
                await pool.query(`DELETE FROM Articulos WHERE Id = ?;`, [id]);
            }
        }
        await pool.query(`DELETE FROM Bodegas WHERE Id IN (?,?);`, [bodegaId, otraBodegaId]);
    }
});

test('contarVendiblesFiltro cuenta lo mismo que traerVendibles devuelve', async () => {
    const { productoId, usuarioId } = await obtenerProductoYUsuarioDePrueba();
    const bodegaId = await crearBodegaDePrueba(usuarioId);

    let idVendible;
    try {
        idVendible = await Articulos.crear({
            pEmpId:1, pUsuIdCrea:usuarioId, pProductoId:productoId,
            pNombre:'ARTICULO VENDIBLE PARA CONTEO', pDescripcion:null, pPrecioVentaUnitario:100, pPropiedades:[]
        });
        await pool.query(
            `INSERT INTO Existencias(EmpresaId, BodegaId, ArticuloId, BolsaEstado, Cantidad) VALUES (1, ?, ?, 'DISPONIBLE', 3);`,
            [bodegaId, idVendible]
        );

        const total = await Articulos.contarVendiblesFiltro({pEmpId:1, pBodegaId:bodegaId, pCampoOrden:'Nombre', pTexto:'%VENDIBLE PARA CONTEO%'});
        assert.equal(total, 1);
    } finally {
        if (idVendible) {
            await pool.query(`DELETE FROM Existencias WHERE ArticuloId = ?;`, [idVendible]);
            await pool.query(`DELETE FROM Articulos WHERE Id = ?;`, [idVendible]);
        }
        await pool.query(`DELETE FROM Bodegas WHERE Id = ?;`, [bodegaId]);
    }
});
