//validaciones ruta

const TIPOS_VENTA_VALIDOS = ['CONTADO', 'POR_ABONO', 'CREDITO'];

const ventaValidaDatos = async (req,res,next) => {
    const {idTercero, TipoVenta, ValorDescuento, ValorEfectivo, ValorTransaccion, Articulos} = req.body;

    if (!Number.isInteger(idTercero)) {
        return res.status(401).json({msg:'Tercero inválido'});
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
    for (const item of Articulos) {
        if (!Number.isInteger(item.idArticulo)) {
            return res.status(401).json({msg:'idArticulo inválido'});
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
    const {pagina} = req.body;
    if (!Number.isInteger(pagina)) {
        return res.status(401).json({msg:'Pagina invalida'});
    }
    next();
};

export { ventaValidaDatos, ventaValidaFiltros };
