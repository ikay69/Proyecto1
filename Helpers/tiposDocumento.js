//validaciones ruta

const tipoDocValidaDatos = async (req,res,next)=>{

    const {Abreviatura,Descripcion} = req.body;

    let vAbreviatura = String(Abreviatura ?? '');
    let vDescripcion = String(Descripcion ?? '');

    vAbreviatura = vAbreviatura.toUpperCase().trim();
    vDescripcion = vDescripcion.toUpperCase().trim();

    if (vAbreviatura === undefined || !vAbreviatura || vAbreviatura.length === 0){
        return res.status(400).json({msg:"La abreviatura no puede estar vacía"});
    }

    if(vAbreviatura.length > 10){
        return res.status(400).json({msg:"La abreviatura supera los 10 caracteres"});
    }

    if (vDescripcion === undefined || !vDescripcion || vDescripcion.length === 0){
        return res.status(400).json({msg:"La descripción no puede estar vacía"});
    }

    if(vDescripcion.length > 100){
        return res.status(400).json({msg:"La descripción supera los 100 caracteres"});
    }

    next();
};


const tipoDocValidaFiltros = async (req,res,next)=>{

    const {campoOrdenar,pagina,textoFiltro} = req.body;

    if(!Number.isInteger(pagina) == true){
        return res.status(400).json({msg:'Pagina invalida'});
    }

    if(campoOrdenar !== 1 && campoOrdenar !== 2 && campoOrdenar !== 3){
        return res.status(400).json({msg:'Campo de orden invalido'});
    }

    if(textoFiltro === undefined || !textoFiltro || textoFiltro.trim().length === 0){
    }else{
        var vTextoFiltro = String(textoFiltro);
        vTextoFiltro = vTextoFiltro.trim();
        if(vTextoFiltro.length>10){
            return res.status(400).json({msg:'Texto de filtro supera los 10 caracteres'});
        }
    }

    next();
};


export {
    tipoDocValidaDatos,
    tipoDocValidaFiltros
};
