import {Router} from 'express';
import usuarioControllers from '../Controllers/usuario.js';
import { check,body } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { 
    usuValidarCrear,
    usuValidarPassRut,
    usuValidarEditar
} from '../Helpers/usuario.js'

import { validarId } from '../Middlewares/validaId.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';

const router = Router();

//agregar usuario 
router.post('/newusuer',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('nombres','Nombres campo obligatorio').not().isEmpty(),
    check('apellidos','Apellidos campo obligatorio').not().isEmpty(),
    check('user','Usuario campo obligatorio').not().isEmpty(),
    check('password','Contraseña campo obligatorio').not().isEmpty(),
    check('rol','Rol campo obligatorio').not().isEmpty(),
    usuValidarCrear,
    validarCampo
],usuarioControllers.crear);


//todos los usuarios
router.post('/getuserall',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('pagina','Numero de pagina campo obligatorio').not().isEmpty(),
    validarCampo
],usuarioControllers.listarTodosUsuarios);



router.post('/getidusuario',[
  validarJWT,  
  validarRol('ADMINISTRADOR','VENDEDOR'),
  check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
  check('idUsuario','Empresa campo obligatorio').not().isEmpty(),
  check('idEmpresa').custom(validarId),
  check('idUsuario').custom(validarId),
  validarUsuarioEmpresa,
  validarCampo
],usuarioControllers.ListarPorId);


//cambiar password usuario 
router.put('/changepassuser',[
    validarJWT,
    check('idUsuario').custom(validarId),
    check('pass','campo obligatorio').not().isEmpty(),
    check('passNew','campo obligatorio').not().isEmpty(),
    check('idUsuario','campo obligatorio').not().isEmpty(),
    validarRol('VENDEDOR','ADMINISTRADOR'),
    usuValidarPassRut,
    validarCampo
],usuarioControllers.cambiarPass);


//actualizar datos usuario  
router.put('/updateuser',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','campo obligatorio').not().isEmpty(),
    check('idUsuario','campo obligatorio').not().isEmpty(),
    check('nombres','Nombres campo obligatorio').not().isEmpty(),
    check('apellidos','Apellidos campo obligatorio').not().isEmpty(),
    check('user','Usuario campo obligatorio').not().isEmpty(),
    check('rol','Rol campo obligatorio').not().isEmpty(),
    check('estado','estado campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idUsuario').custom(validarId),
    validarUsuarioEmpresa,
    usuValidarEditar,
    validarCampo
],usuarioControllers.actualizar);




//----------------------------------------


export default router;