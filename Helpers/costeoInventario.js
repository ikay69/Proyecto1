const calcularCostoPromedioPonderado = ({ cantidadActual, costoActual, cantidadEntrante, costoEntrante }) => {
    const cActual = Number(cantidadActual) || 0;
    const cstActual = (costoActual === null || costoActual === undefined) ? null : Number(costoActual);
    const cEntrante = Number(cantidadEntrante);
    const cstEntrante = Number(costoEntrante);

    if (!(cEntrante > 0)) throw new Error('La cantidad entrante debe ser mayor a cero');
    if (!(cstEntrante >= 0)) throw new Error('El costo entrante debe ser mayor o igual a cero');

    if (cActual <= 0 || cstActual === null) {
        return Math.round(cstEntrante * 100) / 100;
    }

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
