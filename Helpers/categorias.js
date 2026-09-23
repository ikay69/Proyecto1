//validaciones ruta

const catValidaNombre = async (req,res,next)=>{

    const {Nombre} = req.body;

    let vNombre = String(Nombre ?? '');
    vNombre = vNombre.toUpperCase().trim();

    if (vNombre === undefined || !vNombre || vNombre.length === 0){
        return res.status(400).json({msg:"El nombre no puede estar vacío"});
    }

    if(vNombre.length > 50){
        return res.status(400).json({msg:"El nombre supera los 50 caracteres"});
    }

    next();
};


const catValidaFiltros = async (req,res,next)=>{

    const {campoOrdenar,pagina,textoFiltro} = req.body;

    if(!Number.isInteger(pagina) == true){
        return res.status(400).json({msg:'Pagina invalida'});
    }

    if(campoOrdenar !== 1 && campoOrdenar !== 2){
        return res.status(400).json({msg:'Campo de orden invalido'});
    }

    if(textoFiltro === undefined || !textoFiltro || textoFiltro.trim().length === 0){
    }else{
        var vTextoFiltro = String(textoFiltro);
        vTextoFiltro = vTextoFiltro.trim();
        if(vTextoFiltro.length>50){
            return res.status(400).json({msg:'Texto de filtro supera los 50 caracteres'});
        }
    }

    next();
};


export {
    catValidaNombre,
    catValidaFiltros
};
