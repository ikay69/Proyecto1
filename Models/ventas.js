import { pool } from '../Database/config.js';

//filtro de vendedor del listado: 0 (o ausente) todas, -1 solo las que no tienen vendedor,
//y un id concreto solo las de ese vendedor.
//
//Se arma como texto en vez de resolverse con parametros dentro de una sola consulta:
//un `AND (? = 0 OR (? = -1 AND v.VendedorId IS NULL) OR v.VendedorId = ?)` da el mismo
//resultado, pero deja a MySQL sin poder usar idx_ventas_vendedor -- la columna queda
//envuelta en una condicion que solo se conoce en ejecucion, asi que el optimizador cae a
//un recorrido completo. Con el predicado ya resuelto, cada caso indexa.
//
//-1 nunca se compara contra la columna: VendedorId es BIGINT UNSIGNED y el caso se
//traduce a IS NULL.
const filtroVendedor = (pVendedorId) => {
    const id = Number(pVendedorId);
    if (id === -1) return {sql: 'AND v.VendedorId IS NULL', params: []};
    if (id > 0) return {sql: 'AND v.VendedorId = ?', params: [id]};
    return {sql: '', params: []};
};

const Ventas = {
    //recibe la conexion de la transaccion del llamador (Helpers/ventaService.js): la venta,
    //sus lineas y los movimientos de inventario deben confirmarse o revertirse juntos.
    //
    //pVendedorId es opcional y por defecto NULL: una venta puede no tener vendedor asignado,
    //y el default explicito importa porque mysql2 lanza si se le pasa undefined.
    async crear(connection, {
        pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
        pVendedorId = null,
        pTipoVenta, pValorSubtotal, pValorDescuento, pValorCancelado, pValorSaldo,
        pValorEfectivo, pValorTransaccion
    }){
        const [rows] = await connection.query(
            `INSERT INTO Ventas(
                EmpresaId, UsuarioIdCreador, TerceroId, TerceroTipoDoc, TerceroNumeroDoc, TerceroNombre,
                VendedorId,
                TipoVenta, ValorSubtotal, ValorDescuento, ValorCancelado, ValorSaldo, ValorEfectivo, ValorTransaccion)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
             pVendedorId ?? null,
             pTipoVenta, pValorSubtotal, pValorDescuento, pValorCancelado, pValorSaldo, pValorEfectivo, pValorTransaccion]
        );
        return rows.insertId;
    },

    //FechaCreacion es un TIMESTAMP con granularidad de segundo: varias ventas del mismo segundo
    //no tienen orden definido entre si, y sin desempate una misma fila puede repetirse o
    //desaparecer al cambiar de pagina. v.Id DESC lo vuelve determinista.
    //
    //connWrapper permite leer dentro de la transaccion del llamador, igual que traerPorId.
    async traerTodo({pEmpId, pOffset, pVendedorId}, connWrapper = pool){
        const filtro = filtroVendedor(pVendedorId);
        const [rows] = await connWrapper.query(
            `SELECT
                v.Id AS ventaId, v.FechaCreacion AS ventaFecha, v.TerceroNombre AS ventaTercero,
                v.TipoVenta AS ventaTipoVenta, v.ValorSubtotal AS ventaSubtotal,
                v.ValorDescuento AS ventaDescuento, v.ValorCancelado AS ventaCancelado,
                v.ValorSaldo AS ventaSaldo, v.Estado AS ventaEstado,
                v.VendedorId AS ventaVendedorId, vd.Nombre AS ventaVendedor
            FROM Ventas v
                LEFT JOIN Vendedores vd ON vd.Id = v.VendedorId
            WHERE v.EmpresaId = ?
            ${filtro.sql}
            ORDER BY v.FechaCreacion DESC, v.Id DESC
            LIMIT 50 OFFSET ?;`,
            [pEmpId, ...filtro.params, pOffset]
        );
        return rows || [];
    },

    //mismo filtro que traerTodo: si se separan, el total y las paginas dejan de cuadrar.
    async contarTodo({pEmpId, pVendedorId}, connWrapper = pool){
        const filtro = filtroVendedor(pVendedorId);
        const [rows] = await connWrapper.query(
            `SELECT COUNT(*) AS total
            FROM Ventas v
            WHERE v.EmpresaId = ?
            ${filtro.sql};`,
            [pEmpId, ...filtro.params]
        );
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
                v.Estado AS ventaEstado, u.Nombres AS ventaUsuario,
                v.VendedorId AS ventaVendedorId, vd.Nombre AS ventaVendedor
            FROM Ventas v
                LEFT JOIN Usuarios u ON u.Id = v.UsuarioIdCreador
                LEFT JOIN Vendedores vd ON vd.Id = v.VendedorId
            WHERE v.Id = ? AND v.EmpresaId = ?;`,
            [pId, pEmpId]
        );
        return rows[0] || null;
    }
};

export default Ventas;
