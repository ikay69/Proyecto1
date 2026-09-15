import { pool } from '../Database/config.js';

const OrdenesProduccion = {
    //recibe la conexion de la transaccion del llamador (Helpers/produccionService.js): la orden
    //y todos sus movimientos deben confirmarse o revertirse juntos.
    async crear(connection, {pEmpId,pUsuId,pObservaciones}){
        const [rows] = await connection.query(
            `INSERT INTO OrdenesProduccion(EmpresaId, UsuarioIdCreador, Observaciones) VALUES(?,?,?)`,
            [pEmpId,pUsuId,pObservaciones]
        );
        return rows.insertId;
    },

    async traerTodo({pEmpId,pOffset}){
        const [rows] = await pool.query(
            `SELECT Id AS ordId, FechaCreacion AS ordFecha, Observaciones AS ordObservaciones
            FROM OrdenesProduccion
            WHERE EmpresaId = ?
            ORDER BY FechaCreacion DESC
            LIMIT 50 OFFSET ?;`,
            [pEmpId,pOffset]
        );
        return rows || [];
    },

    async contarTodo({pEmpId}){
        const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM OrdenesProduccion WHERE EmpresaId = ?;`, [pEmpId]);
        return rows[0].total;
    },

    async traerPorId({pEmpId,pId}){
        const [rows] = await pool.query(
            `SELECT Id AS ordId, FechaCreacion AS ordFecha, Observaciones AS ordObservaciones
            FROM OrdenesProduccion WHERE EmpresaId = ? AND Id = ?;`,
            [pEmpId,pId]
        );
        return rows[0] || null;
    }
};

export default OrdenesProduccion;
