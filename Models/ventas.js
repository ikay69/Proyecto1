import { pool } from '../Database/config.js';

const Ventas = {
    //recibe la conexion de la transaccion del llamador (Helpers/ventaService.js): la venta,
    //sus lineas y los movimientos de inventario deben confirmarse o revertirse juntos.
    async crear(connection, {
        pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
        pTipoVenta, pValorSubtotal, pValorDescuento, pValorCancelado, pValorSaldo,
        pValorEfectivo, pValorTransaccion
    }){
        const [rows] = await connection.query(
            `INSERT INTO Ventas(
                EmpresaId, UsuarioIdCreador, TerceroId, TerceroTipoDoc, TerceroNumeroDoc, TerceroNombre,
                TipoVenta, ValorSubtotal, ValorDescuento, ValorCancelado, ValorSaldo, ValorEfectivo, ValorTransaccion)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
             pTipoVenta, pValorSubtotal, pValorDescuento, pValorCancelado, pValorSaldo, pValorEfectivo, pValorTransaccion]
        );
        return rows.insertId;
    },

    async traerTodo({pEmpId, pOffset}){
        const [rows] = await pool.query(
            `SELECT
                v.Id AS ventaId, v.FechaCreacion AS ventaFecha, v.TerceroNombre AS ventaTercero,
                v.TipoVenta AS ventaTipoVenta, v.ValorSubtotal AS ventaSubtotal,
                v.ValorDescuento AS ventaDescuento, v.ValorCancelado AS ventaCancelado,
                v.ValorSaldo AS ventaSaldo, v.Estado AS ventaEstado
            FROM Ventas v
            WHERE v.EmpresaId = ?
            ORDER BY v.FechaCreacion DESC
            LIMIT 50 OFFSET ?;`,
            [pEmpId, pOffset]
        );
        return rows || [];
    },

    async contarTodo({pEmpId}){
        const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM Ventas WHERE EmpresaId = ?;`, [pEmpId]);
        return rows[0].total;
    },

    async traerPorId({pEmpId, pId}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `SELECT
                v.Id AS ventaId, v.FechaCreacion AS ventaFecha, v.TerceroId AS ventaTerceroId,
                v.TerceroTipoDoc AS ventaTerceroTipoDoc, v.TerceroNumeroDoc AS ventaTerceroNumeroDoc,
                v.TerceroNombre AS ventaTercero, v.TipoVenta AS ventaTipoVenta,
                v.ValorSubtotal AS ventaSubtotal, v.ValorDescuento AS ventaDescuento,
                v.ValorCancelado AS ventaCancelado, v.ValorSaldo AS ventaSaldo,
                v.ValorEfectivo AS ventaEfectivo, v.ValorTransaccion AS ventaTransaccion,
                v.Estado AS ventaEstado, u.Nombres AS ventaUsuario
            FROM Ventas v
                LEFT JOIN Usuarios u ON u.Id = v.UsuarioIdCreador
            WHERE v.Id = ? AND v.EmpresaId = ?;`,
            [pId, pEmpId]
        );
        return rows[0] || null;
    }
};

export default Ventas;
