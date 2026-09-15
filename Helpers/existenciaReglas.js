const BOLSAS_VALIDAS = [
    'DISPONIBLE',
    'RESERVADO',
    'PRESTADO_A_TALLER',
    'RECIBIDO_DE_TALLER',
    'EN_GARANTIA_EMPENO',
    'EN_REPARACION'
];

const BOLSAS_CON_PROPIETARIO_OBLIGATORIO = [
    'PRESTADO_A_TALLER',
    'RECIBIDO_DE_TALLER',
    'EN_GARANTIA_EMPENO'
];

const MOTIVOS_VALIDOS = [
    'COMPRA', 'VENTA', 'DEVOLUCION_VENTA',
    'EMPENO_INGRESO', 'EMPENO_DEVOLUCION', 'EMPENO_ADJUDICACION',
    'PRESTAMO_PROPIO', 'PRESTAMO_TERCERO',
    'PRODUCCION', 'REPARACION', 'AJUSTE'
];

const TIPOS_ORIGEN_VALIDOS = ['COMPRA', 'VENTA', 'EMPENO', 'PRESTAMO', 'PRODUCCION', 'REPARACION', 'AJUSTE'];

const TIPOS_MOVIMIENTO_VALIDOS = ['ENTRADA', 'SALIDA'];

const validarPropietarioBolsa = ({ bolsaEstado, propietarioId }) => {
    const requierePropietario = BOLSAS_CON_PROPIETARIO_OBLIGATORIO.includes(bolsaEstado);
    const tienePropietario = propietarioId !== null && propietarioId !== undefined;

    if (requierePropietario && !tienePropietario) {
        return `La bolsa ${bolsaEstado} requiere un propietario (tercero)`;
    }

    if (!requierePropietario && tienePropietario) {
        return `La bolsa ${bolsaEstado} no debe tener un propietario`;
    }

    return null;
};

export {
    BOLSAS_VALIDAS,
    BOLSAS_CON_PROPIETARIO_OBLIGATORIO,
    MOTIVOS_VALIDOS,
    TIPOS_ORIGEN_VALIDOS,
    TIPOS_MOVIMIENTO_VALIDOS,
    validarPropietarioBolsa
};
