import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import bodegasControllers from '../Controllers/bodegas.js';

import {
    bodValidaNombre,
    bodValidaFiltros
} from '../Helpers/bodegas.js';


const router = Router();

//agregar bodega
router.post('/newbodega',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    bodValidaNombre,
    validarCampo
],bodegasControllers.crear);

//editar bodega
router.put('/updatebodega',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idBodega','Bodega campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('Estado','Estado campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idBodega').custom(validarId),
    validarUsuarioEmpresa,
    bodValidaNombre,
    validarCampo
],bodegasControllers.editar);

//listar todas las bodegas
router.post('/getallbodega',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('campoOrdenar','Campo ordenar obligatorio').not().isEmpty(),
    check('orden','Orden campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    bodValidaFiltros,
    validarCampo
],bodegasControllers.listarTodas);

//listar bodegas activas
router.post('/getactivasbodega',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],bodegasControllers.listarActivas);

//listar bodega por id
router.post('/getidbodega',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idBodega','Bodega campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idBodega').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],bodegasControllers.listarPorId);

export default router;
