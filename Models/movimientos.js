import { pool } from '../Database/config.js';

const Movimientos = {
    async insertar(connection, {pEmpId,pUsuId,pArticuloId,pTipoMovimiento,pBolsaEstado,pPropietarioId,pCantidad,pCostoUnitario,pMotivo,pTipoOrigen,pOrigenId,pObservaciones}){
        const [rows] = await connection.query(
            `INSERT INTO Movimientos(
                EmpresaId, UsuarioIdCreador, ArticuloId, TipoMovimiento, BolsaEstado,
                PropietarioId, Cantidad, CostoUnitario, Motivo, TipoOrigen, OrigenId, Observaciones)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
            [pEmpId,pUsuId,pArticuloId,pTipoMovimiento,pBolsaEstado,pPropietarioId,pCantidad,pCostoUnitario,pMotivo,pTipoOrigen,pOrigenId,pObservaciones]
        );
        return rows.insertId;
    },

    async traerKardex({pEmpId,pArticuloId,pFechaInicio,pFechaFin,pOffset}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `SELECT * FROM (
                SELECT
                    m.Id AS movId, m.FechaMovimiento AS movFecha, m.TipoMovimiento AS movTipo,
                    m.BolsaEstado AS movBolsa, m.PropietarioId AS movPropietarioId,
                    t.Nombre AS movPropietarioNombre, m.Cantidad AS movCantidad,
                    m.CostoUnitario AS movCosto, m.Motivo AS movMotivo,
                    m.TipoOrigen AS movTipoOrigen, m.OrigenId AS movOrigenId,
                    m.Observaciones AS movObservaciones, u.Nombres AS movUsuario,
                    SUM(CASE WHEN m.TipoMovimiento = 'SALIDA' THEN -m.Cantidad ELSE m.Cantidad END)
                        OVER (ORDER BY m.FechaMovimiento ASC, m.Id ASC) AS movSaldo
                FROM Movimientos m
                    LEFT JOIN Terceros t ON t.Id = m.PropietarioId
                    LEFT JOIN Usuarios u ON u.Id = m.UsuarioIdCreador
                WHERE m.EmpresaId = ? AND m.ArticuloId = ?
                    AND m.FechaMovimiento BETWEEN ? AND ?
            ) AS kardex
            ORDER BY movFecha ASC, movId ASC
            LIMIT 50 OFFSET ?;`,
            [pEmpId,pArticuloId,pFechaInicio,pFechaFin,pOffset]
        );
        return rows || [];
    },

    async contarKardexFiltro({pEmpId,pArticuloId,pFechaInicio,pFechaFin}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `SELECT COUNT(*) AS total FROM Movimientos
            WHERE EmpresaId = ? AND ArticuloId = ?
                AND FechaMovimiento BETWEEN ? AND ?;`,
            [pEmpId,pArticuloId,pFechaInicio,pFechaFin]
        );
        return rows[0].total;
    },

    async traerPorOrigen({pEmpId,pTipoOrigen,pOrigenId}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `SELECT
                m.Id AS movId, m.ArticuloId AS movArticuloId, a.Nombre AS movArticuloNombre,
                m.TipoMovimiento AS movTipo, m.BolsaEstado AS movBolsa,
                m.Cantidad AS movCantidad, m.CostoUnitario AS movCosto
            FROM Movimientos m
                LEFT JOIN Articulos a ON a.Id = m.ArticuloId
            WHERE m.EmpresaId = ? AND m.TipoOrigen = ? AND m.OrigenId = ?
            ORDER BY m.Id ASC;`,
            [pEmpId,pTipoOrigen,pOrigenId]
        );
        return rows || [];
    }
};

export default Movimientos;
