//validaciones ruta

import { BOLSAS_VALIDAS } from './existenciaReglas.js';

//BolsaEstado e idBodega son opcionales: ausente o vacio significa "sin filtrar por ese campo"
const existenciaValidaFiltros = async (req,res,next) => {
    const {pagina, textoFiltro, BolsaEstado, idBodega} = req.body;

    if (!Number.isInteger(pagina)) {
        return res.status(401).json({msg:'Pagina invalida'});
    }

    if (BolsaEstado !== undefined && BolsaEstado !== null && BolsaEstado !== '') {
        if (!BOLSAS_VALIDAS.includes(BolsaEstado)) {
            return res.status(401).json({msg:'Bolsa de existencia inválida'});
        }
    }

    if (idBodega !== undefined && idBodega !== null && idBodega !== '') {
        if (!Number.isInteger(idBodega)) {
            return res.status(401).json({msg:'Bodega inválida'});
        }
    }

    if (textoFiltro !== undefined && textoFiltro !== null && String(textoFiltro).trim().length > 150) {
        return res.status(401).json({msg:'Texto de filtro supera los 150 caracteres'});
    }

    next();
};

export { existenciaValidaFiltros };
