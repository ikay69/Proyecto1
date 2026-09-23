//validaciones ruta

const TIPOS_SEGUIMIENTO_VALIDOS = ['CANTIDAD','UNIDAD'];

const productoValidaDatos = async (req,res,next)=>{

    const {Nombre,TipoSeguimiento,Descripcion} = req.body;
 
    let vNombre = String(Nombre ?? '');
    let vTipoSeguimiento = String(TipoSeguimiento ?? '');
    let vDescripcion = String(Descripcion ?? '');

    vNombre = vNombre.toUpperCase().trim();
    vTipoSeguimiento = vTipoSeguimiento.toUpperCase().trim();

    if (vNombre === undefined || !vNombre || vNombre.length === 0){
        return res.status(400).json({msg:"El nombre no puede estar vacío"});
    }

    if(vNombre.length > 150){
        return res.status(400).json({msg:"El nombre supera los 150 caracteres"});
    }

    if (vTipoSeguimiento === undefined || !vTipoSeguimiento || vTipoSeguimiento.length === 0){
        return res.status(400).json({msg:"El tipo de seguimiento no puede estar vacío"});
    }

    if(!TIPOS_SEGUIMIENTO_VALIDOS.includes(vTipoSeguimiento)){
        return res.status(400).json({msg:"El tipo de seguimiento debe ser CANTIDAD o UNIDAD"});
    }

    if(vDescripcion !== undefined && vDescripcion !== null && String(vDescripcion).trim().length > 0){
        if(vDescripcion.length > 300){
            return res.status(400).json({msg:"la decripcion supera los 300 caracteres"});
        }
    }
    
    next();
};

//se usa tanto para /getallproducto como /getactivasproducto, ya que ambas rutas
//reciben el mismo cuerpo (idEmpresa, campoOrdenar, orden, pagina, textoFiltro)
const productoValidaFiltros = async (req,res,next)=>{

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
        if(vTextoFiltro.length>150){
            return res.status(400).json({msg:'Texto de filtro supera los 150 caracteres'});
        }
    }

    next();
};


export {
    productoValidaDatos,
    productoValidaFiltros
};
