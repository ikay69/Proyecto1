import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import tiposDocumentoControllers from '../Controllers/tiposDocumento.js';

import {
    tipoDocValidaDatos,
    tipoDocValidaFiltros
} from '../Helpers/tiposDocumento.js';


const router = Router();

//agregar tipo de documento
router.post('/newtipodocumento',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('Abreviatura','Abreviatura campo obligatorio').not().isEmpty(),
    check('Descripcion','Descripcion campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    tipoDocValidaDatos,
    validarCampo
],tiposDocumentoControllers.crear);

//editar tipo de documento
router.put('/updatetipodocumento',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idTipoDocumento','Tipo de documento campo obligatorio').not().isEmpty(),
    check('Abreviatura','Abreviatura campo obligatorio').not().isEmpty(),
    check('Descripcion','Descripcion campo obligatorio').not().isEmpty(),
    check('Estado','Estado campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idTipoDocumento').custom(validarId),
    validarUsuarioEmpresa,
    tipoDocValidaDatos,
    validarCampo
],tiposDocumentoControllers.editar);

//listar todos los tipos de documento
router.post('/getalltipodocumento',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('campoOrdenar','Campo ordenar obligatorio').not().isEmpty(),
    check('orden','Orden campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    tipoDocValidaFiltros,
    validarCampo
],tiposDocumentoControllers.listarTodas);

//listar tipos de documento activos
router.post('/getactivastipodocumento',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],tiposDocumentoControllers.listarActivas);

//listar tipo de documento por id
router.post('/getidtipodocumento',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idTipoDocumento','Tipo de documento campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idTipoDocumento').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],tiposDocumentoControllers.listarPorId);

export default router;
