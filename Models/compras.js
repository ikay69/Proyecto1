import { pool } from '../Database/config.js';

//---- filtros del listado paginado ----
//
//Los predicados se arman en JavaScript y NO como una condicion que el SQL resuelva en tiempo de
//ejecucion (`AND (? = 0 OR c.TerceroId = ?)`). Esa forma devuelve lo mismo en una sola consulta,
//pero envuelve la columna en algo que el optimizador no puede evaluar al planear y deja de usar
//el indice. Misma decision, y por la misma razon, que el filtro de vendedor de Models/ventas.js.
//
//TODOS los de abajo los comparten traerTodo y contarTodo: si se separan, cantData y las paginas
//dejan de cuadrar. Hay pruebas que lo fijan.

//0, ausente o cualquier valor que no sea un id positivo trae las compras de todos los terceros.
//No existe el caso "sin tercero" de Ventas (-1): Compras.TerceroId es NOT NULL.
const filtroTercero = (pTerceroId) => {
    const id = Number(pTerceroId);
    if (id > 0) return {sql: 'AND c.TerceroId = ?', params: [id]};
    return {sql: '', params: []};
};

//el texto filtra por la MISMA columna por la que se ordena, como en el resto de los listados del
//proyecto. '%%' es el "sin filtro" que manda el Controller, y se traduce a NO poner el LIKE en
//lugar de a `LIKE '%%'`: las tres columnas de documento son NULL-ables y `NULL LIKE '%%'` es
//NULL, asi que con el LIKE puesto una compra sin documento soporte desapareceria del listado.
const filtroTexto = (pCampoOrden, pTexto) => {
    if (!pTexto || pTexto === '%%') return {sql: '', params: []};
    return {sql: `AND c.${pCampoOrden} LIKE ?`, params: [pTexto]};
};

//las dos cotas del rango son opcionales e INDEPENDIENTES, asi que no se puede usar un BETWEEN:
//cada una entra por su lado, o no entra. Ambas son INCLUSIVAS (>= y <=); el llamador es quien
//decide que hora lleva cada extremo -- Helpers/fechas.js deja 'YYYY-MM-DD' en 00:00:00 para la
//inferior y en 23:59:59 para la superior, de modo que un dia suelto cubre el dia entero.
//
//Ninguna funcion envuelve la columna: FechaCreacion queda desnuda a un lado de la comparacion,
//que es lo unico que deja usar idx_compras_listado (EmpresaId, FechaCreacion). Un
//DATE(c.FechaCreacion) = ? seria mas corto de escribir y obligaria a recorrer la tabla entera.
const filtroFechas = (pFechaInicio, pFechaFin) => {
    const sql = [];
    const params = [];
    if (pFechaInicio) { sql.push('AND c.FechaCreacion >= ?'); params.push(pFechaInicio); }
    if (pFechaFin)    { sql.push('AND c.FechaCreacion <= ?'); params.push(pFechaFin); }
    return {sql: sql.join(' '), params};
};

//el nombre de una columna no se puede parametrizar: pCampoOrden llega al ORDER BY interpolado.
//El Controller traduce un numero a un nombre y nunca deja pasar texto del cliente, pero al
//modelo tambien lo llaman las pruebas y lo llamara el proximo endpoint: la lista blanca es lo
//que cierra la inyeccion, no la validacion de la ruta.
const COLUMNAS_ORDEN = [
    'NumeroDocumentoSoporte', 'TerceroTipoDoc', 'TerceroNumeroDoc', 'TerceroNombre', 'FechaCreacion'
];
const columnaOrden = (pCampoOrden) => COLUMNAS_ORDEN.includes(pCampoOrden) ? pCampoOrden : 'FechaCreacion';
const sentidoOrden = (pOrden) => (String(pOrden).toUpperCase() === 'ASC' ? 'ASC' : 'DESC');

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

    //Ninguna de las dos columnas por las que se puede ordenar es unica, asi que sin desempate
    //una misma fila puede repetirse o desaparecer al cambiar de pagina. Peor en FechaCreacion,
    //que es un TIMESTAMP con granularidad de segundo: varias compras del mismo segundo no tienen
    //orden definido entre si. c.Id lo vuelve determinista, y va en el MISMO sentido que el orden
    //pedido para que el empate no contradiga lo que el usuario eligio.
    //
    //Los defaults reproducen el contrato anterior a los filtros (FechaCreacion DESC, sin texto y
    //sin tercero), para que los llamadores que solo pasan pEmpId y pOffset sigan funcionando.
    //
    //connWrapper = pool sigue el mismo patron que traerPorId: por defecto usa el pool, pero
    //las pruebas que corren dentro de withRollback le pasan la conexion de su propia
    //transaccion, porque de lo contrario el pool (otra conexion) jamas veria filas todavia sin
    //confirmar.
    async traerTodo({pEmpId, pOffset, pCampoOrden = 'FechaCreacion', pOrden = 'DESC', pTexto = '%%', pTerceroId = 0, pFechaInicio = null, pFechaFin = null}, connWrapper = pool){
        const campo   = columnaOrden(pCampoOrden);
        const sentido = sentidoOrden(pOrden);
        const tercero = filtroTercero(pTerceroId);
        const texto   = filtroTexto(campo, pTexto);
        const fechas  = filtroFechas(pFechaInicio, pFechaFin);

        const [rows] = await connWrapper.query(
            `SELECT
                c.Id                AS compraId,
                c.FechaCreacion     AS compraFecha,
                c.TerceroId         AS compraTerceroId,
                c.TerceroTipoDoc    AS compraTerceroTipoDoc,
                c.TerceroNumeroDoc  AS compraTerceroNumeroDoc,
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
            ${tercero.sql}
            ${texto.sql}
            ${fechas.sql}
            ORDER BY c.${campo} ${sentido}, c.Id ${sentido}
            LIMIT 50 OFFSET ?;`,
            [pEmpId, ...tercero.params, ...texto.params, ...fechas.params, pOffset]
        );
        return rows || [];
    },

    //mismo WHERE que traerTodo, con exactamente los mismos filtros. No lleva ORDER BY: sobre un
    //COUNT(*) no cambia nada.
    async contarTodo({pEmpId, pCampoOrden = 'FechaCreacion', pTexto = '%%', pTerceroId = 0, pFechaInicio = null, pFechaFin = null}, connWrapper = pool){
        const campo   = columnaOrden(pCampoOrden);
        const tercero = filtroTercero(pTerceroId);
        const texto   = filtroTexto(campo, pTexto);
        const fechas  = filtroFechas(pFechaInicio, pFechaFin);

        const [rows] = await connWrapper.query(
            `SELECT COUNT(*) AS total
            FROM Compras c
            WHERE c.EmpresaId = ?
            ${tercero.sql}
            ${texto.sql}
            ${fechas.sql};`,
            [pEmpId, ...tercero.params, ...texto.params, ...fechas.params]
        );
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
