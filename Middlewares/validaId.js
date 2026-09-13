
const validarId = async(id)=>{

    if(!Number.isInteger(id))throw new Error("Id Invalido") 
    
}

export {
    validarId
}