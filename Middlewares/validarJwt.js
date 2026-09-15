import jwt from 'jsonwebtoken';
import Empresa from '../Models/empresa.js';
import Usuario from '../Models/usuario.js';
import UsuariosEmpresa from '../Models/usuariosEmpesa.js';


const generarJWT = (uid = '', uclave = '') => {
  return new Promise((resolve, reject) => {
    const payload = { uid, uclave };

    jwt.sign(payload, process.env.SECREPRIVATEKEY, { expiresIn: '1d' }, (err, token) => {
      if (err) return reject(new Error('No se pudo generar token'));
      resolve(token);
    });
  });
};

const validarJWT = async (req, res, next) => {
  const token = req.header('token');

  if (!token) {
    return res.status(401).json({ msg: 'No hay token en la petición' });
  }

  try {
  
    const { uid, uclave } = jwt.verify(token, process.env.SECREPRIVATEKEY);
    const empresa = await Empresa.buscarPorClave(uclave);
    const usuario = await Usuario.buscarPorIdJwt(uid);
    const usuarioEmpresa = await UsuariosEmpresa.validarRelacion({pEmpresaId:empresa.Id,pUsuarioId:uid})
    
    console.log('validarjwt 28 empresa:',empresa);
    console.log('validarjwt 28 user:',usuario);
    
    if (!usuario || !empresa || !usuarioEmpresa) {
        return res.status(401).json({ msg: 'Usuario o incorrecto con empresa' });
    }


    if(usuario.Estado  === 0 ){
      return res.status(401).json({msg:'usuario desactivado con ese tocken'})
    }

    if(empresa.Estado  === 0){
      return res.status(401).json({msg:'empresa desactivado con ese tocken'})
    }

    if(usuarioEmpresa.Estado  === 0){
      return res.status(401).json({msg:'empresa desactivado con ese tocken'})
    }

    req.empresa = empresa
    req.usuario = usuario
    next();
  } catch (error) {
    return res.status(400).json({ msg: 'Token no válido f' });
  }
}
export { generarJWT,validarJWT };