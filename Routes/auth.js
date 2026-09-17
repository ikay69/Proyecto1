import { Router } from 'express';
import { body } from 'express-validator';
import authControllers from '../Controllers/auth.js';
import { validarCampo } from '../Middlewares/validarCampos.js';

const router = Router();

router.post('/', [
  body('nombre', 'Usuario obligatorio').notEmpty().trim(),
  body('password', 'Password obligatorio').notEmpty(),
  body('clave', 'Clave de empresa obligatoria').notEmpty().trim(),
  validarCampo
], authControllers.login);

export default router;
