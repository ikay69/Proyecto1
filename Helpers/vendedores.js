//validaciones ruta

const vdrValidaNombre = async (req,res,next)=>{

    const {Nombre} = req.body;

    let vNombre = String(Nombre ?? '');
    vNombre = vNombre.toUpperCase().trim();

    if (vNombre === undefined || !vNombre || vNombre.length === 0){
        return res.status(400).json({msg:"El nombre no puede estar vacío"});
    }

    if(vNombre.length > 100){
        return res.status(400).json({msg:"El nombre supera los 100 caracteres"});
    }

    next();
};


const vdrValidaFiltros = async (req,res,next)=>{

    const {campoOrdenar,pagina,textoFiltro,estadoFiltro} = req.body;

    if(!Number.isInteger(pagina) == true){
        return res.status(400).json({msg:'Pagina invalida'});
    }

    if(campoOrdenar !== 1 && campoOrdenar !== 2){
        return res.status(400).json({msg:'Campo de orden invalido'});
    }

    //estadoFiltro es opcional: si no viene, el controlador lista todos los estados.
    //ojo con el ausente: undefined pasa, pero null o '1' no, para no dejar entrar un
    //valor que el controlador terminaria tratando como 0 (todos) sin que nadie lo pidiera.
    if(estadoFiltro !== undefined){
        if(estadoFiltro !== 0 && estadoFiltro !== 1 && estadoFiltro !== 2){
            return res.status(400).json({msg:'Estado de filtro invalido'});
        }
    }

    if(textoFiltro === undefined || !textoFiltro || textoFiltro.trim().length === 0){
    }else{
        var vTextoFiltro = String(textoFiltro);
        vTextoFiltro = vTextoFiltro.trim();
        if(vTextoFiltro.length>100){
            return res.status(400).json({msg:'Texto de filtro supera los 100 caracteres'});
        }
    }

    next();
};


export {
    vdrValidaNombre,
    vdrValidaFiltros
};
