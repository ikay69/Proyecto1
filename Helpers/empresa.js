import Empresa from "../Models/empresa.js";
//validaciones de ruta

const EmpvalidarNombreRut = async(nombre)=>{
    //nombre = nombre.trim();
    if(nombre=="")throw new Error("Nombre invalido") 
    if(nombre.length>150) throw new Error("Nombre supero tamaño") 

    const empresa = await Empresa.validarNombreExiste({nombre})
    
    if(empresa)throw new Error("Nombre ya existe") 
} 

const EmpvalidarClaveRut = async(clave)=>{
    //clave = clave.trim();
    if(clave=="")throw new Error("clave invalido") 
    if(clave.length>11) throw new Error("clave supero tamaño max 10") 
    const empresa = await Empresa.validarClaveExiste({clave})
    if(empresa)throw new Error("clave ya existe") 

    const regex = /^[a-zA-Z0-9]+$/;
    if (!regex.test(clave))throw new Error("La clave solo debe contener letras (sin acentos ni Ñ) y números, sin espacios")

}

const EmpvalidarPassRut = async(pass)=>{
    if(pass=="")throw new Error("contraseña de empresa invalida");
    if(pass.length > 11)throw new Error("contraseña de empresa invalida");

    const regex = /^[a-zA-Z0-9]+$/;
    if (!regex.test(pass))throw new Error("La contraseña solo debe contener letras (sin acentos ni Ñ) y números, sin espacios")
}

const EmpvalidarEstadoRut = async(estado)=>{
    if(estado !== true && estado !==false)throw new Error("Nuevo estado invalido");
}




//funciones independiente

const EmpvalidarNombreEmpresa = async(nombre)=>{
    var mensaje = ''

    if (nombre === undefined || !nombre || nombre.trim().length === 0) {
        mensaje = "El nombre no puede estar vacío";
        return mensaje;
    }

    if (nombre.length > 151) {
        mensaje = "El nombre no puede superar los 150 caracteres";
        return mensaje;
    }
    
    return true;
}

const EmpvalidarClaveEmpresa = async(clave) =>{
    var mensaje = '';

    if (clave === undefined || !clave || clave.trim().length === 0) {
        mensaje = "La clave no puede estar vacía";
        return mensaje;
    }

    if (clave.length > 10) {
        mensaje = "La clave no puede superar los 10 caracteres";
        return mensaje;
    }

    // 3. Validar: Solo letras (incluye Ñ y acentos) y números. SIN espacios ni símbolos.
    const regex = /^[a-zA-Z0-9]+$/;
    if (!regex.test(clave)) {
        mensaje = "La clave solo debe contener letras y números, sin espacios ni símbolos";
        return mensaje;
    }
    
    return true;
}

const EmpvalidarPassEmpresa = async(pass) =>{
    var mensaje = '';
    
    if (pass === undefined || !pass || pass.trim().length === 0) {
        mensaje = "La contraseña no puede estar vacío";
        return mensaje;
    }

    if (pass.length > 11) {
        mensaje = "La contraseña no puede superar los 10 caracteres";
        return mensaje;
    }

    const regex = /^[a-zA-Z0-9]+$/;
    if (!regex.test(pass)) {
        mensaje = "La contraseña solo debe contener letras (sin acentos ni Ñ) y números, sin espacios";
        return mensaje;
    }
    
    return true;
}

const EmpvalidarCel = async (cel) => {
    var mensaje = ''

    if(cel.length >0){
        if(cel.length !== 10 ) {
            mensaje = "Celular no valido";
            return mensaje
        }

        const regex = /^[0-9]+$/;
        if(!regex.test(cel)) {
            mensaje = "Celular no valido";
            return mensaje
        }
    }
    return true;
}

const EmpvalidarTipDoc = async(tipdoc)=>{
    var mensaje = ''

    if(tipdoc.length>51) {
        mensaje = "Tipo documento no valido";
        return mensaje
    }
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s]+$/;

    if(tipdoc.length >0){
        if(!regex.test(tipdoc)) {
            mensaje = "Tipo documento no valido";
            return mensaje
        }
    }
    return true;
}

const EmpvalidarNumDoc = async(numdoc)=>{
    var mensaje = ''

    if(numdoc.length>51) {
        mensaje = "Numero documento no valido";
        return mensaje
    }

    if(numdoc.length > 0){
        const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s]+$/;
        if(!regex.test(numdoc)) {
            mensaje = "Numero documento no valido";
            return mensaje
        }
    }
    return true;
}

const EmpvalidarTel = async(tel)=>{
    var mensaje = ''

    if(tel.length>26) {
        mensaje = "Numero documento no valido";
        return mensaje
    }

    const regex = /^[a-zA-Z0-9\s-]+$/;

    if(tel.length>0){
        
        if(!regex.test(tel)) {
            mensaje = "telefono  no valido";
            return mensaje
        }
    }

    return true;
}

const EmpvalidarEma = async(email)=>{
    var mensaje = ''

    if (email.length > 151) {
        mensaje = "El email no puede superar los 150 caracteres";
        return mensaje;
    }

    //Validar estructura de email estándar
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if(email.length>0){
        if (!regex.test(email)) {
            mensaje = "El formato del email no es válido";
            return mensaje;
        }
    }
    
    return true;
}

const EmpvalidarDir = async(direccion)=>{
    var mensaje = ''

    if(direccion.length>200) {
        mensaje = "Numero documento no valido max 200 caracteres";
        return mensaje
    }
    
    return true;
}



export{
    EmpvalidarNombreRut,
    EmpvalidarClaveRut,
    EmpvalidarPassRut,
    EmpvalidarEstadoRut,

    EmpvalidarNombreEmpresa,
    EmpvalidarTipDoc,
    EmpvalidarNumDoc,
    EmpvalidarCel,
    EmpvalidarTel,
    EmpvalidarEma,
    EmpvalidarDir
    
    
}