//validaciones ruta

const ordenProduccionValidaDatos = async (req,res,next) => {
    const {consumos, producidos, Observaciones} = req.body;

    if (!Array.isArray(consumos) || consumos.length === 0) {
        return res.status(401).json({msg:'Debe registrar al menos un consumo'});
    }
    for (const c of consumos) {
        if (!Number.isInteger(c.idArticulo)) {
            return res.status(401).json({msg:'idArticulo inválido en consumos'});
        }
        if (!Number.isInteger(c.idBodega)) {
            return res.status(401).json({msg:'idBodega inválido en consumos'});
        }
        if (typeof c.BolsaEstado !== 'string' || c.BolsaEstado.trim().length === 0) {
            return res.status(401).json({msg:'BolsaEstado obligatorio en consumos'});
        }
        if (isNaN(Number(c.Cantidad)) || Number(c.Cantidad) <= 0) {
            return res.status(401).json({msg:'Cantidad inválida en consumos'});
        }
    }

    if (!Array.isArray(producidos) || producidos.length === 0) {
        return res.status(401).json({msg:'Debe registrar al menos un artículo producido'});
    }
    for (const p of producidos) {
        if (!Number.isInteger(p.idArticulo)) {
            return res.status(401).json({msg:'idArticulo inválido en producidos'});
        }
        if (!Number.isInteger(p.idBodega)) {
            return res.status(401).json({msg:'idBodega inválido en producidos'});
        }
        if (isNaN(Number(p.Cantidad)) || Number(p.Cantidad) <= 0) {
            return res.status(401).json({msg:'Cantidad inválida en producidos'});
        }
        if (p.CostoUnitario !== undefined && p.CostoUnitario !== null) {
            if (isNaN(Number(p.CostoUnitario)) || Number(p.CostoUnitario) < 0) {
                return res.status(401).json({msg:'CostoUnitario inválido en producidos'});
            }
        }
    }

    if (Observaciones !== undefined && Observaciones !== null && String(Observaciones).length > 300) {
        return res.status(401).json({msg:'Las observaciones superan los 300 caracteres'});
    }

    next();
};

const ordenProduccionValidaFiltros = async (req,res,next) => {
    const {pagina} = req.body;
    if (!Number.isInteger(pagina)) {
        return res.status(401).json({msg:'Pagina invalida'});
    }
    next();
};

export { ordenProduccionValidaDatos, ordenProduccionValidaFiltros };
