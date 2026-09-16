//todo redondeo de dinero pasa por aqui para evitar comparar decimales con === despues
//de sumas/restas en punto flotante.
const redondear = (valor) => Math.round(Number(valor) * 100) / 100;

//suma Cantidad * PrecioVentaUnidad de cada linea. No confia en un subtotal enviado
//por el cliente: la venta siempre recalcula esto en el backend.
const calcularSubtotalLineas = (lineas) => {
    if (!Array.isArray(lineas) || lineas.length === 0) {
        throw new Error('La venta debe tener al menos una línea');
    }

    let total = 0;
    for (const linea of lineas) {
        const cantidad = Number(linea.Cantidad);
        const precio = Number(linea.PrecioVentaUnidad);
        if (!(cantidad > 0)) throw new Error('Cada línea debe tener una cantidad mayor a cero');
        if (!(precio > 0)) throw new Error('Cada línea debe tener un precio mayor a cero');
        total += cantidad * precio;
    }
    return redondear(total);
};

//el cancelado nunca se recibe directo del cliente: siempre es efectivo + transaccion.
const calcularSaldoVenta = ({ subtotal, descuento, efectivo, transaccion }) => {
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

//para TipoVenta='CONTADO' el saldo debe quedar en 0 (con una tolerancia de 1 centavo
//por redondeo). Las futuras modalidades (abono/credito) SI van a permitir saldo > 0,
//por eso esto vive aparte de calcularSaldoVenta.
const validarSaldoContado = (saldo) => {
    if (Math.abs(saldo) > 0.01) {
        throw new Error('El valor cancelado debe cubrir exactamente el total de la venta de contado');
    }
};

export { redondear, calcularSubtotalLineas, calcularSaldoVenta, validarSaldoContado };
