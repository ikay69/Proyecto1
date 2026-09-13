import {Router} from 'express';
import usuarioControllers from '../Controllers/usuario.js';
import { check,body } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { userValidarNombreRut,
    userValidarNomUserRut,
    userValidarPassRut,
    userValidarRolRut
} from '../Helpers/usuario.js'

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
    check('nombres').custom(userValidarNombreRut),
    check('apellidos').custom(userValidarNombreRut),
    check('user').custom(userValidarNomUserRut),
    check('password').custom(userValidarPassRut),
    check('rol').custom(userValidarRolRut),
    validarCampo
],usuarioControllers.crear);


//todos los usuarios
router.post('/getuserall',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('pagina','Numero de pagina campo obligatorio').not().isEmpty(),
    validarCampo
],usuarioControllers.listarTodosUsuarios);

//cambiar password usuario 
router.put('/changepassuser',[
    validarJWT,
    check('pass','campo obligatorio').not().isEmpty(),
    check('passNew','campo obligatorio').not().isEmpty(),
    check('idUsuario','campo obligatorio').not().isEmpty(),
    check('pass').custom(userValidarPassRut),
    check('passNew').custom(userValidarPassRut),
    validarRol('VENDEDOR','ADMINISTRADOR'),
    validarCampo
],usuarioControllers.cambiarPass);


//actualizar datos usuario  
router.put('/updateuser',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idUsuario','campo obligatorio').not().isEmpty(),
    check('nombres','Nombres campo obligatorio').not().isEmpty(),
    check('apellidos','Apellidos campo obligatorio').not().isEmpty(),
    check('user','Usuario campo obligatorio').not().isEmpty(),
    check('rol','Rol campo obligatorio').not().isEmpty(),
    check('nombres').custom(userValidarNombreRut),
    check('apellidos').custom(userValidarNombreRut),
    check('rol').custom(userValidarRolRut),
    validarCampo
],usuarioControllers.actualizar);

router.put('/changestatususer',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    validarCampo
],usuarioControllers.cambiarEstado);



//----------------------------------------





//eliminar usuario falta 
router.delete('/deleteuser',[
    validarJWT,
    check('userid','campo obligatorio').not().isEmpty(),
    check('passEmp','campo obligatorio').not().isEmpty(),
    validarRol('ADMINISTRADOR'),
    validarCampo
],(req,res)=>{res.status(200).json({msg:'trabajando en ello'})});
//],usuarioControllers.Eliminar);

//listar usuarios mmmmm
router.get('/getusersemp',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('orden','campo obligatorio').not().isEmpty(),
    validarCampo
],(req,res)=>{res.status(200).json({msg:'trabajando en ello'})});
//],usuarioControllers.ListarPorEmpresa);


export default router;