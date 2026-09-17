import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import categoriasControllers from '../Controllers/categorias.js';

import {
    catValidaNombre,
    catValidaFiltros
} from '../Helpers/categorias.js';


const router = Router();

//agregar categoria
router.post('/newcategoria',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    catValidaNombre,
    validarCampo
],categoriasControllers.crear);

//editar categoria
router.put('/updatecategoria',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idCategoria','Categoria campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('Estado','Estado campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idCategoria').custom(validarId),
    validarUsuarioEmpresa,
    catValidaNombre,
    validarCampo
],categoriasControllers.editar);

//listar todas las categorias
router.post('/getallcategoria',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('campoOrdenar','Campo ordenar obligatorio').not().isEmpty(),
    check('orden','Orden campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    catValidaFiltros,
    validarCampo
],categoriasControllers.listarTodas);

//listar categorias activas
router.post('/getactivascategoria',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],categoriasControllers.listarActivas);

//listar categoria por id
router.post('/getidcategoria',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idCategoria','Categoria campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idCategoria').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],categoriasControllers.listarPorId);

export default router;
