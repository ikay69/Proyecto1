import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import productosControllers from '../Controllers/productos.js';

import {
    productoValidaDatos,
    productoValidaFiltros
} from '../Helpers/productos.js';


const router = Router();

//agregar producto
router.post('/newproducto',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('idTipoProducto','Tipo de producto campo obligatorio').not().isEmpty(),
    check('idCategoria','Categoria campo obligatorio').not().isEmpty(),
    check('idUnidadMedida','Unidad de medida campo obligatorio').not().isEmpty(),
    check('TipoSeguimiento','Tipo de seguimiento campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idTipoProducto').custom(validarId),
    check('idCategoria').custom(validarId),
    check('idUnidadMedida').custom(validarId),
    validarUsuarioEmpresa,
    productoValidaDatos,
    validarCampo
],productosControllers.crear);

//editar producto
router.put('/updateproducto',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idProducto','Producto campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('idTipoProducto','Tipo de producto campo obligatorio').not().isEmpty(),
    check('idCategoria','Categoria campo obligatorio').not().isEmpty(),
    check('idUnidadMedida','Unidad de medida campo obligatorio').not().isEmpty(),
    check('TipoSeguimiento','Tipo de seguimiento campo obligatorio').not().isEmpty(),
    check('Estado','Estado campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idProducto').custom(validarId),
    check('idTipoProducto').custom(validarId),
    check('idCategoria').custom(validarId),
    check('idUnidadMedida').custom(validarId),
    validarUsuarioEmpresa,
    productoValidaDatos,
    validarCampo
],productosControllers.editar);

//listar todos los productos (paginado)
router.post('/getallproducto',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('campoOrdenar','Campo ordenar obligatorio').not().isEmpty(),
    check('orden','Orden campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    productoValidaFiltros,
    validarCampo
],productosControllers.listarTodas);

//listar productos activos (paginado, misma lógica que listarTodas pero filtrado por Estado)
router.post('/getactivasproducto',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('campoOrdenar','Campo ordenar obligatorio').not().isEmpty(),
    check('orden','Orden campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    productoValidaFiltros,
    validarCampo
],productosControllers.listarActivas);

//listar producto por id
router.post('/getidproducto',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idProducto','Producto campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idProducto').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],productosControllers.listarPorId);

export default router;
