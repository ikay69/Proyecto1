import { pool } from '../Database/config.js';

const VentaDetalles = {
    //recibe la conexion de la transaccion del llamador (Helpers/ventaService.js): inserta
    //todas las lineas de una venta ya deduplicadas por articulo+bodega.
    async crearVarias(connection, {pEmpId, pVentaId, lineas}){
        const valores = lineas.map(l => [pEmpId, pVentaId, l.BodegaId, l.ArticuloId, l.ArticuloNombre, l.Cantidad, l.PrecioVentaUnidad]);
        await connection.query(
            `INSERT INTO VentaDetalles(EmpresaId, VentaId, BodegaId, ArticuloId, ArticuloNombre, Cantidad, PrecioVentaUnidad)
             VALUES ?;`,
            [valores]
        );
    },

    async traerPorVenta({pEmpId, pVentaId}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `SELECT
                vd.ArticuloId AS detArticuloId,
                vd.ArticuloNombre AS detArticuloNombre,
                vd.BodegaId AS detBodegaId,
                bo.Nombre AS detBodegaNombre,
                vd.Cantidad AS detCantidad,
                vd.PrecioVentaUnidad AS detPrecioVentaUnidad
            FROM VentaDetalles vd
                LEFT JOIN Bodegas bo ON bo.Id = vd.BodegaId
            WHERE vd.EmpresaId = ? AND vd.VentaId = ?;`,
            [pEmpId, pVentaId]
        );
        return rows || [];
    }
};

export default VentaDetalles;
