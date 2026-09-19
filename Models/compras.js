import { pool } from '../Database/config.js';

const Compras = {
    //recibe la conexion de la transaccion del llamador (Helpers/compraService.js): la compra,
    //sus lineas, los articulos que se den de alta y los movimientos de inventario deben
    //confirmarse o revertirse juntos.
    async crear(connection, {
        pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
        pNumeroDocumentoSoporte, pTipoCompra, pValorSubtotal, pValorDescuento, pValorCancelado,
        pValorSaldo, pValorEfectivo, pValorTransaccion
    }){
        const [rows] = await connection.query(
            `INSERT INTO Compras(
                EmpresaId, UsuarioIdCreador, TerceroId, TerceroTipoDoc, TerceroNumeroDoc, TerceroNombre,
                NumeroDocumentoSoporte, TipoCompra, ValorSubtotal, ValorDescuento, ValorCancelado,
                ValorSaldo, ValorEfectivo, ValorTransaccion)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
             pNumeroDocumentoSoporte, pTipoCompra, pValorSubtotal, pValorDescuento, pValorCancelado,
             pValorSaldo, pValorEfectivo, pValorTransaccion]
        );
        return rows.insertId;
    },

    //FechaCreacion es un TIMESTAMP con granularidad de segundo: varias compras del mismo segundo
    //no tienen orden definido entre si, y sin desempate una misma fila puede repetirse o
    //desaparecer al cambiar de pagina. c.Id DESC lo vuelve determinista.
    //connWrapper = pool sigue el mismo patron que traerPorId: por defecto usa el pool, pero
    //las pruebas que corren dentro de withRollback le pasan la conexion de su propia
    //transaccion, porque de lo contrario el pool (otra conexion) jamas veria filas todavia sin
    //confirmar.
    async traerTodo({pEmpId, pOffset}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `SELECT
                c.Id AS compraId, c.FechaCreacion AS compraFecha, c.TerceroNombre AS compraTercero,
                c.NumeroDocumentoSoporte AS compraDocumentoSoporte,
                c.TipoCompra AS compraTipoCompra, c.ValorSubtotal AS compraSubtotal,
                c.ValorDescuento AS compraDescuento, c.ValorCancelado AS compraCancelado,
                c.ValorSaldo AS compraSaldo, c.Estado AS compraEstado
            FROM Compras c
            WHERE c.EmpresaId = ?
            ORDER BY c.FechaCreacion DESC, c.Id DESC
            LIMIT 50 OFFSET ?;`,
            [pEmpId, pOffset]
        );
        return rows || [];
    },

    async contarTodo({pEmpId}, connWrapper = pool){
        const [rows] = await connWrapper.query(`SELECT COUNT(*) AS total FROM Compras WHERE EmpresaId = ?;`, [pEmpId]);
        return rows[0].total;
    },

    async traerPorId({pEmpId, pId}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `SELECT
                c.Id AS compraId, c.FechaCreacion AS compraFecha, c.TerceroId AS compraTerceroId,
                c.TerceroTipoDoc AS compraTerceroTipoDoc, c.TerceroNumeroDoc AS compraTerceroNumeroDoc,
                c.TerceroNombre AS compraTercero, c.NumeroDocumentoSoporte AS compraDocumentoSoporte,
                c.TipoCompra AS compraTipoCompra,
                c.ValorSubtotal AS compraSubtotal, c.ValorDescuento AS compraDescuento,
                c.ValorCancelado AS compraCancelado, c.ValorSaldo AS compraSaldo,
                c.ValorEfectivo AS compraEfectivo, c.ValorTransaccion AS compraTransaccion,
                c.Estado AS compraEstado, u.Nombres AS compraUsuario
            FROM Compras c
                LEFT JOIN Usuarios u ON u.Id = c.UsuarioIdCreador
            WHERE c.Id = ? AND c.EmpresaId = ?;`,
            [pId, pEmpId]
        );
        return rows[0] || null;
    }
};

export default Compras;
