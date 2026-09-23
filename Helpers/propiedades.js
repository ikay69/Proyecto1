//validaciones ruta

const TIPOS_DATO_VALIDOS = ['NUMERO','TEXTO'];

const propValidaDatos = async (req,res,next)=>{

    const {Nombre,TipoDato} = req.body;

    let vNombre = String(Nombre ?? '');
    let vTipoDato = String(TipoDato ?? '');

    vNombre = vNombre.toUpperCase().trim();
    vTipoDato = vTipoDato.toUpperCase().trim();

    if (vNombre === undefined || !vNombre || vNombre.length === 0){
        return res.status(400).json({msg:"El nombre no puede estar vacío"});
    }

    if(vNombre.length > 50){
        return res.status(400).json({msg:"El nombre supera los 50 caracteres"});
    }

    if (vTipoDato === undefined || !vTipoDato || vTipoDato.length === 0){
        return res.status(40).json({msg:"El tipo de dato no puede estar vacío"});
    }

    if(!TIPOS_DATO_VALIDOS.includes(vTipoDato)){
        return res.status(400).json({msg:"El tipo de dato debe ser NUMERO o TEXTO"});
    }

    next();
};


const propValidaFiltros = async (req,res,next)=>{

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
        if(vTextoFiltro.length>50){
            return res.status(400).json({msg:'Texto de filtro supera los 50 caracteres'});
        }
    }

    next();
};


export {
    propValidaDatos,
    propValidaFiltros
};
