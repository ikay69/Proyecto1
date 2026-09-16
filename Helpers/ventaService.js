import { pool } from '../Database/config.js';
import Ventas from '../Models/ventas.js';
import VentaDetalles from '../Models/ventaDetalles.js';
import TercerosRoles from '../Models/tercrosRoles.js';
import { registrarMovimiento } from './inventarioTransacciones.js';
import { calcularSubtotalLineas, calcularSaldoVenta, validarSaldoContado } from './ventaCalculos.js';

//agrupa lineas repetidas del mismo articulo en una sola (uq_ventadetalle_articulo no
//permite dos filas del mismo ArticuloId en la misma venta), sumando cantidades. Si el
//mismo articulo llega con precios distintos, se rechaza en vez de adivinar cual usar.
const agruparLineasPorArticulo = (articulos) => {
    const porArticulo = new Map();
    for (const item of articulos) {
        const anterior = porArticulo.get(item.idArticulo);
        if (anterior) {
            if (Number(anterior.PrecioVentaUnidad) !== Number(item.PrecioVentaUnidad)) {
                throw new Error(`El artículo ${item.idArticulo} viene repetido con precios distintos`);
            }
            anterior.Cantidad += Number(item.Cantidad);
        } else {
            porArticulo.set(item.idArticulo, {
                idArticulo: item.idArticulo,
                ArticuloNombre: item.ArticuloNombre,
                Cantidad: Number(item.Cantidad),
                PrecioVentaUnidad: Number(item.PrecioVentaUnidad)
            });
        }
    }
    return Array.from(porArticulo.values());
};

//Venta al contado: valida el saldo ANTES de tocar la base de datos, luego en una sola
//transaccion crea la cabecera, las lineas, y descuenta existencias via registrarMovimiento
//(una llamada por linea). Si cualquier articulo no tiene existencia suficiente, se revierte
//todo -- cabecera, lineas y cualquier movimiento ya aplicado.
const crearVentaContado = async ({
    pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
    pValorDescuento, pValorEfectivo, pValorTransaccion, articulosVendidos
}) => {
    //toda la validacion vive fuera de la transaccion: una venta invalida (saldo != 0, sin
    //lineas, mismo articulo con precios distintos) ni siquiera abre conexion.
    //calcularSubtotalLineas ya rechaza el arreglo vacio, no hace falta repetir esa guarda.
    const lineasAgrupadas = agruparLineasPorArticulo(articulosVendidos ?? []);
    const subtotal = calcularSubtotalLineas(lineasAgrupadas);
    const { cancelado, saldo } = calcularSaldoVenta({
        subtotal, descuento: pValorDescuento, efectivo: pValorEfectivo, transaccion: pValorTransaccion
    });
    validarSaldoContado(saldo);

    //el rol CLIENTE se asigna de forma transparente si el tercero no lo tenia. No es
    //parte de la transaccion de la venta a proposito: no bloquea la venta, y no tiene
    //sentido revertirlo si la venta falla despues.
    const yaEsCliente = await TercerosRoles.traerPorTerceroRol({pEmpId, pTerId:pTerceroId, pRol:'CLIENTE'});
    if (!yaEsCliente) {
        await TercerosRoles.crear({pEmpId, pTerId:pTerceroId, pRol:'CLIENTE', pUsuId});
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const ventaId = await Ventas.crear(connection, {
            pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
            pTipoVenta: 'CONTADO', pValorSubtotal: subtotal, pValorDescuento: Number(pValorDescuento) || 0,
            pValorCancelado: cancelado, pValorSaldo: saldo,
            pValorEfectivo: Number(pValorEfectivo) || 0, pValorTransaccion: Number(pValorTransaccion) || 0
        });

        await VentaDetalles.crearVarias(connection, {
            pEmpId, pVentaId: ventaId,
            lineas: lineasAgrupadas.map(l => ({
                ArticuloId: l.idArticulo, ArticuloNombre: l.ArticuloNombre,
                Cantidad: l.Cantidad, PrecioVentaUnidad: l.PrecioVentaUnidad
            }))
        });

        for (const linea of lineasAgrupadas) {
            await registrarMovimiento(connection, {
                pEmpId, pUsuId,
                pArticuloId: linea.idArticulo,
                pTipoMovimiento: 'SALIDA',
                pBolsaEstado: 'DISPONIBLE',
                pPropietarioId: null,
                pCantidad: linea.Cantidad,
                pCostoUnitario: null,
                pMotivo: 'VENTA',
                pTipoOrigen: 'VENTA',
                pOrigenId: ventaId,
                pObservaciones: null
            });
        }

        await connection.commit();
        return ventaId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export { crearVentaContado, agruparLineasPorArticulo };
