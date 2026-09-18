const validarRol = (...roles) =>{
        return (req,res,next)=>{
            //if(!(roles.includes(req.usuario.rol) || req.usuario.rol==='ZEUS')){
            //if(!(roles.includes(req.usuario.Rol))){
            //  return res.status(401).json({msg:`El servicio requiere roles de ${roles}  administrador`})

            if (!(roles.includes(req.usuario.Rol))) {
                
                return res.status(401).json({
                    //msg: `El servicio requiere uno de los siguientes roles: [${roles.join(', ')}]. Tu rol actual no está autorizado.`
                    msg: `Usuario actual no está autorizado.`
                });
            }
            next();
        }
    }
export {validarRol}