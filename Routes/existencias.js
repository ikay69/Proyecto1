import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import existenciasControllers from '../Controllers/existencias.js';
import { existenciaValidaFiltros } from '../Helpers/existenciasValidacion.js';

const router = Router();

//listar las bolsas con existencia de un articulo
router.post('/getexistenciasarticulo',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idArticulo','Articulo campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idArticulo').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],existenciasControllers.listarPorArticulo);

//listar todas las existencias de la empresa (paginado)
router.post('/getexistencias',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    existenciaValidaFiltros,
    validarCampo
],existenciasControllers.listarTodo);

export default router;
