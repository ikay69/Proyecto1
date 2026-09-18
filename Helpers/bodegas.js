//validaciones ruta

const bodValidaNombre = async (req,res,next)=>{

    const {Nombre} = req.body;

    let vNombre = String(Nombre ?? '');
    vNombre = vNombre.toUpperCase().trim();

    if (vNombre === undefined || !vNombre || vNombre.length === 0){
        return res.status(401).json({msg:"El nombre no puede estar vacío"});
    }

    if(vNombre.length > 150){
        return res.status(401).json({msg:"El nombre supera los 150 caracteres"});
    }

    next();
};


const bodValidaFiltros = async (req,res,next)=>{

    const {campoOrdenar,pagina,textoFiltro} = req.body;

    if(!Number.isInteger(pagina) == true){
        return res.status(401).json({msg:'Pagina invalida'});
    }

    if(campoOrdenar !== 1 && campoOrdenar !== 2){
        return res.status(401).json({msg:'Campo de orden invalido'});
    }

    if(textoFiltro === undefined || !textoFiltro || textoFiltro.trim().length === 0){
    }else{
        var vTextoFiltro = String(textoFiltro);
        vTextoFiltro = vTextoFiltro.trim();
        if(vTextoFiltro.length>150){
            return res.status(401).json({msg:'Texto de filtro supera los 150 caracteres'});
        }
    }

    next();
};


export {
    bodValidaNombre,
    bodValidaFiltros
};
