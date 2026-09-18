import Usuario from "../Models/usuario.js";


//validacion de ruta
const usuValidarCrear = async(req,res,next)=>{
    const {nombres,apellidos,user,password,rol} = req.body;

    var pNombres = String(nombres ?? '');
    var pApellidos = String(apellidos ?? '');
    var pUserName = String(user ?? '');
    var pPassword = String(password ?? '');
    var pRol = String(rol ?? '');

 

    pNombres = pNombres.toUpperCase().trim();
    pApellidos = pApellidos.toUpperCase().trim();
    pUserName = pUserName.toUpperCase().trim();
    pPassword = pPassword.trim();
    pRol = pRol.toUpperCase().trim();

  
    if(pNombres.length === 0 || !pNombres || pNombres === undefined){
        throw new Error('Nombre obligatorio');
    }

    if(pApellidos.length === 0 || !pApellidos || pApellidos === undefined){
        throw new Error('Apellidos obligatorio');
    }

    if(pNombres.length > 151 || pApellidos.length > 151)throw new Error("Nombre  o Apellido supero tamaño (max 150)")


    if(pPassword.length === 0 || !pPassword || pPassword === undefined){
        throw new Error('Error en contraseña, no puede estar vacia');
    }
    
    if(pPassword.length > 11){
        throw new Error('Error en contraseña max 10 caracteres');
    }

    var regex = /^[a-zA-Z0-9]+$/;
    if (!regex.test(pPassword))throw new Error("La contraseña solo debe contener letras (sin acentos ni Ñ) y números, sin espacios")


    if(pUserName.length === 0 || !pUserName || pUserName === undefined){
        throw new Error('Error en usuario, no puede estar vacio');
    }

    if(pUserName.length > 51){
        throw new Error("Nombre de usuario supero 50 caracteres");
    }

    regex = /^[a-zA-Z0-9]+$/;
    if (!regex.test(pUserName))throw new Error("El usuario solo debe contener letras (sin acentos ni Ñ) y números, sin espacios")


    if(pRol !== 'ADMINISTRADOR' && pRol !== 'VENDEDOR'){
        throw new Error('Rol invalido');
    } 

    next();

}

const usuValidarPassRut = async(req,res,next)=>{
    const {idUsuario,pass,passNew} = req.body;

    var pPassword = String(pass ?? '');
    var pPasswordNew = String(passNew ?? '');

    pPassword = pPassword.trim();
    pPasswordNew = pPasswordNew.trim();

    if(pPassword.length === 0 || !pPassword || pPassword === undefined){
        throw new Error('Error en contraseña, no puede estar vacia');
    }

    if(pPasswordNew.length === 0 || !pPasswordNew || pPasswordNew === undefined){
        throw new Error('Error en contraseña, no puede estar vacia');
    }
    
    if(pPassword.length > 11){
        throw new Error('Error en contraseña max 10 caracteres');
    }

    if(pPasswordNew.length > 11){
        throw new Error('Error en contraseña max 10 caracteres');
    }

    var regex = /^[a-zA-Z0-9]+$/;
    if (!regex.test(pPassword))throw new Error("La contraseña solo debe contener letras (sin acentos ni Ñ) y números, sin espacios")
    if (!regex.test(pPasswordNew))throw new Error("La contraseña solo debe contener letras (sin acentos ni Ñ) y números, sin espacios")


    next();
}


const usuValidarEditar = async(req,res,next)=>{
    const {nombres,apellidos,user,password,rol} = req.body;

    var pNombres = String(nombres ?? '');
    var pApellidos = String(apellidos ?? '');
    var pUserName = String(user ?? '');
    var pRol = String(rol ?? '');

 

    pNombres = pNombres.toUpperCase().trim();
    pApellidos = pApellidos.toUpperCase().trim();
    pUserName = pUserName.toUpperCase().trim();
    pRol = pRol.toUpperCase().trim();

  
    if(pNombres.length === 0 || !pNombres || pNombres === undefined){
        throw new Error('Nombre obligatorio');
    }

    if(pApellidos.length === 0 || !pApellidos || pApellidos === undefined){
        throw new Error('Aprllidos obligatorio');
    }

    if(pNombres.length > 151 || pApellidos.length > 151)throw new Error("Nombre  o Apellido supero tamaño (max 150)")


    if(pUserName.length === 0 || !pUserName || pUserName === undefined){
        throw new Error('Error en usuario, no puede estar vacio');
    }

    if(pUserName.length > 51){
        throw new Error("Nombre de usuario supero 50 caracteres");
    }

    var regex = /^[a-zA-Z0-9]+$/;
    if (!regex.test(pUserName))throw new Error("El usuario solo debe contener letras (sin acentos ni Ñ) y números, sin espacios")


    if(pRol !== 'ADMINISTRADOR' && pRol !== 'VENDEDOR'){
        throw new Error('Rol invalido');
    } 

    next();
}



export{
    usuValidarCrear,
    usuValidarPassRut,
    usuValidarEditar
}

