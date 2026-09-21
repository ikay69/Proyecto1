import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import comprasControllers from '../Controllers/compras.js';
import { compraValidaDatos, compraValidaFiltros, compraValidaAnulacion } from '../Helpers/compras.js';
import { cuotaValidaDatos, cuotaValidaEdicion } from '../Helpers/compraCuotas.js';

const router = Router();

//registrar una compra, de CONTADO o a CREDITO
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

//anular una compra: la unica operacion correctiva, porque no existe edicion. No revierte
//inventario ni caja.
router.put('/anularcompra',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idCompra','Compra campo obligatorio').not().isEmpty(),
    check('MotivoAnulacion','Motivo de anulación campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idCompra').custom(validarId),
    validarUsuarioEmpresa,
    compraValidaAnulacion,
    validarCampo
],comprasControllers.anular);

//---- cuotas de una compra a credito (desglose opcional e informativo) ----
//
//Los tres leen del CUERPO de la peticion, incluido el DELETE: express.json() parsea el cuerpo
//sin importar el metodo, y asi estos endpoints mantienen la forma del resto del proyecto.

//agregar una cuota a una compra ya creada
router.post('/newcompracuota',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idCompra','Compra campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idCompra').custom(validarId),
    validarUsuarioEmpresa,
    cuotaValidaDatos,
    validarCampo
],comprasControllers.crearCuota);

//cambiar numero, valor, fecha o estado de una cuota
router.put('/updatecompracuota',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idCuota','Cuota campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idCuota').custom(validarId),
    validarUsuarioEmpresa,
    cuotaValidaEdicion,
    validarCampo
],comprasControllers.actualizarCuota);

//borrado REAL: es el unico DELETE del proyecto. CompraCuotas no tiene columna de estado de
//fila, sus datos son informativos y nada apunta a ellos.
router.delete('/deletecompracuota',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idCuota','Cuota campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idCuota').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],comprasControllers.eliminarCuota);

export default router;
