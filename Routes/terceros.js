import {Router} from 'express';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';
import { validarUsuarioEmpresa } from '../Middlewares/validarUsuarioEmpresa.js';
import { validarId } from '../Middlewares/validaId.js';
import tercerosControllers from '../Controllers/terceros.js';

import {
    terceroValidaDatos,
    terceroValidaFiltros
} from '../Helpers/terceros.js';


const router = Router();

//agregar tercero
router.post('/newtercero',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('Apellidos','Apellidos campo obligatorio').not().isEmpty(),
    check('idTipoDocumento','Tipo de documento campo obligatorio').not().isEmpty(),
    check('NumeroDocumento','Numero de documeto campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idTipoDocumento').custom(validarId),
    //check('idTipoDocumento').optional({checkFalsy:true}).custom(validarId),
    validarUsuarioEmpresa,
    terceroValidaDatos,
    validarCampo
],tercerosControllers.crear);

//editar tercero
router.put('/updatetercero',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idTercero','Tercero campo obligatorio').not().isEmpty(),
    check('Nombre','Nombre campo obligatorio').not().isEmpty(),
    check('Apellidos','Apellidos campo obligatorio').not().isEmpty(),
    check('idTipoDocumento','Tipo de documeto campo obligatorio').not().isEmpty(),
    check('NumeroDocumento','Numero de documeto campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idTercero').custom(validarId),
    check('idTipoDocumento').custom(validarId),
    //check('idTipoDocumento').optional({checkFalsy:true}).custom(validarId),
    validarUsuarioEmpresa,
    terceroValidaDatos,
    validarCampo
],tercerosControllers.editar);

//listar todos los terceros
router.post('/getalltercero',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('campoOrdenar','Campo ordenar obligatorio').not().isEmpty(),
    check('orden','Orden campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    terceroValidaFiltros,
    validarCampo
],tercerosControllers.listarTodas);

//listar terceros activos
router.post('/getactivastercero',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('campoOrdenar','Campo ordenar obligatorio').not().isEmpty(),
    check('orden','Orden campo obligatorio').not().isEmpty(),
    check('pagina','Pagina campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    validarUsuarioEmpresa,
    terceroValidaFiltros,
    validarCampo
],tercerosControllers.listarActivas);

//listar tercero por id
router.post('/getidtercero',[
    validarJWT,
    validarRol('ADMINISTRADOR','VENDEDOR'),
    check('idEmpresa','Empresa campo obligatorio').not().isEmpty(),
    check('idTercero','Tercero campo obligatorio').not().isEmpty(),
    check('idEmpresa').custom(validarId),
    check('idTercero').custom(validarId),
    validarUsuarioEmpresa,
    validarCampo
],tercerosControllers.listarPorId);

export default router;
