//validaciones ruta

const TIPOS_VENTA_VALIDOS = ['CONTADO', 'POR_ABONO', 'CREDITO'];

const ventaValidaDatos = async (req,res,next) => {
    const {idTercero, idVendedor, TipoVenta, ValorDescuento, ValorEfectivo, ValorTransaccion, Articulos} = req.body;

    if (!Number.isInteger(idTercero)) {
        return res.status(401).json({msg:'Tercero inválido'});
    }

    //idVendedor es opcional: ausente o null significa venta sin vendedor asignado. Si viene,
    //tiene que ser un entero positivo; que exista, sea de la empresa y este activo lo comprueba
    //el Controller, que es quien puede consultar la base.
    if (idVendedor !== undefined && idVendedor !== null) {
        if (!Number.isInteger(idVendedor) || idVendedor <= 0) {
            return res.status(401).json({msg:'Vendedor inválido'});
        }
    }

    if (!TIPOS_VENTA_VALIDOS.includes(TipoVenta)) {
        return res.status(401).json({msg:'Tipo de venta inválido'});
    }

    if (ValorDescuento !== undefined && ValorDescuento !== null) {
        if (isNaN(Number(ValorDescuento)) || Number(ValorDescuento) < 0) {
            return res.status(401).json({msg:'El descuento es inválido'});
        }
    }

    if (ValorEfectivo !== undefined && ValorEfectivo !== null) {
        if (isNaN(Number(ValorEfectivo)) || Number(ValorEfectivo) < 0) {
            return res.status(401).json({msg:'El valor en efectivo es inválido'});
        }
    }
    if (ValorTransaccion !== undefined && ValorTransaccion !== null) {
        if (isNaN(Number(ValorTransaccion)) || Number(ValorTransaccion) < 0) {
            return res.status(401).json({msg:'El valor en transacción es inválido'});
        }
    }

    const vEfectivo = Number(ValorEfectivo) || 0;
    const vTransaccion = Number(ValorTransaccion) || 0;
    if (vEfectivo <= 0 && vTransaccion <= 0) {
        return res.status(401).json({msg:'Debe registrar algún valor cancelado (efectivo o transacción)'});
    }

    if (!Array.isArray(Articulos) || Articulos.length === 0) {
        return res.status(401).json({msg:'Debe registrar al menos un artículo'});
    }
    //tope superior de lineas: cada linea cuesta una consulta al pool en el Controller (para
    //validar y congelar nombre/costo) y un lock de fila de Existencias retenido hasta el commit.
    //Una venta real de mostrador no se acerca ni de lejos a 200 lineas; el limite solo evita que
    //un payload desmedido monopolice el pool o la transaccion.
    if (Articulos.length > 200) {
        return res.status(401).json({msg:'La venta no puede tener más de 200 líneas'});
    }
    for (const item of Articulos) {
        //sin este guarda, un elemento null de la lista haria estallar el acceso a
        //item.idArticulo y la ruta respondería 500 (con stack trace) en vez de un 401
        //de validacion; mismo guarda que Helpers/articulos.js aplica a Propiedades.
        if (item === null || typeof item !== 'object' || Array.isArray(item)) {
            return res.status(401).json({msg:'idArticulo inválido'});
        }
        if (!Number.isInteger(item.idArticulo)) {
            return res.status(401).json({msg:'idArticulo inválido'});
        }
        if (!Number.isInteger(item.idBodega)) {
            return res.status(401).json({msg:'idBodega inválido'});
        }
        if (isNaN(Number(item.Cantidad)) || Number(item.Cantidad) <= 0) {
            return res.status(401).json({msg:'Cantidad inválida'});
        }
        if (isNaN(Number(item.PrecioVentaUnidad)) || Number(item.PrecioVentaUnidad) <= 0) {
            return res.status(401).json({msg:'PrecioVentaUnidad inválido'});
        }
    }

    next();
};

const ventaValidaFiltros = async (req,res,next) => {
    const {pagina, idVendedor} = req.body;
    if (!Number.isInteger(pagina)) {
        return res.status(401).json({msg:'Pagina invalida'});
    }

    //idVendedor del filtro: ausente o 0 trae todas, -1 solo las que no tienen vendedor
    //asignado, y un id positivo solo las de ese vendedor. Se rechaza null a proposito:
    //dejarlo pasar lo convertiria en "todas" sin que nadie lo haya pedido.
    if (idVendedor !== undefined) {
        if (!Number.isInteger(idVendedor) || idVendedor < -1) {
            return res.status(401).json({msg:'Vendedor invalido'});
        }
    }

    next();
};

export { ventaValidaDatos, ventaValidaFiltros };
