import {Router} from 'express';
import empresaControllers from '../Controllers/empresa.js';
import { check } from 'express-validator';
import { validarRol } from '../Middlewares/validarRoles.js';
import { validarCampo } from '../Middlewares/validarCampos.js';
import { validarJWT } from '../Middlewares/validarJwt.js';


import { EmpvalidarPassRut,
    EmpvalidarEstadoRut,
    EmpvalidarClaveRut
 } from '../Helpers/empresa.js';

const router = Router();


//agregar empresa
router.post('/ajvd845mda93n23lm3x',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    validarCampo
],empresaControllers.crear);

//listar todas las emrpesas
router.get('/listarempresas',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    validarCampo
],empresaControllers.listarTodas);


//listar todas las emrpesas
router.get('/listarempresasactivas',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    validarCampo
],empresaControllers.listarActivas);

//cambiar estado de la empresa
router.put('/cambiarestadoempresa',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','campo obligatorio').not().isEmpty(),
    check('passEmpresa','campo obligatorio').not().isEmpty(),
    check('newEstado','campo obligatorio').not().isEmpty(),
    check('passEmpresa').custom(EmpvalidarPassRut),
    check('newEstado').custom(EmpvalidarEstadoRut),
    validarCampo
],empresaControllers.cambiarEstado)

//cambiar clave de empresa
router.put('/cambiarclaveempresa',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','campo obligatorio').not().isEmpty(),
    check('passEmpresa','campo obligatorio').not().isEmpty(),
    check('newClave','campo obligatorio').not().isEmpty(),
    check('passEmpresa').custom(EmpvalidarPassRut),
    check('newClave').custom(EmpvalidarClaveRut),
    validarCampo
],empresaControllers.cambiarClave)

//cambiar pass de empresa
router.put('/cambiarpassempresa',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','campo obligatorio').not().isEmpty(),
    check('passEmpresa','campo obligatorio').not().isEmpty(),
    check('newPass','campo obligatorio').not().isEmpty(),
    check('passEmpresa').custom(EmpvalidarPassRut),
    check('newPass').custom(EmpvalidarPassRut),
    validarCampo
],empresaControllers.cambiarPass)


//cambiar datos de empresa
router.put('/updateempresa',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','campo obligatorio').not().isEmpty(),
    check('passEmpresa','campo obligatorio').not().isEmpty(),
    check('Nombre','campo obligatorio').not().isEmpty(),
    check('passEmpresa').custom(EmpvalidarPassRut),
    validarCampo
],empresaControllers.actualizarDatos)

//traer empresa por id
router.post('/getempresaid',[
    validarJWT,
    validarRol('ADMINISTRADOR'),
    check('idEmpresa','campo obligatorio').not().isEmpty(),
    validarCampo
],empresaControllers.traerEmpresaPorId);



export default router