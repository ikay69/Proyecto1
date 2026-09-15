import { pool } from '../Database/config.js';

const Existencias = {
    async traerBolsaBloqueada(connection, {pEmpId,pArticuloId,pBolsaEstado,pPropietarioId}){
        const [rows] = await connection.query(
            `SELECT Id, Cantidad FROM Existencias
            WHERE EmpresaId = ? AND ArticuloId = ? AND BolsaEstado = ? AND PropietarioId <=> ?
            FOR UPDATE;`,
            [pEmpId,pArticuloId,pBolsaEstado,pPropietarioId]
        );
        return rows[0] || null;
    },

    async upsertCantidad(connection, {pEmpId,pArticuloId,pBolsaEstado,pPropietarioId,pDelta}){
        await connection.query(
            `INSERT INTO Existencias (EmpresaId, ArticuloId, BolsaEstado, PropietarioId, Cantidad)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE Cantidad = Cantidad + VALUES(Cantidad);`,
            [pEmpId,pArticuloId,pBolsaEstado,pPropietarioId,pDelta]
        );
    },

    async traerBolsasPorArticulo({pEmpId,pArticuloId}, connection = pool){
        const [rows] = await connection.query(
            `SELECT
                e.BolsaEstado AS existBolsa,
                e.PropietarioId AS existPropietarioId,
                t.Nombre AS existPropietarioNombre,
                e.Cantidad AS existCantidad
            FROM Existencias e
                LEFT JOIN Terceros t ON t.Id = e.PropietarioId
            WHERE e.EmpresaId = ? AND e.ArticuloId = ? AND e.Cantidad > 0;`,
            [pEmpId,pArticuloId]
        );
        return rows || [];
    },

    async traerTodo({pEmpId,pBolsaEstado,pOffset,pTexto}){
        const [rows] = await pool.query(
            `SELECT
                e.Id AS existId,
                a.CodigoSKU AS existSKU,
                a.Nombre AS existArticuloNombre,
                e.BolsaEstado AS existBolsa,
                e.PropietarioId AS existPropietarioId,
                t.Nombre AS existPropietarioNombre,
                e.Cantidad AS existCantidad,
                e.FechaActualizacion AS existFecha
            FROM Existencias e
                LEFT JOIN Articulos a ON a.Id = e.ArticuloId
                LEFT JOIN Terceros t ON t.Id = e.PropietarioId
            WHERE e.EmpresaId = ?
                AND e.Cantidad > 0
                AND (? = '' OR e.BolsaEstado = ?)
                AND (a.Nombre LIKE ? OR a.CodigoSKU LIKE ?)
            ORDER BY e.FechaActualizacion DESC
            LIMIT 50 OFFSET ?;`,
            [pEmpId, pBolsaEstado, pBolsaEstado, pTexto, pTexto, pOffset]
        );
        return rows || [];
    },

    async contarTodoFiltro({pEmpId,pBolsaEstado,pTexto}){
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS total
            FROM Existencias e
                LEFT JOIN Articulos a ON a.Id = e.ArticuloId
            WHERE e.EmpresaId = ?
                AND e.Cantidad > 0
                AND (? = '' OR e.BolsaEstado = ?)
                AND (a.Nombre LIKE ? OR a.CodigoSKU LIKE ?);`,
            [pEmpId, pBolsaEstado, pBolsaEstado, pTexto, pTexto]
        );
        return rows[0].total;
    }
};

export default Existencias;
