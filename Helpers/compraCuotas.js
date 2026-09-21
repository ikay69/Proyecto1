//validaciones de ruta de las cuotas sueltas -- las que se agregan o editan DESPUES de crear la
//compra. Las cuotas que vienen dentro del payload de /newcompra las valida
//validarCuotasCompra, en Helpers/compraCalculos.js.

import { esFechaValida } from './fechas.js';
import { ESTADOS_CUOTA } from './compraCalculos.js';

//estos middlewares validan la FORMA del payload y nada mas. El tope superior de NumCuota es el
//NumeroCuotas de la compra, que hay que leer de la base: eso lo hace el Controller.
const cuotaValidaDatos = async (req,res,next) => {
    const {NumCuota, ValorCuota, FechaPago, Estado} = req.body;

    if (!Number.isInteger(NumCuota) || NumCuota < 1) {
        return res.status(401).json({msg:'El número de cuota debe ser un entero mayor o igual a 1'});
    }
    if (isNaN(Number(ValorCuota)) || Number(ValorCuota) <= 0) {
        return res.status(401).json({msg:'El valor de la cuota debe ser mayor a cero'});
    }
    if (FechaPago !== undefined && FechaPago !== null && FechaPago !== '') {
        if (!esFechaValida(FechaPago)) {
            return res.status(401).json({msg:'La fecha de pago de la cuota es inválida'});
        }
    }
    if (Estado !== undefined && Estado !== null) {
        if (!ESTADOS_CUOTA.includes(Estado)) {
            return res.status(401).json({msg:'El estado de la cuota debe ser PENDIENTE o CANCELADA'});
        }
    }

    next();
};

//los cuatro campos son opcionales por separado, pero al menos uno tiene que venir: una
//peticion que no cambia nada responderia 200 sin haber hecho nada, que es peor que un error.
//FechaPago = null SI es un cambio valido: es como se vacia una fecha ya puesta.
const cuotaValidaEdicion = async (req,res,next) => {
    const {NumCuota, ValorCuota, FechaPago, Estado} = req.body;
    const viene = (valor) => valor !== undefined;

    if (!viene(NumCuota) && !viene(ValorCuota) && !viene(FechaPago) && !viene(Estado)) {
        return res.status(401).json({msg:'No hay nada que actualizar en la cuota'});
    }

    if (viene(NumCuota) && (!Number.isInteger(NumCuota) || NumCuota < 1)) {
        return res.status(401).json({msg:'El número de cuota debe ser un entero mayor o igual a 1'});
    }
    if (viene(ValorCuota) && (isNaN(Number(ValorCuota)) || Number(ValorCuota) <= 0)) {
        return res.status(401).json({msg:'El valor de la cuota debe ser mayor a cero'});
    }
    if (viene(FechaPago) && FechaPago !== null && FechaPago !== '' && !esFechaValida(FechaPago)) {
        return res.status(401).json({msg:'La fecha de pago de la cuota es inválida'});
    }
    if (viene(Estado) && !ESTADOS_CUOTA.includes(Estado)) {
        return res.status(401).json({msg:'El estado de la cuota debe ser PENDIENTE o CANCELADA'});
    }

    next();
};

export { cuotaValidaDatos, cuotaValidaEdicion };
