import { pool } from '../Database/config.js';

const Movimientos = {
    async insertar(connection, {pEmpId,pUsuId,pBodegaId,pArticuloId,pTipoMovimiento,pBolsaEstado,pPropietarioId,pCantidad,pCostoUnitario,pMotivo,pTipoOrigen,pOrigenId,pObservaciones}){
        const [rows] = await connection.query(
            `INSERT INTO Movimientos(
                EmpresaId, UsuarioIdCreador, BodegaId, ArticuloId, TipoMovimiento, BolsaEstado,
                PropietarioId, Cantidad, CostoUnitario, Motivo, TipoOrigen, OrigenId, Observaciones)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [pEmpId,pUsuId,pBodegaId,pArticuloId,pTipoMovimiento,pBolsaEstado,pPropietarioId,pCantidad,pCostoUnitario,pMotivo,pTipoOrigen,pOrigenId,pObservaciones]
        );
        return rows.insertId;
    },

    //pBodegaId es opcional (cadena vacia = todas las bodegas del articulo, saldo combinado).
    //Cuando se filtra por bodega, el saldo corriente (movSaldo) queda calculado SOLO sobre esa
    //bodega: el WHERE se aplica antes de la funcion de ventana, asi que el saldo nunca mezcla
    //movimientos de otras bodegas.
    async traerKardex({pEmpId,pBodegaId,pArticuloId,pFechaInicio,pFechaFin,pOffset}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `SELECT * FROM (
                SELECT
                    m.Id AS movId, m.FechaMovimiento AS movFecha, m.TipoMovimiento AS movTipo,
                    m.BodegaId AS movBodegaId, bo.Nombre AS movBodegaNombre,
                    m.BolsaEstado AS movBolsa, m.PropietarioId AS movPropietarioId,
                    t.Nombre AS movPropietarioNombre, m.Cantidad AS movCantidad,
                    m.CostoUnitario AS movCosto, m.Motivo AS movMotivo,
                    m.TipoOrigen AS movTipoOrigen, m.OrigenId AS movOrigenId,
                    m.Observaciones AS movObservaciones, u.Nombres AS movUsuario,
                    SUM(CASE WHEN m.TipoMovimiento = 'SALIDA' THEN -m.Cantidad ELSE m.Cantidad END)
                        OVER (ORDER BY m.FechaMovimiento ASC, m.Id ASC) AS movSaldo
                FROM Movimientos m
                    LEFT JOIN Bodegas bo ON bo.Id = m.BodegaId
                    LEFT JOIN Terceros t ON t.Id = m.PropietarioId
                    LEFT JOIN Usuarios u ON u.Id = m.UsuarioIdCreador
                WHERE m.EmpresaId = ? AND m.ArticuloId = ?
                    AND (? = '' OR m.BodegaId = ?)
                    AND m.FechaMovimiento BETWEEN ? AND ?
            ) AS kardex
            ORDER BY movFecha ASC, movId ASC
            LIMIT 50 OFFSET ?;`,
            [pEmpId,pArticuloId,pBodegaId,pBodegaId,pFechaInicio,pFechaFin,pOffset]
        );
        return rows || [];
    },

    async contarKardexFiltro({pEmpId,pBodegaId,pArticuloId,pFechaInicio,pFechaFin}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `SELECT COUNT(*) AS total FROM Movimientos
            WHERE EmpresaId = ? AND ArticuloId = ?
                AND (? = '' OR BodegaId = ?)
                AND FechaMovimiento BETWEEN ? AND ?;`,
            [pEmpId,pArticuloId,pBodegaId,pBodegaId,pFechaInicio,pFechaFin]
        );
        return rows[0].total;
    },

    async traerPorOrigen({pEmpId,pTipoOrigen,pOrigenId}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `SELECT
                m.Id AS movId, m.ArticuloId AS movArticuloId, a.Nombre AS movArticuloNombre,
                m.BodegaId AS movBodegaId, m.TipoMovimiento AS movTipo, m.BolsaEstado AS movBolsa,
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
