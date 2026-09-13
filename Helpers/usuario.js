import Usuario from "../Models/usuario.js";


//validacion de ruta
const userValidarNombreRut = async(nombre)=>{
    if(nombre.trim() =='')throw new Error("Nombre vacio")
    if(nombre.length > 151)throw new Error("Nombre  o Apellido supero tamaño (max 150)")
}

const userValidarNomUserRut = async(userName)=>{
    if(userName.trim() =='')throw new Error("Usuario vacio")
    if(userName.length > 51)throw new Error("Usuario supero tamaño (max 150)")

    const regex = /^[a-zA-Z0-9]+$/;
    if (!regex.test(userName))throw new Error("El usuario solo debe contener letras (sin acentos ni Ñ) y números, sin espacios")


    const usuario = await Usuario.buscarPorUsername(userName);
    
    if (!usuario) {

    }else{
        throw new Error('Usuario, ya existe' );
    }
    
}

const userValidarPassRut = async(pass)=>{
    pass = String(pass);
    
    pass = pass.trim();
    if(pass.length > 11)throw new Error("Usuario supero tamaño (max 10)")
    
    if (pass === undefined || !pass || pass.trim().length === 0){
        throw new Error("La contraseña no puede estar vacío")
    }

    const regex = /^[a-zA-Z0-9]+$/;
    if (!regex.test(pass))throw new Error("La contraseña solo debe contener letras (sin acentos ni Ñ) y números, sin espacios")
}

const userValidarRolRut = async(rol)=>{
    if(rol !=='ADMINISTRADOR' && rol != 'VENDEDOR')throw new Error("Rol invalido")
}


//funciones independientes

const userValidarPass = async(pass)=>{
    pass = pass.trim();
    if(pass.length > 11){
        let mensaje = "Usuario supero tamaño (max 10)";
        return mensaje;
    }

    if (pass === undefined || !pass || pass.trim().length === 0){
        let mensaje = 'Contraseña invalida';
        return mensaje;
    }

    const regex = /^[a-zA-Z0-9]+$/;
    if (!regex.test(pass)){
        let mensaje = "La contraseña solo debe contener letras (sin acentos ni Ñ) y números, sin espacios";
        return mensaje;
    }

    return true;
}

const userValidarNombre = async(nombre)=>{
    if(nombre.trim() ==''){
        let mensaje = "Nombre o apellido vacio";
        return mensaje;
    }
    if(nombre.length > 151){
        let mensaje = "Nombre  o Apellido supero tamaño (max 150)"
        return mensaje;
    }

    return true;
}



export{
    userValidarNombreRut,
    userValidarNomUserRut,
    userValidarPassRut,
    userValidarRolRut,

    userValidarPass,
    userValidarNombre
}

