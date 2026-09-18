
import UsuariosEmpresa from '../Models/usuariosEmpesa.js';
import {
    usuEmpExisteRelacion
} from '../Helpers/usuariosEmpresa.js';

const usuariosEmpresaControllers = {
    crearRelacion: async(req,res)=>{
        try {
            const {idEmpresa,idUsuario} = req.body;
            //console.log('control usuarioempresa crear 8 emp ',idEmpresa,' usu ',idUsuario);
            
            if(!Number.isInteger(idEmpresa) == true){
                return res.status(401).json({msg:'empresa invalida'});
            }

            if(!Number.isInteger(idUsuario) == true){
                return res.status(401).json({msg:'Usuario invalida'});
            }
            
            
            const usuarioLoginRol = req.usuario.Rol;
            const usuarioLoginId= req.usuario.Id;
            const empresaLogin = req.empresa.Id;

            if(usuarioLoginRol !== 'ADMINISTRADOR'){
                return res.status(401).json({msg:'Usuario sin permiso'});
            }
          
            var validacion = await usuEmpExisteRelacion({pEmpId:idEmpresa,pUsuId:usuarioLoginId});
            if(!validacion){
                return res.status(401).json({msg:validacion});
            }
            
            const existeRelacionNew = await UsuariosEmpresa.validarRelacion({pEmpresaId:idEmpresa,pUsuarioId:idUsuario});
            if(existeRelacionNew){
                return res.status(401).json({ msg: 'Usuario ya tiene relacion' });
            }
           
            //console.log('control usuarioempresa crear 27');
            const usuariosempresa = await UsuariosEmpresa.crear({pEmpresaId:idEmpresa,pUsuarioId:idUsuario})
           // console.log('control usuarioempresa crear 28');

            
            return res.status(200).json({msg:"Usuario asignado"})
        } catch (error) {
            return res.status(500).json({msg:error});
        }
    },

    usuariosSinMiEmpresa:async(req,res)=>{
        try {
            
            const {idEmpresa} = req.body;

            const usuarioLoginId = req.usuario.Id;
            const usuarioLoginRol = req.usuario.Rol;
            const empresaLoginId = req.empresa.Id;

            if(usuarioLoginRol !== 'ADMINISTRADOR'){
                return res.status(401).json({msg:'Usuario sin permiso'});
            }

            var validacion = await usuEmpExisteRelacion({pEmpId:idEmpresa,pUsuId:usuarioLoginId});
            if(!validacion){
                return res.status(401).json({msg:validacion});
            }

            const usuarios = await UsuariosEmpresa.usuariosSinMiEmpresa({pEmpresaId:idEmpresa});
       
            return res.status(200).json({data:usuarios})
        } catch (error) {
            return res.status(500).json({msg:error})
        }
    },

    usuariosConMiEmpresa:async(req,res)=>{
        try {
            const {idEmpresa} = req.body; 
            
            
            const usuarios = await UsuariosEmpresa.usuariosDeEmpresa({pEmpresaId:idEmpresa});

            return res.status(200).json({data:usuarios});
        } catch (error) {
            res.status(400).json({ msg: error.message || 'Error interno del servidor'});
        }
        
    }
}

export default usuariosEmpresaControllers;