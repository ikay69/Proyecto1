import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import ventasControllers from '../Controllers/ventas.js';
import { ventaValidaDatos, ventaValidaFiltros } from '../Helpers/ventas.js';

const router = Router();

//registrar una venta (por ahora solo la modalidad CONTADO)
//idVendedor es opcional y NO lleva check(...).custom(validarId): validarId exige un entero y
//reventaria contra el campo ausente, volviendolo obligatorio. Lo valida ventaValidaDatos.
router.post('/newventa',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idTercero','Tercero campo obligatorio').not().isEmpty(),
    check('TipoVenta','Tipo de venta campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idTercero').custom(validarId),
    validarUsuarioEmpresa,
    ventaValidaDatos,
    validarCampo
],ventasControllers.crear);

//listado paginado de ventas de la empresa
//idVendedor filtra: ausente o 0 todas, -1 solo las que no tienen vendedor, un id positivo solo
//las de ese vendedor. Lo valida ventaValidaFiltros, por lo mismo que en newventa.
router.post('/getallventa',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    ventaValidaFiltros,
    validarCampo
],ventasControllers.listarTodas);

//cabecera + lineas de una venta
router.post('/getidventa',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idVenta','Venta campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idVenta').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],ventasControllers.listarPorId);

export default router;
