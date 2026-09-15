//validaciones ruta

import { BOLSAS_VALIDAS, TIPOS_MOVIMIENTO_VALIDOS } from './existenciaReglas.js';

const movimientoValidaAjuste = async (req,res,next) => {
    const {TipoMovimiento, BolsaEstado, idPropietario, Cantidad, CostoUnitario, Observaciones} = req.body;

    if (!TIPOS_MOVIMIENTO_VALIDOS.includes(TipoMovimiento)) {
        return res.status(401).json({msg:'Tipo de movimiento inválido'});
    }
    if (!BOLSAS_VALIDAS.includes(BolsaEstado)) {
        return res.status(401).json({msg:'Bolsa de existencia inválida'});
    }
    if (idPropietario !== undefined && idPropietario !== null && !Number.isInteger(idPropietario)) {
        return res.status(401).json({msg:'Propietario inválido'});
    }
    if (isNaN(Number(Cantidad)) || Number(Cantidad) <= 0) {
        return res.status(401).json({msg:'La cantidad debe ser mayor a cero'});
    }
    if (CostoUnitario !== undefined && CostoUnitario !== null) {
        if (isNaN(Number(CostoUnitario)) || Number(CostoUnitario) < 0) {
            return res.status(401).json({msg:'El costo unitario es inválido'});
        }
    }
    if (Observaciones !== undefined && Observaciones !== null && String(Observaciones).length > 300) {
        return res.status(401).json({msg:'Las observaciones superan los 300 caracteres'});
    }

    next();
};

const movimientoValidaKardexFiltros = async (req,res,next) => {
    const {idArticulo, fechaInicio, fechaFin, pagina} = req.body;

    if (!Number.isInteger(idArticulo)) {
        return res.status(401).json({msg:'Articulo inválido'});
    }
    if (!fechaInicio || isNaN(Date.parse(fechaInicio))) {
        return res.status(401).json({msg:'Fecha inicio inválida'});
    }
    if (!fechaFin || isNaN(Date.parse(fechaFin))) {
        return res.status(401).json({msg:'Fecha fin inválida'});
    }
    if (!Number.isInteger(pagina)) {
        return res.status(401).json({msg:'Pagina invalida'});
    }

    next();
};

export { movimientoValidaAjuste, movimientoValidaKardexFiltros };
