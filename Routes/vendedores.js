import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import vendedoresControllers from '../Controllers/vendedores.js';

import {
    vdrValidaNombre,
    vdrValidaFiltros
} from '../Helpers/vendedores.js';


const router = Router();

//agregar vendedor
router.post('/newvendedor',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    vdrValidaNombre,
    validarCampo
],vendedoresControllers.crear);

//editar vendedor
router.put('/updatevendedor',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idVendedor','Vendedor campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('Estado','Estado campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idVendedor').custom(validarId),
    validarUsuarioEmpresa,
    vdrValidaNombre,
    validarCampo
],vendedoresControllers.editar);

//listar todos los vendedores
//estadoFiltro es opcional: 0 o ausente trae todos, 1 solo activos, 2 solo inactivos
router.post('/getallvendedor',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('campoOrdenar','Campo ordenar obligatorio').not().isEmpty(),
    check('orden','Orden campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    vdrValidaFiltros,
    validarCampo
],vendedoresControllers.listarTodos);

//listar vendedores activos
router.post('/getactivosvendedor',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],vendedoresControllers.listarActivos);

//listar vendedor por id
router.post('/getidvendedor',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idVendedor','Vendedor campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idVendedor').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],vendedoresControllers.listarPorId);

export default router;
