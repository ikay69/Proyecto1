import { pool } from '../Database/config.js';
import Articulos from '../Models/articulos.js';
import Compras from '../Models/compras.js';
import CompraDetalles from '../Models/compraDetalles.js';
import CompraCuotas from '../Models/compraCuotas.js';
import TercerosRoles from '../Models/tercrosRoles.js';
import { registrarMovimiento } from './inventarioTransacciones.js';
import {
    agruparLineasCompra, calcularSubtotalCompra, calcularSaldoCompra,
    validarSaldoContadoCompra, validarCreditoCompra, validarCuotasCompra
} from './compraCalculos.js';

//Registra una compra, de contado o a credito. El cuerpo transaccional es el MISMO para las dos
//modalidades -- el inventario entra igual sin importar como se pague --, y por eso esto es una
//sola funcion parametrizada y no dos hermanas: dos copias del ordenamiento de locks divergirian
//al primer arreglo que se aplique a una sola.
//
//En una sola transaccion: da de alta los articulos nuevos, crea la cabecera, las lineas, el
//desglose de cuotas si viene, y aumenta existencias via registrarMovimiento (una llamada por
//linea, cada una contra la bolsa DISPONIBLE de SU bodega). Si cualquier paso falla se revierte
//todo, incluidos los articulos recien creados -- de ahi Articulos.crearConConexion.
const crearCompra = async ({
    pEmpId, pUsuId, pTerceroId, pTerceroTipoDoc, pTerceroNumeroDoc, pTerceroNombre,
    pNumeroDocumentoSoporte, pTipoCompra, pValorDescuento, pValorEfectivo, pValorTransaccion,
    pFechaCompromiso = null, pNumeroCuotas = null, pValorCuota = null, cuotas = null,
    articulosComprados
}) => {
    //el Controller ya valida el tipo, pero esta funcion es la frontera del servicio: un tipo
    //desconocido caeria silenciosamente en la rama de contado y guardaria basura en la cabecera.
    if (pTipoCompra !== 'CONTADO' && pTipoCompra !== 'CREDITO') {
        throw new Error('Tipo de compra inválido');
    }

    //toda la validacion vive fuera de la transaccion: una compra invalida (saldo mal, sin
    //lineas, mismo articulo+bodega con costos distintos) ni siquiera abre conexion.
    //calcularSubtotalCompra ya rechaza el arreglo vacio, no hace falta repetir esa guarda.
    const lineas = agruparLineasCompra(articulosComprados ?? []);

    const subtotal = calcularSubtotalCompra(lineas);
    const { cancelado, saldo } = calcularSaldoCompra({
        subtotal, descuento: pValorDescuento, efectivo: pValorEfectivo, transaccion: pValorTransaccion
    });

    const esCredito = pTipoCompra === 'CREDITO';
    const traeCuotas = Array.isArray(cuotas) && cuotas.length > 0;

    //unica bifurcacion de negocio entre las dos modalidades. Las dos reglas son espejo: el
    //contado exige saldo cero, el credito exige saldo positivo.
    if (esCredito) {
        validarCreditoCompra({
            saldo, 
            numeroCuotas: pNumeroCuotas,
            valorCuota: pValorCuota,
            fechaCompromiso: pFechaCompromiso, 
            traeCuotas
        });
        validarCuotasCompra(cuotas, pNumeroCuotas);
    } else {
        validarSaldoContadoCompra(saldo);
    }

    //una compra de contado no guarda datos de financiacion, aunque el cliente los mande.
    //Y con varias cuotas la FechaCompromiso se descarta A PROPOSITO: con mas de una cuota las
    //fechas son de las cuotas y viven en CompraCuotas. Descartarla en silencio es preferible a
    //un 400 por un campo que el front puede estar enviando por comodidad.
    const fechaCabecera  = (esCredito && pNumeroCuotas === 1) ? (pFechaCompromiso ?? null) : null;
    const cuotasCabecera = esCredito ? pNumeroCuotas : null;
    const valorCabecera  = (esCredito && pValorCuota !== undefined && pValorCuota !== null)
        ? Number(pValorCuota) : null;

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
            pEmpId, 
            pUsuId, 
            pTerceroId, 
            pTerceroTipoDoc,
            pTerceroNumeroDoc,
            pTerceroNombre,
            pNumeroDocumentoSoporte: pNumeroDocumentoSoporte ?? null,
            pTipoCompra,
            pValorSubtotal: subtotal,
            pValorDescuento: Number(pValorDescuento) || 0,
            pValorCancelado: cancelado,
            pValorSaldo: saldo,
            pValorEfectivo: Number(pValorEfectivo) || 0,
            pValorTransaccion: Number(pValorTransaccion) || 0,
            pFechaCompromiso: fechaCabecera,
            pNumeroCuotas: cuotasCabecera,
            pValorCuota: valorCabecera
        });

        await CompraDetalles.crearVarias(connection, {
            pEmpId, pCompraId: compraId,
            lineas: lineas.map(l => ({
                ArticuloId: l.idArticulo, 
                BodegaId: l.idBodega, 
                ArticuloNombre: l.ArticuloNombre,
                Cantidad: l.Cantidad, 
                CostoUnidad: l.CostoUnidad
            }))
        });

        //el desglose entra en la MISMA transaccion que la compra: si el movimiento de inventario
        //falla despues, no pueden sobrevivir cuotas de una compra que no existe.
        if (esCredito && traeCuotas) {
            await CompraCuotas.crearVarias(connection, {pEmpId, pCompraId: compraId, cuotas});
        }

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

//Anular es la unica operacion correctiva sobre una compra: no existe edicion, porque una compra
//ya movio existencias y ya recalculo el costo promedio de una o varias bolsas.
//
//NO abre transaccion porque es una sola sentencia. El dia que se construya la reversion
//automatica de inventario y caja, ESTE es el punto donde se envuelve en una y se agregan las
//llamadas a registrarMovimiento de tipo SALIDA. Hoy el usuario corrige a mano por Ajustes.
//
//Devuelve false tanto si la compra no existe como si ya estaba anulada: el Controller los
//distingue leyendo la compra antes, que es informacion para el mensaje y no para la decision.
const anularCompra = async ({pEmpId, pCompraId, pUsuId, pMotivo}) => {
    const filas = await Compras.anular({pEmpId, pId: pCompraId, pUsuId, pMotivo});
    return filas === 1;
};

export { crearCompra, anularCompra };
