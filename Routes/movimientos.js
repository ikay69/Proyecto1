import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import movimientosControllers from '../Controllers/movimientos.js';
import { movimientoValidaAjuste, movimientoValidaKardexFiltros } from '../Helpers/movimientos.js';

const router = Router();

//registrar un ajuste manual de inventario (entrada/salida suelta)
router.post('/newajuste',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idArticulo','Articulo campo obligatorio').not().isEmpty(),
    check('TipoMovimiento','Tipo de movimiento campo obligatorio').not().isEmpty(),
    check('BolsaEstado','Bolsa de existencia campo obligatorio').not().isEmpty(),
    check('Cantidad','Cantidad campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idArticulo').custom(validarId),
    validarUsuarioEmpresa,
    movimientoValidaAjuste,
    validarCampo
],movimientosControllers.crearAjuste);

//kardex de movimientos de un articulo en un rango de fechas (paginado)
router.post('/getkardex',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idArticulo','Articulo campo obligatorio').not().isEmpty(),
    check('fechaInicio','Fecha inicio campo obligatorio').not().isEmpty(),
    check('fechaFin','Fecha fin campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idArticulo').custom(validarId),
    validarUsuarioEmpresa,
    movimientoValidaKardexFiltros,
    validarCampo
],movimientosControllers.listarKardex);

export default router;
