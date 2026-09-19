import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import comprasControllers from '../Controllers/compras.js';
import { compraValidaDatos, compraValidaFiltros } from '../Helpers/compras.js';

const router = Router();

//registrar una compra (por ahora solo la modalidad CONTADO)
router.post('/newcompra',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idTercero','Tercero campo obligatorio').not().isEmpty(),
    check('TipoCompra','Tipo de compra campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idTercero').custom(validarId),
    validarUsuarioEmpresa,
    compraValidaDatos,
    validarCampo
],comprasControllers.crear);

//listado paginado de compras de la empresa
router.post('/getallcompra',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    compraValidaFiltros,
    validarCampo
],comprasControllers.listarTodas);

//cabecera + lineas de una compra
router.post('/getidcompra',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idCompra','Compra campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idCompra').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],comprasControllers.listarPorId);

export default router;
