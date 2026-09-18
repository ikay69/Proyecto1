import {Router} from 'express';
import { check,body } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import usuariosEmpresaControllers from '../Controllers/usuariosEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';

import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';

const router = Router();

//crear relacon
router.post('/newrelacionusuarioempresa',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idUsuario','Usuario campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idUsuario').custom(validarId),
    validarCampo
],usuariosEmpresaControllers.crearRelacion);

// usuarios que no estan en mi empresa
router.post('/getusuariossinmiempresa',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    validarCampo
],usuariosEmpresaControllers.usuariosSinMiEmpresa);

//usuarios que estan en mi empresa
router.post('/getusuariosconmiempresa',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],usuariosEmpresaControllers.usuariosConMiEmpresa);

export default router;