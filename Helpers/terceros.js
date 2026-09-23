//validaciones ruta

const terceroValidaDatos = async (req,res,next)=>{

    const {Nombre,Apellidos,NumeroDocumento,Celular,Email,Direccion} = req.body;

    let vNombre = String(Nombre ?? '').trim();
    let vApellidos = String(Apellidos ?? '').trim();
    let vNumeroDocumento = String(NumeroDocumento ?? '').trim();

    if(!vNombre || vNombre.length === 0){
        return res.status(400).json({msg:"El nombre no puede estar vacío"});
    }

    if(vNombre.length > 150){
        return res.status(400).json({msg:"El nombre supera los 150 caracteres"});
    }

    if(!vApellidos || vApellidos.length === 0){
        return res.status(400).json({msg:"Los apellidos no pueden estar vacíos"});
    }

    if(vApellidos.length > 150){
        return res.status(400).json({msg:"Los apellidos superan los 150 caracteres"});
    }

    if(!vNumeroDocumento || vNumeroDocumento.length === 0){
        return res.status(400).json({msg:"Los apellidos no pueden estar vacíos"});
    }

    if(vNumeroDocumento.length > 50){
        return res.status(400).json({msg:"El numero de documento superan los 50 caracteres"});
    }

    //valida letras numeros y simbolo - #, no se permite espacios
    if(!/^[a-zA-Z0-9-#]+$/.test(vNumeroDocumento)){
            return res.status(400).json({msg:"El Numero de documento solo puede contener números letras y ( - #)"});
    }

    //campos opcionales: solo se validan tipo/tamaño si llegan diligenciados
    /*
    if(NumeroDocumento !== undefined && NumeroDocumento !== null && String(NumeroDocumento).trim().length > 0){
        const vNumeroDocumento = String(NumeroDocumento).trim();
        if(vNumeroDocumento.length > 50){
            return res.status(400).json({msg:"El numero de documento supera los 50 caracteres"});
        }
    }*/

    if(Celular !== undefined && Celular !== null && String(Celular).trim().length > 0){
        const vCelular = String(Celular).trim();
        if(vCelular.length > 10){
            return res.status(400).json({msg:"El celular supera los 10 caracteres"});
        }
        if(!/^[0-9]+$/.test(vCelular)){
            return res.status(400).json({msg:"El celular solo puede contener números"});
        }
    }

    if(Email !== undefined && Email !== null && String(Email).trim().length > 0){
        const vEmail = String(Email).trim();
        if(vEmail.length > 150){
            return res.status(400).json({msg:"El email supera los 150 caracteres"});
        }
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!regexEmail.test(vEmail)){
            return res.status(400).json({msg:"El email no tiene un formato válido"});
        }
    }

    if(Direccion !== undefined && Direccion !== null && String(Direccion).trim().length > 0){
        const vDireccion = String(Direccion).trim();
        if(vDireccion.length > 200){
            return res.status(400).json({msg:"La dirección supera los 200 caracteres"});
        }
    }

    next();
};


const terceroValidaFiltros = async (req,res,next)=>{

    const {campoOrdenar,pagina,textoFiltro} = req.body;

    if(!Number.isInteger(pagina) == true){
        return res.status(400).json({msg:'Pagina invalida'});
    }

    if(campoOrdenar !== 1 && campoOrdenar !== 2 && campoOrdenar !== 3 && campoOrdenar !== 4 && campoOrdenar !== 5){
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
    terceroValidaDatos,
    terceroValidaFiltros
};
