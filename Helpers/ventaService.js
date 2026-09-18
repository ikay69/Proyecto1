import { pool } from '../Database/config.js';
import Ventas from '../Models/ventas.js';
import VentaDetalles from '../Models/ventaDetalles.js';
import TercerosRoles from '../Models/tercrosRoles.js';
import { registrarMovimiento } from './inventarioTransacciones.js';
import { calcularSubtotalLineas, calcularSaldoVenta, validarSaldoContado } from './ventaCalculos.js';

//agrupa lineas repetidas del mismo articulo en una sola (uq_ventadetalle_articulo no
//permite dos filas del mismo ArticuloId en la misma venta), sumando cantidades. Si el
//mismo articulo llega con precios distintos, se rechaza en vez de adivinar cual usar.
//CostoUnitario viaja distinto a PrecioVentaUnidad: el precio lo negocia el vendedor por
//venta (dos lineas del mismo articulo con precios distintos es una contradiccion del
//llamador), mientras que el costo es un dato de la base leido por el Controller para el
//rastro de auditoria del kardex. Si dos lineas del mismo articulo trajeran costos
//distintos seria ruido irrelevante -- misma fila de Articulos, misma consulta, leidas con
//milisegundos de diferencia -- asi que se conserva el de la primera ocurrencia sin lanzar.
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
                PrecioVentaUnidad: Number(item.PrecioVentaUnidad),
                CostoUnitario: item.CostoUnitario ?? null
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
    pEmpId, pUsuId, pBodegaId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
    pValorDescuento, pValorEfectivo, pValorTransaccion, articulosVendidos
}) => {
    //toda la validacion vive fuera de la transaccion: una venta invalida (saldo != 0, sin
    //lineas, mismo articulo con precios distintos) ni siquiera abre conexion.
    //calcularSubtotalLineas ya rechaza el arreglo vacio, no hace falta repetir esa guarda.
    const lineasAgrupadas = agruparLineasPorArticulo(articulosVendidos ?? []);

    //orden global de adquisicion de locks: el bucle de movimientos toma un SELECT ... FOR UPDATE
    //sobre la bolsa DISPONIBLE de cada articulo, uno por linea. Si dos ventas concurrentes
    //incluyeran los mismos dos articulos en orden opuesto (una A->B, otra B->A), cada una podria
    //quedarse con un lock esperando el del otro: deadlock ABBA clasico. Ordenar siempre por id
    //numerico de articulo hace que TODAS las ventas pidan los locks en el mismo orden, lo que
    //elimina esa clase de deadlock por completo. Va aqui, antes de abrir la transaccion, para que
    //tambien fije el orden de las filas de VentaDetalles.
    lineasAgrupadas.sort((a, b) => Number(a.idArticulo) - Number(b.idArticulo));

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

    //el costo de cada linea (CostoUnitario) llega ya resuelto desde el Controller, que de todas
    //formas tiene que leer cada Articulo para validar Estado/Vender y congelar ArticuloNombre.
    //Releerlo aqui duplicaria las consultas al pool (2N en vez de N) y abriria una ventana TOCTOU
    //entre ambas lecturas. Se guarda en el kardex solo como rastro de auditoria (costo de la
    //mercancia al momento de venderla, base de cualquier informe de COGS): registrarMovimiento no
    //lo usa para calcular nada en una SALIDA -- el recosteo promedio solo ocurre en ENTRADA.
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

        //este bucle ya no toca el pool: solo usa `connection`, la conexion de esta transaccion.
        for (const linea of lineasAgrupadas) {
            await registrarMovimiento(connection, {
                pEmpId, pUsuId, pBodegaId,
                pArticuloId: linea.idArticulo,
                pTipoMovimiento: 'SALIDA',
                pBolsaEstado: 'DISPONIBLE',
                pPropietarioId: null,
                pCantidad: linea.Cantidad,
                pCostoUnitario: linea.CostoUnitario ?? null,
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
