import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import ordenesProduccionControllers from '../Controllers/ordenesProduccion.js';
import { ordenProduccionValidaDatos, ordenProduccionValidaFiltros } from '../Helpers/ordenesProduccion.js';

const router = Router();

//registrar una orden de produccion/fundicion (consume articulos y produce articulos)
router.post('/nuevaorden',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    ordenProduccionValidaDatos,
    validarCampo
],ordenesProduccionControllers.crear);

//listado paginado de ordenes de produccion de la empresa
router.post('/getallordenes',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    ordenProduccionValidaFiltros,
    validarCampo
],ordenesProduccionControllers.listarTodas);

//detalle de una orden con los movimientos que genero
router.post('/getidorden',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idOrden','Orden campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idOrden').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],ordenesProduccionControllers.listarPorId);

export default router;
