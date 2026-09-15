//validaciones ruta

import { BOLSAS_VALIDAS } from './existenciaReglas.js';

//BolsaEstado es opcional: ausente o vacio significa "sin filtro de bolsa"
const existenciaValidaFiltros = async (req,res,next) => {
    const {pagina, textoFiltro, BolsaEstado} = req.body;

    if (!Number.isInteger(pagina)) {
        return res.status(401).json({msg:'Pagina invalida'});
    }

    if (BolsaEstado !== undefined && BolsaEstado !== null && BolsaEstado !== '') {
        if (!BOLSAS_VALIDAS.includes(BolsaEstado)) {
            return res.status(401).json({msg:'Bolsa de existencia inválida'});
        }
    }

    if (textoFiltro !== undefined && textoFiltro !== null && String(textoFiltro).trim().length > 150) {
        return res.status(401).json({msg:'Texto de filtro supera los 150 caracteres'});
    }

    next();
};

export { existenciaValidaFiltros };
