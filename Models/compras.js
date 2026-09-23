import { pool } from '../Database/config.js';

const Compras = {
    //recibe la conexion de la transaccion del llamador (Helpers/compraService.js): la compra,
    //sus lineas, los articulos que se den de alta y los movimientos de inventario deben
    //confirmarse o revertirse juntos.
    async crear(connection, {
        pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
        pNumeroDocumentoSoporte, pTipoCompra, pValorSubtotal, pValorDescuento, pValorCancelado,
        pValorSaldo, pValorEfectivo, pValorTransaccion,
        //los tres campos del credito llevan default null para que una compra de contado no
        //tenga que nombrarlos.
        pFechaCompromiso = null, pNumeroCuotas = null, pValorCuota = null
    }){
        const [rows] = await connection.query(
            `INSERT INTO Compras(
                EmpresaId, UsuarioIdCreador, TerceroId, TerceroTipoDoc, TerceroNumeroDoc, TerceroNombre,
                NumeroDocumentoSoporte, TipoCompra, ValorSubtotal, ValorDescuento, ValorCancelado,
                ValorSaldo, ValorEfectivo, ValorTransaccion,
                FechaCompromiso, NumeroCuotas, ValorCuota)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
             pNumeroDocumentoSoporte, pTipoCompra, pValorSubtotal, pValorDescuento, pValorCancelado,
             pValorSaldo, pValorEfectivo, pValorTransaccion,
             pFechaCompromiso, pNumeroCuotas, pValorCuota]
        );
        return rows.insertId;
    },

    //la unica operacion correctiva sobre una compra: no existe edicion. Una compra ya movio
    //existencias y ya recalculo el costo promedio de una o varias bolsas; reescribirla
    //exigiria revertir y reaplicar ese costeo, que es donde el inventario se corrompe callado.
    //
    //NO revierte movimientos, ni existencias, ni el costo promedio, ni la caja. Hoy el usuario
    //corrige a mano por Ajustes. ESTE es el punto de enganche para cuando se construya la
    //reversion automatica: ahi este UPDATE se envuelve en una transaccion junto con las
    //llamadas a registrarMovimiento de tipo SALIDA.
    //
    //El AND Estado = TRUE hace la operacion idempotente EN LA BASE: anular dos veces devuelve
    //affectedRows 0 la segunda, sin la ventana de carrera que tendria un SELECT de chequeo
    //seguido del UPDATE. El llamador distingue "no existe" de "ya estaba anulada" leyendo la
    //compra antes.
    async anular({pEmpId, pId, pUsuId, pMotivo}, connWrapper = pool){
        const [resultado] = await connWrapper.query(
            `UPDATE Compras
                SET Estado = FALSE, MotivoAnulacion = ?, UsuarioIdAnulador = ?, FechaAnulacion = NOW()
              WHERE Id = ? AND EmpresaId = ? AND Estado = TRUE;`,
            [pMotivo, pUsuId, pId, pEmpId]
        );
        return resultado.affectedRows;
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
                c.Id                AS compraId, 
                c.FechaCreacion     AS compraFecha, 
                c.TerceroNombre     AS compraTercero,
                c.NumeroDocumentoSoporte AS compraDocumentoSoporte,
                c.TipoCompra        AS compraTipoCompra,
                c.FechaCompromiso   AS compraFechaCompromiso, 
                c.NumeroCuotas      AS compraNumeroCuotas,
                c.ValorSubtotal     AS compraSubtotal,
                c.ValorDescuento    AS compraDescuento, 
                c.ValorCancelado    AS compraCancelado,
                c.ValorSaldo        AS compraSaldo, 
                c.Estado            AS compraEstado
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
                c.FechaCompromiso AS compraFechaCompromiso, c.NumeroCuotas AS compraNumeroCuotas,
                c.ValorCuota AS compraValorCuota,
                c.Estado AS compraEstado, c.MotivoAnulacion AS compraMotivoAnulacion,
                c.FechaAnulacion AS compraFechaAnulacion, ua.Nombres AS compraUsuarioAnulador,
                u.Nombres AS compraUsuario
            FROM Compras c
                LEFT JOIN Usuarios u  ON u.Id  = c.UsuarioIdCreador
                LEFT JOIN Usuarios ua ON ua.Id = c.UsuarioIdAnulador
            WHERE c.Id = ? AND c.EmpresaId = ?;`,
            [pId, pEmpId]
        );
        return rows[0] || null;
    }
};

export default Compras;
