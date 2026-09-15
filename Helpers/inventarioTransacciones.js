import { pool } from '../Database/config.js';
import Existencias from '../Models/existencias.js';
import Movimientos from '../Models/movimientos.js';
import Articulos from '../Models/articulos.js';
import { calcularCostoPromedioPonderado } from './costeoInventario.js';
import { validarPropietarioBolsa } from './existenciaReglas.js';

//Motor unico de movimientos de inventario: toda entrada/salida de existencias del sistema
//(Compras, Ventas, Empenos, Prestamos, Reparaciones, Ajustes) debe pasar por aqui.
//NO abre transaccion propia: asume que el llamador ya hizo beginTransaction sobre `connection`.
//El orden de los pasos es intencional: validar -> bloquear la bolsa (FOR UPDATE) -> rechazar
//una salida mayor al saldo ANTES de escribir nada -> upsert de la bolsa -> recosteo -> kardex.
const registrarMovimiento = async (connection, datos) => {
    const {
        pEmpId, pUsuId, pArticuloId, pTipoMovimiento, pBolsaEstado, pPropietarioId,
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
        pEmpId, pArticuloId, pBolsaEstado, pPropietarioId: propietarioId
    });
    const cantidadActual = bolsaActual ? Number(bolsaActual.Cantidad) : 0;

    if (pTipoMovimiento === 'SALIDA' && cantidadActual < Number(pCantidad)) {
        throw new Error(`Existencia insuficiente en la bolsa ${pBolsaEstado} (disponible: ${cantidadActual})`);
    }

    const delta = pTipoMovimiento === 'SALIDA' ? -Number(pCantidad) : Number(pCantidad);

    await Existencias.upsertCantidad(connection, {
        pEmpId, pArticuloId, pBolsaEstado, pPropietarioId: propietarioId, pDelta: delta
    });

    //el costo promedio ponderado solo se recalcula cuando entra mercancia a la bolsa DISPONIBLE:
    //las demas bolsas son custodia temporal (taller, garantia, reserva) y no alteran el costo.
    if (pTipoMovimiento === 'ENTRADA' && pBolsaEstado === 'DISPONIBLE') {
        const articulo = await Articulos.traerPorIdConexion(connection, { pId: pArticuloId, pEmpId });
        const nuevoCosto = calcularCostoPromedioPonderado({
            cantidadActual,
            costoActual: articulo ? articulo.CostoUnitario : null,
            cantidadEntrante: pCantidad,
            costoEntrante: pCostoUnitario
        });
        await Articulos.editarCostoConexion(connection, { pEmpId, pId: pArticuloId, pCosto: nuevoCosto });
    }

    const movimientoId = await Movimientos.insertar(connection, {
        pEmpId, pUsuId, pArticuloId, pTipoMovimiento, pBolsaEstado,
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
