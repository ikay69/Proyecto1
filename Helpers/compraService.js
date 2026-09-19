import { pool } from '../Database/config.js';
import Articulos from '../Models/articulos.js';
import Compras from '../Models/compras.js';
import CompraDetalles from '../Models/compraDetalles.js';
import TercerosRoles from '../Models/tercrosRoles.js';
import { registrarMovimiento } from './inventarioTransacciones.js';
import {
    agruparLineasCompra, calcularSubtotalCompra, calcularSaldoCompra, validarSaldoContadoCompra
} from './compraCalculos.js';

//Compra al contado: valida el saldo ANTES de tocar la base de datos, luego en una sola
//transaccion da de alta los articulos nuevos, crea la cabecera, las lineas, y aumenta
//existencias via registrarMovimiento (una llamada por linea, cada una contra la bolsa
//DISPONIBLE de SU bodega). Si cualquier paso falla se revierte todo, incluidos los articulos
//recien creados -- de ahi que se use Articulos.crearConConexion y no Articulos.crear.
const crearCompraContado = async ({
    pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
    pNumeroDocumentoSoporte, pValorDescuento, pValorEfectivo, pValorTransaccion, articulosComprados
}) => {
    //toda la validacion vive fuera de la transaccion: una compra invalida (saldo != 0, sin
    //lineas, mismo articulo+bodega con costos distintos) ni siquiera abre conexion.
    //calcularSubtotalCompra ya rechaza el arreglo vacio, no hace falta repetir esa guarda.
    const lineas = agruparLineasCompra(articulosComprados ?? []);

    const subtotal = calcularSubtotalCompra(lineas);
    const { cancelado, saldo } = calcularSaldoCompra({
        subtotal, descuento: pValorDescuento, efectivo: pValorEfectivo, transaccion: pValorTransaccion
    });
    validarSaldoContadoCompra(saldo);

    //el rol PROVEEDOR se asigna de forma transparente si el tercero no lo tenia. No es parte de
    //la transaccion de la compra a proposito: no la bloquea, y no tiene sentido revertirlo si la
    //compra falla despues.
    const yaEsProveedor = await TercerosRoles.traerPorTerceroRol({pEmpId, pTerId:pTerceroId, pRol:'PROVEEDOR'});
    if (!yaEsProveedor) {
        await TercerosRoles.crear({pEmpId, pTerId:pTerceroId, pRol:'PROVEEDOR', pUsuId});
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        //los articulos nuevos se crean DENTRO de la transaccion: si la compra falla despues, no
        //pueden quedar articulos huerfanos en el catalogo con existencia cero. Nacen sin precio
        //de venta y no vendibles: la compra solo registra costo, el precio se fija despues en la
        //pantalla de Articulos, cuando la pieza ya fue avaluada.
        for (const linea of lineas) {
            if (!linea.articuloNuevo) continue;
            linea.idArticulo = await Articulos.crearConConexion(connection, {
                pEmpId,
                pUsuIdCrea: pUsuId,
                pProductoId: linea.articuloNuevo.pProductoId,
                pNombre: linea.articuloNuevo.pNombre,
                pDescripcion: linea.articuloNuevo.pDescripcion ?? null,
                pPrecioVentaUnitario: null,
                pVender: false,
                pPropiedades: linea.articuloNuevo.pPropiedades
            });
            linea.ArticuloNombre = linea.articuloNuevo.pNombre;
        }

        //orden global de adquisicion de locks: el bucle de movimientos toma un SELECT ... FOR
        //UPDATE sobre la bolsa DISPONIBLE de cada articulo+bodega, uno por linea. Si dos
        //transacciones concurrentes incluyeran las mismas dos bolsas en orden opuesto (una A->B,
        //otra B->A), cada una podria quedarse con un lock esperando el del otro: deadlock ABBA
        //clasico. Ordenar siempre por el mismo criterio (articulo, luego bodega) hace que TODAS
        //pidan los locks en el mismo orden. Va despues de crear los articulos nuevos porque solo
        //entonces todas las lineas tienen idArticulo; los recien creados reciben los Id mas altos
        //y caen al final, y nadie mas puede competir por la bolsa de un articulo que acaba de nacer.
        lineas.sort((a, b) => Number(a.idArticulo) - Number(b.idArticulo) || Number(a.idBodega) - Number(b.idBodega));

        const compraId = await Compras.crear(connection, {
            pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
            pNumeroDocumentoSoporte: pNumeroDocumentoSoporte ?? null,
            pTipoCompra: 'CONTADO', pValorSubtotal: subtotal,
            pValorDescuento: Number(pValorDescuento) || 0,
            pValorCancelado: cancelado, pValorSaldo: saldo,
            pValorEfectivo: Number(pValorEfectivo) || 0,
            pValorTransaccion: Number(pValorTransaccion) || 0
        });

        await CompraDetalles.crearVarias(connection, {
            pEmpId, pCompraId: compraId,
            lineas: lineas.map(l => ({
                ArticuloId: l.idArticulo, BodegaId: l.idBodega, ArticuloNombre: l.ArticuloNombre,
                Cantidad: l.Cantidad, CostoUnidad: l.CostoUnidad
            }))
        });

        //este bucle no toca el pool: solo usa `connection`, la conexion de esta transaccion.
        //registrarMovimiento recalcula el costo promedio ponderado de la bolsa, porque es una
        //ENTRADA sobre DISPONIBLE; la compra nunca escribe en Existencias directamente.
        for (const linea of lineas) {
            await registrarMovimiento(connection, {
                pEmpId, pUsuId, pBodegaId: linea.idBodega,
                pArticuloId: linea.idArticulo,
                pTipoMovimiento: 'ENTRADA',
                pBolsaEstado: 'DISPONIBLE',
                pPropietarioId: null,
                pCantidad: linea.Cantidad,
                pCostoUnitario: linea.CostoUnidad,
                pMotivo: 'COMPRA',
                pTipoOrigen: 'COMPRA',
                pOrigenId: compraId,
                pObservaciones: null
            });
        }

        await connection.commit();
        return compraId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export { crearCompraContado };
