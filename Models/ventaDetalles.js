import { pool } from '../Database/config.js';

const VentaDetalles = {
    //recibe la conexion de la transaccion del llamador (Helpers/ventaService.js): inserta
    //todas las lineas de una venta ya deduplicadas por articulo.
    async crearVarias(connection, {pEmpId, pVentaId, lineas}){
        const valores = lineas.map(l => [pEmpId, pVentaId, l.ArticuloId, l.ArticuloNombre, l.Cantidad, l.PrecioVentaUnidad]);
        await connection.query(
            `INSERT INTO VentaDetalles(EmpresaId, VentaId, ArticuloId, ArticuloNombre, Cantidad, PrecioVentaUnidad)
             VALUES ?;`,
            [valores]
        );
    },

    async traerPorVenta({pEmpId, pVentaId}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `SELECT
                ArticuloId AS detArticuloId,
                ArticuloNombre AS detArticuloNombre,
                Cantidad AS detCantidad,
                PrecioVentaUnidad AS detPrecioVentaUnidad
            FROM VentaDetalles
            WHERE EmpresaId = ? AND VentaId = ?;`,
            [pEmpId, pVentaId]
        );
        return rows || [];
    }
};

export default VentaDetalles;
