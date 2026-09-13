import { SanitizersImpl } from "express-validator/lib/chain/sanitizers-impl.js";
import UnidadesMedida from "../Models/unidadesMedida.js";
import { body } from "express-validator";

//validaciones ruta
const undMedValidaNombreSimbolo = async (req,res,next)=>{

    const {Nombre,Simbolo} = req.body;

    var vNombre = String(Nombre ?? '').trim();
    var vSimbolo = String(Apellidos ?? '').trim();

    vNombre = vNombre.toUpperCase().trim();
    vSimbolo = Simbolo.trim();

    if (vNombre === "undefined" || !vNombre || vNombre.length === 0){
        return res.status(401).json({msg:"El nombre no puede estar vacío"});
    }

    if(vNombre.length > 51){
        return res.status(401).json({msg:"El nombre supera los 50 caracteres"});
    }
    
    if (vSimbolo === undefined || !vSimbolo || vSimbolo.length === 0){
        return res.status(401).json({msg:"El simbolo no puede estar vacío"});
    }

    if(vSimbolo.length > 11){
        return res.status(401).json({msg: "El simbolo supera los 10 caracteres"});
    }

    next();
};



const undMedValidaFiltros = async (req,res,next)=>{

     const {idEmpresa,campoOrdenar,orden,pagina,textoFiltro} = req.body;

    if(!Number.isInteger(pagina) == true){
         return res.status(401).json({msg:'Pagina invalida'});
    }

    if(campoOrdenar !== 1 && campoOrdenar !== 2 && campoOrdenar !== 3){
        return res.status(401).json({msg:'Campo de invalido'});
    }

     if(textoFiltro === undefined || !textoFiltro || textoFiltro.trim().length === 0){
     }else{
        var vTextoFiltro = String(textoFiltro);
        vTextoFiltro = vTextoFiltro.trim();
        if(vTextoFiltro.length>11){
            return res.status(401).json({msg:'Texto de filtro supera los 10 caracteres'});
        }
     }

    next();
};


export {
    undMedValidaNombreSimbolo,
    undMedValidaFiltros
};