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
