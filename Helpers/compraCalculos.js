import { redondear } from './dinero.js';

//agrupa lineas repetidas del mismo articulo+bodega en una sola (uq_compradetalle_articulo no
//permite dos filas del mismo ArticuloId+BodegaId en la misma compra), sumando cantidades. El
//mismo articulo SI puede aparecer en bodegas distintas dentro de la misma compra: eso queda
//como dos lineas separadas. Si el mismo articulo+bodega llega con costos distintos se rechaza
//en vez de adivinar cual usar -- a diferencia de Ventas, donde el costo es un dato leido de la
//base, aqui CostoUnidad es lo que el comprador declara haber pagado, y dos valores distintos
//para la misma bolsa son una contradiccion del llamador.
//Las lineas que crean articulo nuevo NUNCA se agrupan: cada bloque es una pieza distinta
//aunque llegue con el mismo nombre, y ademas todavia no tienen ArticuloId con el cual agrupar.
const agruparLineasCompra = (articulos) => {
    const porLinea = new Map();
    const lineasNuevas = [];

    for (const item of articulos) {
        if (item.articuloNuevo) {
            lineasNuevas.push({
                idBodega: item.idBodega,
                articuloNuevo: item.articuloNuevo,
                Cantidad: Number(item.Cantidad),
                CostoUnidad: Number(item.CostoUnidad)
            });
            continue;
        }

        //Number(...) evita que '7' y 7 se traten como articulos distintos: este modulo es
        //logica pura testeable por separado, y no deberia depender de que el validador de ruta
        //(dos capas mas arriba) ya haya forzado Number.isInteger sobre estos campos.
        const clave = `${Number(item.idArticulo)}-${Number(item.idBodega)}`;
        const anterior = porLinea.get(clave);
        if (anterior) {
            if (Number(anterior.CostoUnidad) !== Number(item.CostoUnidad)) {
                throw new Error(`El artículo ${item.idArticulo} viene repetido con costos distintos`);
            }
            anterior.Cantidad += Number(item.Cantidad);
        } else {
            porLinea.set(clave, {
                idArticulo: item.idArticulo,
                idBodega: item.idBodega,
                ArticuloNombre: item.ArticuloNombre,
                Cantidad: Number(item.Cantidad),
                CostoUnidad: Number(item.CostoUnidad)
            });
        }
    }

    return [...porLinea.values(), ...lineasNuevas];
};

//suma Cantidad * CostoUnidad de cada linea. No confia en un subtotal enviado por el cliente:
//la compra siempre recalcula esto en el backend.
const calcularSubtotalCompra = (lineas) => {
    if (!Array.isArray(lineas) || lineas.length === 0) {
        throw new Error('La compra debe tener al menos una línea');
    }

    let total = 0;
    for (const linea of lineas) {
        const cantidad = Number(linea.Cantidad);
        const costo = Number(linea.CostoUnidad);
        if (!(cantidad > 0)) throw new Error('Cada línea debe tener una cantidad mayor a cero');
        if (!(costo > 0)) throw new Error('Cada línea debe tener un costo mayor a cero');
        total += cantidad * costo;
    }
    return redondear(total);
};

//el cancelado nunca se recibe directo del cliente: siempre es efectivo + transaccion.
const calcularSaldoCompra = ({ subtotal, descuento, efectivo, transaccion }) => {
    const vSubtotal = Number(subtotal);
    const vDescuento = Number(descuento) || 0;
    const vEfectivo = Number(efectivo) || 0;
    const vTransaccion = Number(transaccion) || 0;

    if (vDescuento < 0) throw new Error('El descuento no puede ser negativo');
    if (vDescuento > vSubtotal) throw new Error('El descuento no puede superar el subtotal');
    if (vEfectivo < 0 || vTransaccion < 0) throw new Error('Los valores de pago no pueden ser negativos');

    const cancelado = redondear(vEfectivo + vTransaccion);
    const saldo = redondear(vSubtotal - vDescuento - cancelado);

    return { cancelado, saldo };
};

//para TipoCompra='CONTADO' el saldo debe quedar en 0, con una tolerancia de un centavo por
//redondeo. Las futuras modalidades (POR_ABONO con saldo sin interes, CREDITO con interes) SI
//van a permitir saldo > 0, por eso esto vive aparte de calcularSaldoCompra.
const validarSaldoContadoCompra = (saldo) => {
    if (Math.abs(saldo) > 0.01) {
        throw new Error('El valor cancelado debe cubrir exactamente el total de la compra de contado');
    }
};

export { agruparLineasCompra, calcularSubtotalCompra, calcularSaldoCompra, validarSaldoContadoCompra };
