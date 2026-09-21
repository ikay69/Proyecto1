import { pool } from '../Database/config.js';

//desglose opcional de las cuotas de una compra a credito. Es una transcripcion de lo que el
//proveedor cobra, no un calculo de este sistema.
//
//OJO con el vocabulario: aqui Estado='CANCELADA' significa PAGADA (sentido coloquial de
//"cancelar una cuota"). En Compras, Estado=FALSE significa ANULADA. Son opuestos.
const CompraCuotas = {
    //recibe la conexion de la transaccion del llamador (Helpers/compraService.js): las cuotas
    //que vienen dentro del payload de una compra se confirman o se revierten con ella.
    async crearVarias(connection, {pEmpId, pCompraId, cuotas}){
        //el desglose es opcional: sin cuotas no hay INSERT. Un `VALUES ?` con un arreglo vacio
        //es un error de sintaxis en MySQL, asi que esta guarda no es cosmetica.
        if (!Array.isArray(cuotas) || cuotas.length === 0) return;

        const valores = cuotas.map(c => [
            pEmpId, pCompraId, c.NumCuota, c.ValorCuota, c.FechaPago ?? null, c.Estado ?? 'PENDIENTE'
        ]);
        await connection.query(
            `INSERT INTO CompraCuotas(EmpresaId, CompraId, NumCuota, ValorCuota, FechaPago, Estado)
             VALUES ?;`,
            [valores]
        );
    },

    //alta de una cuota suelta sobre una compra ya creada: una sola fila, sin transaccion.
    //Una cuota repetida choca contra uq_compracuota_numero y lanza ER_DUP_ENTRY; el Controller
    //lo mapea. No se chequea antes con un SELECT: eso tendria ventana de carrera.
    async crear({pEmpId, pCompraId, pNumCuota, pValorCuota, pFechaPago, pEstado}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `INSERT INTO CompraCuotas(EmpresaId, CompraId, NumCuota, ValorCuota, FechaPago, Estado)
             VALUES(?,?,?,?,?,?);`,
            [pEmpId, pCompraId, pNumCuota, pValorCuota, pFechaPago ?? null, pEstado ?? 'PENDIENTE']
        );
        return rows.insertId;
    },

    //ORDER BY NumCuota: sin el, el orden lo decide el plan de ejecucion y el desglose se
    //muestra revuelto. (CompraDetalles.traerPorCompra todavia arrastra esa deuda.)
    async traerPorCompra({pEmpId, pCompraId}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `SELECT
                cc.Id AS cuoId,
                cc.NumCuota AS cuoNumCuota,
                cc.ValorCuota AS cuoValorCuota,
                cc.FechaPago AS cuoFechaPago,
                cc.Estado AS cuoEstado
            FROM CompraCuotas cc
            WHERE cc.EmpresaId = ? AND cc.CompraId = ?
            ORDER BY cc.NumCuota;`,
            [pEmpId, pCompraId]
        );
        return rows || [];
    },

    //devuelve la cuota JUNTO CON el estado, el tipo y el numero de cuotas de su compra. Los
    //tres endpoints de edicion necesitan los tres datos antes de escribir -- una compra anulada
    //congela sus cuotas, y NumCuota tiene como tope el NumeroCuotas de la compra --, y traerlos
    //en el mismo SELECT ahorra una segunda consulta por peticion.
    async traerPorId({pEmpId, pId}, connWrapper = pool){
        const [rows] = await connWrapper.query(
            `SELECT
                cc.Id AS cuoId, cc.CompraId AS cuoCompraId,
                cc.NumCuota AS cuoNumCuota, cc.ValorCuota AS cuoValorCuota,
                cc.FechaPago AS cuoFechaPago, cc.Estado AS cuoEstado,
                c.Estado AS compraEstado, c.TipoCompra AS compraTipoCompra,
                c.NumeroCuotas AS compraNumeroCuotas
            FROM CompraCuotas cc
                INNER JOIN Compras c ON c.Id = cc.CompraId
            WHERE cc.Id = ? AND cc.EmpresaId = ?;`,
            [pId, pEmpId]
        );
        return rows[0] || null;
    },

    //el SET se arma con los campos que el llamador mando. Un COALESCE(?, columna) seria mas
    //corto pero haria imposible vaciar FechaPago: no distingue "no cambiar" de "poner en null",
    //y vaciar la fecha es uno de los casos de uso.
    //
    //Los fragmentos que se interpolan en la plantilla son literales de ESTE archivo, nunca
    //texto del cliente; los valores siempre viajan como parametros.
    async actualizar({pEmpId, pId, pNumCuota, pValorCuota, pFechaPago, pEstado}, connWrapper = pool){
        const campos = [];
        const valores = [];
        if (pNumCuota !== undefined)   { campos.push('NumCuota = ?');   valores.push(pNumCuota); }
        if (pValorCuota !== undefined) { campos.push('ValorCuota = ?'); valores.push(pValorCuota); }
        if (pFechaPago !== undefined)  { campos.push('FechaPago = ?');  valores.push(pFechaPago); }
        if (pEstado !== undefined)     { campos.push('Estado = ?');     valores.push(pEstado); }
        if (campos.length === 0) return 0;

        const [resultado] = await connWrapper.query(
            `UPDATE CompraCuotas SET ${campos.join(', ')} WHERE Id = ? AND EmpresaId = ?;`,
            [...valores, pId, pEmpId]
        );
        return resultado.affectedRows;
    },

    //borrado real, no logico: a diferencia del resto del sistema, CompraCuotas no tiene columna
    //de estado de fila. Sus datos son una transcripcion informativa sin valor contable y nada
    //apunta a ellos. Decision explicita, documentada en el spec.
    async eliminar({pEmpId, pId}, connWrapper = pool){
        const [resultado] = await connWrapper.query(
            `DELETE FROM CompraCuotas WHERE Id = ? AND EmpresaId = ?;`,
            [pId, pEmpId]
        );
        return resultado.affectedRows;
    }
};

export default CompraCuotas;
