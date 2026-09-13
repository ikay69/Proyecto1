import UsuariosEmpresa from '../Models/usuariosEmpesa.js';
import Usuario from "../Models/usuario.js";
import Empresa from '../Models/empresa.js';

const usuEmpExisteRelacion = async({pEmpId,pUsuId})=>{

    if(!Number.isInteger(pEmpId) == true){
        return res.status(401).json({msg:'empresa invalida'});
    }

    if(!Number.isInteger(pUsuId) == true){
        return res.status(401).json({msg:'Usuario invalida'});
    }

    const empresa = await Empresa.traerDatosPorId({pId:pEmpId});
    const usuario = await Usuario.buscarPorId(pUsuId);

    
    
    if (!usuario || !empresa) {
        return res.status(401).json({ msg: 'Usuario o  empresa incorrectos' });
    }

    if (usuario.Estado === 0) {
        return res.status(401).json({ msg: 'El usuario está desactivado' });
    }

    if (empresa.Estado === 0) {
        return res.status(401).json({ msg: 'La empresa está desactivada' });
    }

    const existeRelacion = await UsuariosEmpresa.validarRelacion({pEmpresaId:pEmpId,pUsuarioId:pUsuId});
    if (!existeRelacion) {
        return res.status(401).json({ msg: 'Usuario sin permiso de empresa' });
    }

    if(existeRelacion.Estado == 0){
        return res.status(401).json({ msg: 'Usuario sin permiso de empresa' });
    }
               

    return true;
}


export {
    usuEmpExisteRelacion
}