import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import propiedadesControllers from '../Controllers/propiedades.js';

import {
    propValidaDatos,
    propValidaFiltros
} from '../Helpers/propiedades.js';


const router = Router();

//agregar propiedad
router.post('/newpropiedad',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('TipoDato','Tipo de dato campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    propValidaDatos,
    validarCampo
],propiedadesControllers.crear);

//editar propiedad
router.put('/updatepropiedad',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idPropiedad','Propiedad campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('TipoDato','Tipo de dato campo obligatorio').not().isEmpty(),
    check('Estado','Estado campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idPropiedad').custom(validarId),
    validarUsuarioEmpresa,
    propValidaDatos,
    validarCampo
],propiedadesControllers.editar);

//listar todas las propiedades
router.post('/getallpropiedad',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('campoOrdenar','Campo ordenar obligatorio').not().isEmpty(),
    check('orden','Orden campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    propValidaFiltros,
    validarCampo
],propiedadesControllers.listarTodas);

//listar propiedades activas
router.post('/getactivaspropiedad',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],propiedadesControllers.listarActivas);

//listar propiedad por id
router.post('/getidpropiedad',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idPropiedad','Propiedad campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idPropiedad').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],propiedadesControllers.listarPorId);

export default router;
