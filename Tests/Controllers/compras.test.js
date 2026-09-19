import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../Database/config.js';
import Propiedades from '../../Models/propiedades.js';
import comprasControllers from '../../Controllers/compras.js';

// comprasControllers.crear se invoca directo, sin pasar por Express/JWT: la ruta real ya delega
// toda la logica de negocio en este metodo, y llamarlo directo alcanza para probar el Finding 1
// (el boundary check de las Propiedades de un ArticuloNuevo) sin montar un servidor HTTP.

// stub minimo de Response: solo lo que el Controller usa (status().json()).
const crearResSpy = () => {
    const res = {statusCode: null, body: null};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    return res;
};

const limpiarArticulo = async (articuloId) => {
    if (!articuloId) return;
    await pool.query(`DELETE FROM Movimientos WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM Existencias WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM ArticuloPropiedades WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM CompraDetalles WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM Articulos WHERE Id = ?;`, [articuloId]);
};

test('rechaza con 401 un ArticuloNuevo cuya Propiedad pertenece a otra empresa', async () => {
    const [usuarioRows] = await pool.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    const [terceroRows] = await pool.query(`SELECT Id FROM Terceros WHERE EmpresaId = 1 LIMIT 1;`);
    const [productoRows] = await pool.query(`SELECT Id FROM Productos WHERE EmpresaId = 1 LIMIT 1;`);
    const [bodegaRows] = await pool.query(`SELECT Id FROM Bodegas WHERE EmpresaId = 1 AND Estado = 1 LIMIT 1;`);
    if (usuarioRows.length === 0 || terceroRows.length === 0 || productoRows.length === 0 || bodegaRows.length === 0) {
        throw new Error('Se requieren datos base (Usuario, Tercero, Producto, Bodega) de la empresa 1 para esta prueba');
    }

    let propiedadAjenaId = null;
    const nombreArticulo = 'ARTICULO PRUEBA PROPIEDAD AJENA';
    try {
        // Propiedad que pertenece a la empresa 2, no a la 1 que hace la compra: simula
        // exactamente el escenario del Finding 1 (fk_articulopropiedades_propiedad referencia
        // Propiedades.Id de forma global, sin acotar por empresa).
        propiedadAjenaId = await Propiedades.crear({
            pEmpId: 2, pUsuIdCrea: usuarioRows[0].Id, pNombre: 'PROPIEDAD AJENA DE PRUEBA', pTipoDato: 'TEXTO'
        });

        const req = {
            usuario: {Id: usuarioRows[0].Id},
            body: {
                idEmpresa: 1, idTercero: terceroRows[0].Id, TipoCompra: 'CONTADO',
                NumeroDocumentoSoporte: null, ValorDescuento: 0, ValorEfectivo: 180000, ValorTransaccion: 0,
                Articulos: [{
                    idBodega: bodegaRows[0].Id, Cantidad: 1, CostoUnidad: 180000,
                    ArticuloNuevo: {
                        idProducto: productoRows[0].Id, Nombre: nombreArticulo, Descripcion: null,
                        Propiedades: [{idPropiedad: propiedadAjenaId, Valor: 'x'}]
                    }
                }]
            }
        };
        const res = crearResSpy();

        await comprasControllers.crear(req, res);

        assert.equal(res.statusCode, 401);
        assert.equal(res.body.msg, 'Propiedad inválida');

        // sin el boundary check la compra se habria confirmado: el articulo NO debe existir
        const [articulosCreados] = await pool.query(`SELECT Id FROM Articulos WHERE Nombre = ?;`, [nombreArticulo]);
        assert.equal(articulosCreados.length, 0);
    } finally {
        const [restos] = await pool.query(`SELECT Id FROM Articulos WHERE Nombre = ?;`, [nombreArticulo]);
        for (const resto of restos) {
            const [detalleRows] = await pool.query(`SELECT CompraId FROM CompraDetalles WHERE ArticuloId = ?;`, [resto.Id]);
            await limpiarArticulo(resto.Id);
            for (const detalle of detalleRows) {
                await pool.query(`DELETE FROM Compras WHERE Id = ?;`, [detalle.CompraId]);
            }
        }
        if (propiedadAjenaId) {
            await pool.query(`DELETE FROM Propiedades WHERE Id = ?;`, [propiedadAjenaId]);
        }
    }
});
