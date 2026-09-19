import { pool } from '../Database/config.js';

const CompraDetalles = {
    //recibe la conexion de la transaccion del llamador (Helpers/compraService.js): inserta
    //todas las lineas de una compra ya agrupadas por articulo+bodega.
    async crearVarias(connection, {pEmpId, pCompraId, lineas}){
        const valores = lineas.map(l => [pEmpId, pCompraId, l.BodegaId, l.ArticuloId, l.ArticuloNombre, l.Cantidad, l.CostoUnidad]);
        await connection.query(
            `INSERT INTO CompraDetalles(EmpresaId, CompraId, BodegaId, ArticuloId, ArticuloNombre, Cantidad, CostoUnidad)
             VALUES ?;`,
            [valores]
        );
    },

    async traerPorCompra({pEmpId, pCompraId}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `SELECT
                cd.ArticuloId AS detArticuloId,
                cd.ArticuloNombre AS detArticuloNombre,
                cd.BodegaId AS detBodegaId,
                bo.Nombre AS detBodegaNombre,
                cd.Cantidad AS detCantidad,
                cd.CostoUnidad AS detCostoUnidad
            FROM CompraDetalles cd
                LEFT JOIN Bodegas bo ON bo.Id = cd.BodegaId
            WHERE cd.EmpresaId = ? AND cd.CompraId = ?;`,
            [pEmpId, pCompraId]
        );
        return rows || [];
    }
};

export default CompraDetalles;
