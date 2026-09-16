//`CostoUnitario` es obligatorio SOLO en la primera entrada a DISPONIBLE (cuando no hay costo
//previo contra el cual promediar). En una entrada posterior sin costo, el promedio vigente se
//deja intacto: `Number(null) === 0` lo habria doblado hacia cero y corrompido la base de costo.
const calcularCostoPromedioPonderado = ({ cantidadActual, costoActual, cantidadEntrante, costoEntrante }) => {
    const cActual = Number(cantidadActual) || 0;
    const cstActual = (costoActual === null || costoActual === undefined) ? null : Number(costoActual);
    const cEntrante = Number(cantidadEntrante);
    const costoEntranteProvisto = costoEntrante !== null && costoEntrante !== undefined;
    const cstEntrante = costoEntranteProvisto ? Number(costoEntrante) : null;

    if (!(cEntrante > 0)) throw new Error('La cantidad entrante debe ser mayor a cero');

    const esPrimeraEntrada = cActual <= 0 || cstActual === null;

    if (esPrimeraEntrada) {
        if (!costoEntranteProvisto || !(cstEntrante >= 0)) {
            throw new Error('El costo entrante es obligatorio en la primera entrada a DISPONIBLE');
        }
        return Math.round(cstEntrante * 100) / 100;
    }

    if (!costoEntranteProvisto) {
        return Math.round(cstActual * 100) / 100;
    }

    if (!(cstEntrante >= 0)) throw new Error('El costo entrante debe ser mayor o igual a cero');

    const nuevoCosto = ((cActual * cstActual) + (cEntrante * cstEntrante)) / (cActual + cEntrante);
    return Math.round(nuevoCosto * 100) / 100;
};

const calcularCostoProduccion = (consumos) => {
    if (!Array.isArray(consumos) || consumos.length === 0) {
        throw new Error('Se requiere al menos un consumo para calcular el costo de producción');
    }

    let total = 0;
    for (const consumo of consumos) {
        const cantidad = Number(consumo.cantidad);
        //un consumo sin costo registrado aborta la orden completa: tratarlo como 0 (lo que hacia
        //`Number(null)`) regalaria el material y corromperia el costo del articulo producido.
        if (consumo.costoUnitario === null || consumo.costoUnitario === undefined) {
            throw new Error('El artículo consumido no tiene un costo unitario registrado');
        }
        const costo = Number(consumo.costoUnitario);
        if (!(cantidad > 0)) throw new Error('Cada consumo debe tener una cantidad mayor a cero');
        if (!(costo >= 0)) throw new Error('Cada consumo debe tener un costo unitario válido');
        total += cantidad * costo;
    }
    return Math.round(total * 100) / 100;
};

const calcularCostoUnitarioProducido = ({ costoTotalConsumos, cantidadProducida }) => {
    const cantidad = Number(cantidadProducida);
    if (!(cantidad > 0)) throw new Error('La cantidad producida debe ser mayor a cero');
    return Math.round((Number(costoTotalConsumos) / cantidad) * 100) / 100;
};

export { calcularCostoPromedioPonderado, calcularCostoProduccion, calcularCostoUnitarioProducido };
