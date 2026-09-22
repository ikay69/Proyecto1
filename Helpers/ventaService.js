import { pool } from '../Database/config.js';
import Ventas from '../Models/ventas.js';
import VentaDetalles from '../Models/ventaDetalles.js';
import TercerosRoles from '../Models/tercrosRoles.js';
import { registrarMovimiento } from './inventarioTransacciones.js';
import { calcularSubtotalLineas, calcularSaldoVenta, validarSaldoContado } from './ventaCalculos.js';

//agrupa lineas repetidas del mismo articulo+bodega en una sola (uq_ventadetalle_articulo no
//permite dos filas del mismo ArticuloId+BodegaId en la misma venta), sumando cantidades. El
//mismo articulo SI puede aparecer en bodegas distintas dentro de la misma venta (cada bodega
//tiene su propia existencia y su propio costo): eso queda como dos lineas separadas. Si el
//mismo articulo+bodega llega con precios distintos, se rechaza en vez de adivinar cual usar.
//CostoUnitario viaja distinto a PrecioVentaUnidad: el precio lo negocia el vendedor por
//venta (dos lineas del mismo articulo+bodega con precios distintos es una contradiccion del
//llamador), mientras que el costo es un dato de la base leido por el Controller para el
//rastro de auditoria del kardex. Si dos lineas del mismo articulo+bodega trajeran costos
//distintos seria ruido irrelevante -- misma fila de Existencias, misma consulta, leidas con
//milisegundos de diferencia -- asi que se conserva el de la primera ocurrencia sin lanzar.
const agruparLineasPorArticulo = (articulos) => {
    const porLinea = new Map();
    for (const item of articulos) {
        const clave = `${item.idArticulo}-${item.idBodega}`;
        const anterior = porLinea.get(clave);
        if (anterior) {
            if (Number(anterior.PrecioVentaUnidad) !== Number(item.PrecioVentaUnidad)) {
                throw new Error(`El artículo ${item.idArticulo} viene repetido con precios distintos`);
            }
            anterior.Cantidad += Number(item.Cantidad);
        } else {
            porLinea.set(clave, {
                idArticulo: item.idArticulo,
                idBodega: item.idBodega,
                ArticuloNombre: item.ArticuloNombre,
                Cantidad: Number(item.Cantidad),
                PrecioVentaUnidad: Number(item.PrecioVentaUnidad),
                CostoUnitario: item.CostoUnitario ?? null
            });
        }
    }
    return Array.from(porLinea.values());
};

//Venta al contado: valida el saldo ANTES de tocar la base de datos, luego en una sola
//transaccion crea la cabecera, las lineas, y descuenta existencias via registrarMovimiento
//(una llamada por linea, cada una contra la bolsa DISPONIBLE de SU bodega). Si cualquier
//linea no tiene existencia suficiente en su bodega, se revierte todo -- cabecera, lineas y
//cualquier movimiento ya aplicado.
const crearVentaContado = async ({
    pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
    pVendedorId = null,
    pValorDescuento, pValorEfectivo, pValorTransaccion, articulosVendidos
}) => {
    //toda la validacion vive fuera de la transaccion: una venta invalida (saldo != 0, sin
    //lineas, mismo articulo+bodega con precios distintos) ni siquiera abre conexion.
    //calcularSubtotalLineas ya rechaza el arreglo vacio, no hace falta repetir esa guarda.
    const lineasAgrupadas = agruparLineasPorArticulo(articulosVendidos ?? []);

    //orden global de adquisicion de locks: el bucle de movimientos toma un SELECT ... FOR UPDATE
    //sobre la bolsa DISPONIBLE de cada articulo+bodega, uno por linea. Si dos ventas concurrentes
    //incluyeran las mismas dos bolsas en orden opuesto (una A->B, otra B->A), cada una podria
    //quedarse con un lock esperando el del otro: deadlock ABBA clasico. Ordenar siempre por el
    //mismo criterio (articulo, luego bodega) hace que TODAS las ventas pidan los locks en el
    //mismo orden, lo que elimina esa clase de deadlock por completo. Va aqui, antes de abrir la
    //transaccion, para que tambien fije el orden de las filas de VentaDetalles.
    lineasAgrupadas.sort((a, b) => Number(a.idArticulo) - Number(b.idArticulo) || Number(a.idBodega) - Number(b.idBodega));

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
    //formas tiene que leer cada Articulo/bodega para validar Estado/Vender y congelar
    //ArticuloNombre. Releerlo aqui duplicaria las consultas al pool (2N en vez de N) y abriria
    //una ventana TOCTOU entre ambas lecturas. Se guarda en el kardex solo como rastro de
    //auditoria (costo de la mercancia al momento de venderla, base de cualquier informe de
    //COGS): registrarMovimiento no lo usa para calcular nada en una SALIDA -- el recosteo
    //promedio solo ocurre en ENTRADA.
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const ventaId = await Ventas.crear(connection, {
            pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
            pVendedorId,
            pTipoVenta: 'CONTADO', pValorSubtotal: subtotal, pValorDescuento: Number(pValorDescuento) || 0,
            pValorCancelado: cancelado, pValorSaldo: saldo,
            pValorEfectivo: Number(pValorEfectivo) || 0, pValorTransaccion: Number(pValorTransaccion) || 0
        });

        await VentaDetalles.crearVarias(connection, {
            pEmpId, pVentaId: ventaId,
            lineas: lineasAgrupadas.map(l => ({
                ArticuloId: l.idArticulo, BodegaId: l.idBodega, ArticuloNombre: l.ArticuloNombre,
                Cantidad: l.Cantidad, PrecioVentaUnidad: l.PrecioVentaUnidad
            }))
        });

        //este bucle ya no toca el pool: solo usa `connection`, la conexion de esta transaccion.
        for (const linea of lineasAgrupadas) {
            await registrarMovimiento(connection, {
                pEmpId, pUsuId, pBodegaId: linea.idBodega,
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
