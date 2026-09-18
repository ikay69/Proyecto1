import bcryptjs from 'bcryptjs';
import Usuario from '../Models/usuario.js';
import Empresa from '../Models/empresa.js';
import UsuariosEmpresa from '../Models/usuariosEmpesa.js';
import { generarJWT } from '../Middlewares/validarJwt.js';

const authControllers = {
    login: async (req, res) => {
        try {
            const { nombre, password, clave } = req.body;
            
            const usuario = await Usuario.buscarPorUsername(nombre);
            const empresa = await Empresa.buscarPorClave(clave);
            
            //console.log('auth controller 19:',usuario);
            //console.log('auth controller 20:',empresa);


            if (!usuario || !empresa) {
                return res.status(401).json({ msg: 'Usuario, contraseña o clave de empresa incorrectos' });
            }

            if (usuario.Estado === 0) {
                return res.status(401).json({ msg: 'El usuario está desactivado' });
            }

            if (empresa.Estado === 0) {
                return res.status(401).json({ msg: 'La empresa está desactivada' });
            }

            const passwordCorrecta = await bcryptjs.compareSync(password, usuario.Pass);
            if (!passwordCorrecta) {
                return res.status(401).json({ msg: 'Usuario, contraseña o clave de empresa incorrectos' });
            }
            

            const usuariosEmpresa = await UsuariosEmpresa.validarRelacion({pEmpresaId:empresa.Id,pUsuarioId:usuario.Id});
            //console.log('auth controller 42:',usuariosEmpresa);
            
            if (!usuariosEmpresa) {
                return res.status(401).json({ msg: 'El usuario no está asignado a esta empresa' });
            }

            if(usuariosEmpresa.Estado === 0){
               return res.status(401).json({ msg: 'Usuario, contraseña o clave de empresa incorrectos' }); 
            }

            const token = await generarJWT(usuario.Id, empresa.Clave);
            //console.log('auth controller 53 token:',token);


            const empresas = await UsuariosEmpresa.empresasDeUsuario({pUsuarioId:usuario.Id})

            const nuevoArray = empresas.map(({ empId, empNombre }) => ({
                Id: empId,
                Nombre: empNombre
            }));

            return res.json(    {
                "token": token,
                "usuario": usuario.Nombres,
                "empresas": nuevoArray,
                "rol": usuario.Rol
            })
            
        } catch (error) {
            console.error(error);
            return res.status(401).json({ msg: error.message || 'Error interno del servidor' });
        }
    
    }
};


export default authControllers;