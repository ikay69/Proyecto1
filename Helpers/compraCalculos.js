import { redondear } from './dinero.js';
import { esFechaValida } from './fechas.js';

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
//redondeo. CREDITO usa validarCreditoCompra, que exige justo lo contrario: por eso las dos
//reglas viven aparte de calcularSaldoCompra, que solo hace la aritmetica.
const validarSaldoContadoCompra = (saldo) => {
    if (Math.abs(saldo) > 0.01) {
        throw new Error('El valor cancelado debe cubrir exactamente el total de la compra de contado');
    }
};

//reglas de la compra a credito. Espejo de validarSaldoContadoCompra: alla el saldo debe ser
//cero, aca debe ser positivo.
//
//`traeCuotas` es true cuando la compra manda el arreglo con el desglose. Es lo unico que
//habilita un ValorCuota nulo: con cuotas de valores distintos (escenario 3) no hay un "valor
//de la cuota" unico que poner en la cabecera.
//
//LO QUE ESTA FUNCION NO HACE, A PROPOSITO: no compara numeroCuotas * valorCuota contra saldo.
//El proveedor calcula las cuotas con su propio interes, por fuera de este sistema, y el
//usuario las transcribe. Si hay interes, las cuotas TIENEN que sumar mas que el saldo, y una
//validacion de cuadre rechazaria compras validas. No la agregues.
const validarCreditoCompra = ({ saldo, numeroCuotas, valorCuota, fechaCompromiso, traeCuotas }) => {
    //`saldo` es opcional a proposito: el middleware de ruta llama a esta misma funcion antes
    //de que exista un subtotal (lo calcula el backend a partir de las lineas), para atrapar
    //temprano todo lo demas sin tocar la base. El servicio la vuelve a llamar CON saldo.
    //Una sola definicion de las reglas, dos momentos de aplicacion.
    if (saldo !== undefined) {
        //misma tolerancia de un centavo que el contado, del otro lado: si el saldo cabe dentro
        //del ruido de redondeo, la compra quedo pagada y es de contado.
        if (!(Number(saldo) > 0.01)) {
            throw new Error('Una compra a crédito debe quedar con saldo pendiente; use CONTADO');
        }
    }

    if (!Number.isInteger(numeroCuotas) || numeroCuotas < 1) {
        throw new Error('El número de cuotas debe ser un entero mayor o igual a 1');
    }

    const cuotaVacia = valorCuota === undefined || valorCuota === null;
    if (cuotaVacia) {
        if (!traeCuotas) {
            throw new Error('El valor de la cuota es obligatorio cuando no se detallan las cuotas');
        }
    } else if (isNaN(Number(valorCuota)) || Number(valorCuota) <= 0) {
        throw new Error('El valor de la cuota debe ser mayor a cero');
    }

    //con una sola cuota la fecha de pago es un dato de la cabecera y no justifica una tabla.
    //Con varias, las fechas son de las cuotas: viven en CompraCuotas si el usuario decide
    //llenarla, y la cabecera guarda null.
    if (numeroCuotas === 1 && !esFechaValida(fechaCompromiso)) {
        throw new Error('La fecha de pago es obligatoria cuando hay una sola cuota');
    }
};

//OJO: aqui 'CANCELADA' significa PAGADA (sentido coloquial de "cancelar una cuota"). En
//Compras, Estado=FALSE significa ANULADA. Son opuestos.
const ESTADOS_CUOTA = ['PENDIENTE', 'CANCELADA'];

//el desglose cuota por cuota es OPCIONAL: ausente, nulo o vacio es valido. Cuando viene, es
//una transcripcion de lo pactado, no un calculo -- por eso tampoco se exige que este completo
//ni que sume el saldo (mismo razonamiento que validarCreditoCompra).
const validarCuotasCompra = (cuotas, numeroCuotas) => {
    if (cuotas === undefined || cuotas === null) return;
    if (!Array.isArray(cuotas)) throw new Error('El detalle de cuotas debe ser una lista');
    if (cuotas.length === 0) return;

    const vistos = new Set();
    for (const cuota of cuotas) {
        //sin esta guarda, un null en la lista haria estallar el acceso a cuota.NumCuota y la
        //ruta responderia 500 con stack trace en vez de un error de validacion.
        if (cuota === null || typeof cuota !== 'object' || Array.isArray(cuota)) {
            throw new Error('Cuota inválida en el detalle');
        }

        if (!Number.isInteger(cuota.NumCuota) || cuota.NumCuota < 1 || cuota.NumCuota > numeroCuotas) {
            throw new Error(`El número de cuota debe ser un entero entre 1 y ${numeroCuotas}`);
        }
        if (vistos.has(cuota.NumCuota)) {
            throw new Error(`La cuota ${cuota.NumCuota} viene repetida en el detalle`);
        }
        vistos.add(cuota.NumCuota);

        if (isNaN(Number(cuota.ValorCuota)) || Number(cuota.ValorCuota) <= 0) {
            throw new Error('El valor de la cuota debe ser mayor a cero');
        }

        if (cuota.FechaPago !== undefined && cuota.FechaPago !== null && cuota.FechaPago !== '') {
            if (!esFechaValida(cuota.FechaPago)) {
                throw new Error('La fecha de pago de la cuota es inválida');
            }
        }

        if (cuota.Estado !== undefined && cuota.Estado !== null) {
            if (!ESTADOS_CUOTA.includes(cuota.Estado)) {
                throw new Error('El estado de la cuota debe ser PENDIENTE o CANCELADA');
            }
        }
    }
};

export {
    agruparLineasCompra, calcularSubtotalCompra, calcularSaldoCompra,
    validarSaldoContadoCompra, validarCreditoCompra, validarCuotasCompra, ESTADOS_CUOTA
};
