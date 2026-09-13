import {Router} from 'express';
import { check,body } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import unidadesMedidaControllers from '../Controllers/unidadesMedida.js';

import {
    undMedValidaNombreSimbolo,
    undMedValidaFiltros
} from '../Helpers/unidadesMedida.js';


const router = Router();

//agregar unidad de medida
router.post('/newunidadmedida',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('Simbolo','Simbolo campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    undMedValidaNombreSimbolo,
    validarCampo
],unidadesMedidaControllers.crear);

//editar unidad de medida
router.put('/updateunidadmedida',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idUnidadMedida','Empresa campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('Simbolo','Simbolo campo obligatorio').not().isEmpty(),
    check('Estado','Estado campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idUnidadMedida').custom(validarId),
    validarUsuarioEmpresa,
    undMedValidaNombreSimbolo,
    validarCampo
],unidadesMedidaControllers.editar);

//listar todas las unidades de medidad
router.post('/getunidadesmedida',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('campoOrdenar','Empresa campo obligatorio').not().isEmpty(),
    check('orden','Empresa campo obligatorio').not().isEmpty(),
    check('pagina','Empresa campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    undMedValidaFiltros,
    validarCampo
],unidadesMedidaControllers.listarTodas);

//listar unidades de medidas activas
router.post('/getunidadesmedidaactivas',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],unidadesMedidaControllers.listarActivas);

//listar unidades de medidas por id
router.post('/getidunidadesmedida',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idUnidadMedida','Empresa campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idUnidadMedida').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],unidadesMedidaControllers.listarPorId);

export default router;