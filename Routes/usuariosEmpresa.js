import {Router} from 'express';
import { check,body } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import usuariosEmpresaControllers from '../Controllers/usuariosEmpresa.js';

const router = Router();

//crear relacon
router.post('/newrelacionusuarioempresa',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idUsuario','Usuario campo obligatorio').not().isEmpty(),
    validarCampo
],usuariosEmpresaControllers.crearRelacion);


router.post('/getusuariossinmiempresa',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    validarCampo
],usuariosEmpresaControllers.usuariosSinMiEmpresa);

export default router;