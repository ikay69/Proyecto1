import { pool } from '../Database/config.js';
import Existencias from '../Models/existencias.js';
import Movimientos from '../Models/movimientos.js';
import { calcularCostoPromedioPonderado } from './costeoInventario.js';
import { validarPropietarioBolsa } from './existenciaReglas.js';

//Motor unico de movimientos de inventario: toda entrada/salida de existencias del sistema
//(Compras, Ventas, Empenos, Prestamos, Reparaciones, Ajustes) debe pasar por aqui.
//NO abre transaccion propia: asume que el llamador ya hizo beginTransaction sobre `connection`.
//El orden de los pasos es intencional: validar -> bloquear la bolsa (FOR UPDATE) -> rechazar
//una salida mayor al saldo ANTES de escribir nada -> upsert de la bolsa -> recosteo -> kardex.
const registrarMovimiento = async (connection, datos) => {
    const {
        pEmpId, pUsuId, pBodegaId, pArticuloId, pTipoMovimiento, pBolsaEstado, pPropietarioId,
        pCantidad, pCostoUnitario, pMotivo, pTipoOrigen, pOrigenId, pObservaciones
    } = datos;

    //la ausencia de propietario siempre es NULL, nunca 0: Existencias.PropietarioIdClave usa
    //COALESCE(PropietarioId, 0) como centinela de "sin propietario", asi que un 0 explicito
    //chocaria con la bolsa sin dueno y ademas violaria el FK contra Terceros.
    const propietarioId = pPropietarioId ?? null;

    const errorPropietario = validarPropietarioBolsa({ bolsaEstado: pBolsaEstado, propietarioId });
    if (errorPropietario) {
        throw new Error(errorPropietario);
    }

    if (!(Number(pCantidad) > 0)) {
        throw new Error('La cantidad del movimiento debe ser mayor a cero');
    }

    
    const bolsaActual = await Existencias.traerBolsaBloqueada(connection, {
        pEmpId, pBodegaId, pArticuloId, pBolsaEstado, pPropietarioId: propietarioId
    });
    const cantidadActual = bolsaActual ? Number(bolsaActual.Cantidad) : 0; //si no existe coloque cero
    
    if (pTipoMovimiento === 'SALIDA' && cantidadActual < Number(pCantidad)) {
        throw new Error(`Existencia insuficiente en la bolsa ${pBolsaEstado} (disponible: ${cantidadActual})`);
    }

    const delta = pTipoMovimiento === 'SALIDA' ? -Number(pCantidad) : Number(pCantidad);

    //el costo promedio ponderado vive en la propia bolsa de Existencias (ya no en Articulos) y
    //solo se recalcula cuando entra mercancia a la bolsa DISPONIBLE: las demas bolsas son
    //custodia temporal (taller, garantia, reserva) y no alteran el costo.
    if (pTipoMovimiento === 'ENTRADA' && pBolsaEstado === 'DISPONIBLE') {
        const nuevoCosto = calcularCostoPromedioPonderado({
            cantidadActual,
            costoActual: bolsaActual ? bolsaActual.CostoUnitario : null,
            cantidadEntrante: pCantidad,
            costoEntrante: pCostoUnitario
        });
        await Existencias.upsertCantidadYCosto(connection, {
            pEmpId, pBodegaId, pArticuloId, pBolsaEstado, pPropietarioId: propietarioId, pDelta: delta, pCosto: nuevoCosto
        });
    } else {
        await Existencias.upsertCantidad(connection, {
            pEmpId, pBodegaId, pArticuloId, pBolsaEstado, pPropietarioId: propietarioId, pDelta: delta
        });
    }

    const movimientoId = await Movimientos.insertar(connection, {
        pEmpId, pUsuId, pBodegaId, pArticuloId, pTipoMovimiento, pBolsaEstado,
        pPropietarioId: propietarioId, pCantidad, pCostoUnitario: pCostoUnitario ?? null,
        pMotivo, pTipoOrigen, pOrigenId: pOrigenId ?? null, pObservaciones: pObservaciones ?? null
    });

    return movimientoId;
};

//envoltura para un movimiento suelto (endpoint de ajuste): abre y cierra su propia transaccion.
const registrarMovimientoTransaccional = async (datos) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const movimientoId = await registrarMovimiento(connection, datos);
        await connection.commit();
        return movimientoId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

//mueve cantidad de una bolsa a otra en una sola transaccion: o pasan los dos movimientos o
//ninguno. Es el mecanismo que reutilizaran Ventas, Empenos, Prestamos y Reparacion.
const transferirEntreBolsas = async ({ salida, entrada }) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await registrarMovimiento(connection, { ...salida, pTipoMovimiento: 'SALIDA' });
        await registrarMovimiento(connection, { ...entrada, pTipoMovimiento: 'ENTRADA' });
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export { registrarMovimiento, registrarMovimientoTransaccional, transferirEntreBolsas };
