
import UsuariosEmpresa from '../Models/usuariosEmpesa.js';

// valida que el usuario que envia la peticion este asociado a la empresa que envia en el body
const validarUsuarioEmpresa = async (req, res, next) => {
    const {idEmpresa} = req.body;
    const  idUsuario = req.usuario.Id;
    
    try {


        if(Number.isInteger(idEmpresa) !== true){
            return res.status(400).json({msg:'id invalido'});
        }

        const usuarioEmpresa = await UsuariosEmpresa.validarRelacion({pEmpresaId:idEmpresa,pUsuarioId:idUsuario});

        if(!usuarioEmpresa){
            return res.status(400).json({msg:"No existe relacion entre usuario y empresa"})
        }

        if(!usuarioEmpresa.Estado){
            return res.status(400).json({msg:"No existe relacion activa entre usuario y empresa"})
        }
        next();
    } catch (error) {
         return res.status(400).json({ msg: 'Error interno' });
    }
    
}


export { validarUsuarioEmpresa };