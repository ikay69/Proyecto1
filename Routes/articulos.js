import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import articulosControllers from '../Controllers/articulos.js';

import {
    articuloValidaDatos,
    articuloValidaFiltros,
    articuloValidaCosto
} from '../Helpers/articulos.js';

const router = Router();

//agregar articulo
router.post('/newarticulo',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idProducto','Producto campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idProducto').custom(validarId),
    validarUsuarioEmpresa,
    articuloValidaDatos,
    validarCampo
],articulosControllers.crear);

//editar articulo
router.put('/updatearticulo',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idArticulo','Articulo campo obligatorio').not().isEmpty(),
    check('idProducto','Producto campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idArticulo').custom(validarId),
    check('idProducto').custom(validarId),
    validarUsuarioEmpresa,
    articuloValidaDatos,
    validarCampo
],articulosControllers.editar);

//editar solo el costo unitario del articulo
router.put('/updatecostoarticulo',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idArticulo','Articulo campo obligatorio').not().isEmpty(),
    check('nuevoCosto','Nuevo costo campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idArticulo').custom(validarId),
    validarUsuarioEmpresa,
    articuloValidaCosto,
    validarCampo
],articulosControllers.editarCosto);

//listar todos los articulos (paginado)
router.post('/getallarticulo',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('campoOrdenar','Campo ordenar obligatorio').not().isEmpty(),
    check('orden','Orden campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    articuloValidaFiltros,
    validarCampo
],articulosControllers.listarTodas);

//listar articulos activos y vendibles (paginado)
router.post('/getactivasarticulo',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('campoOrdenar','Campo ordenar obligatorio').not().isEmpty(),
    check('orden','Orden campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    articuloValidaFiltros,
    validarCampo
],articulosControllers.listarActivas);

//listar articulos vendibles con existencia disponible (ventanilla de venta, paginado)
router.post('/getvendiblesarticulo',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('campoOrdenar','Campo ordenar obligatorio').not().isEmpty(),
    check('orden','Orden campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    articuloValidaFiltros,
    validarCampo
],articulosControllers.listarVendibles);

//listar articulo por id (incluye sus propiedades)
router.post('/getidarticulo',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idArticulo','Articulo campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idArticulo').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],articulosControllers.listarPorId);

export default router;
