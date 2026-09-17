import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import tiposProductoControllers from '../Controllers/tiposProducto.js';

import {
    tipoProdValidaNombre,
    tipoProdValidaFiltros
} from '../Helpers/tiposProducto.js';


const router = Router();

//agregar tipo de producto
router.post('/newtipoproducto',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    tipoProdValidaNombre,
    validarCampo
],tiposProductoControllers.crear);

//editar tipo de producto
router.put('/updatetipoproducto',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idTipoProducto','Tipo de producto campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('Estado','Estado campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idTipoProducto').custom(validarId),
    validarUsuarioEmpresa,
    tipoProdValidaNombre,
    validarCampo
],tiposProductoControllers.editar);

//listar todos los tipos de producto
router.post('/getalltipoproducto',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('campoOrdenar','Campo ordenar obligatorio').not().isEmpty(),
    check('orden','Orden campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    tipoProdValidaFiltros,
    validarCampo
],tiposProductoControllers.listarTodas);

//listar tipos de producto activos
router.post('/getactivastipoproducto',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],tiposProductoControllers.listarActivas);

//listar tipo de producto por id
router.post('/getidtipoproducto',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idTipoProducto','Tipo de producto campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idTipoProducto').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],tiposProductoControllers.listarPorId);

export default router;
