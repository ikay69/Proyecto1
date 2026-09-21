import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    agruparLineasCompra,
    calcularSubtotalCompra,
    calcularSaldoCompra,
    validarSaldoContadoCompra,
    validarCreditoCompra,
    validarCuotasCompra
} from '../../Helpers/compraCalculos.js';

const lineaExistente = (idArticulo, idBodega, Cantidad, CostoUnidad) => ({
    idArticulo, idBodega, ArticuloNombre: `ARTICULO ${idArticulo}`, Cantidad, CostoUnidad
});

const lineaNueva = (idBodega, Cantidad, CostoUnidad, pNombre) => ({
    idBodega, Cantidad, CostoUnidad,
    articuloNuevo: { pProductoId: 3, pNombre, pDescripcion: null, pPropiedades: [] }
});

test('agrupa dos lineas del mismo articulo y bodega sumando cantidades', () => {
    const lineas = agruparLineasCompra([
        lineaExistente(7, 1, 2, 50000),
        lineaExistente(7, 1, 3, 50000)
    ]);
    assert.equal(lineas.length, 1);
    assert.equal(lineas[0].Cantidad, 5);
});

test('rechaza el mismo articulo y bodega con costos distintos', () => {
    assert.throws(
        () => agruparLineasCompra([lineaExistente(7, 1, 2, 50000), lineaExistente(7, 1, 3, 60000)]),
        /costos distintos/
    );
});

test('agrupa el mismo articulo y bodega aunque uno de los ids llegue como string numerico', () => {
    const lineas = agruparLineasCompra([
        lineaExistente('7', 1, 2, 50000),
        lineaExistente(7, '1', 3, 50000)
    ]);
    assert.equal(lineas.length, 1);
    assert.equal(lineas[0].Cantidad, 5);
});

test('el mismo articulo en bodegas distintas queda como dos lineas', () => {
    const lineas = agruparLineasCompra([lineaExistente(7, 1, 2, 50000), lineaExistente(7, 2, 3, 50000)]);
    assert.equal(lineas.length, 2);
});

test('las lineas de articulo nuevo nunca se fusionan aunque compartan nombre', () => {
    const lineas = agruparLineasCompra([
        lineaNueva(1, 1, 180000, 'ANILLO ORO 18K'),
        lineaNueva(1, 1, 180000, 'ANILLO ORO 18K')
    ]);
    assert.equal(lineas.length, 2);
});

test('subtotal suma cantidad por costo, con cantidades decimales', () => {
    const subtotal = calcularSubtotalCompra([
        lineaExistente(7, 1, 15.5, 40000),
        lineaExistente(8, 1, 1, 180000)
    ]);
    assert.equal(subtotal, 800000);
});

test('subtotal rechaza un arreglo vacio', () => {
    assert.throws(() => calcularSubtotalCompra([]), /al menos una linea|al menos una línea/);
});

test('subtotal rechaza cantidad o costo no positivos', () => {
    assert.throws(() => calcularSubtotalCompra([lineaExistente(7, 1, 0, 40000)]), /cantidad/);
    assert.throws(() => calcularSubtotalCompra([lineaExistente(7, 1, 1, 0)]), /costo/);
});

test('cancelado es efectivo mas transaccion, y saldo descuenta el descuento', () => {
    const { cancelado, saldo } = calcularSaldoCompra({
        subtotal: 800000, descuento: 50000, efectivo: 700000, transaccion: 50000
    });
    assert.equal(cancelado, 750000);
    assert.equal(saldo, 0);
});

test('rechaza descuento negativo, descuento mayor al subtotal y pagos negativos', () => {
    assert.throws(() => calcularSaldoCompra({subtotal: 100, descuento: -1, efectivo: 100, transaccion: 0}), /negativo/);
    assert.throws(() => calcularSaldoCompra({subtotal: 100, descuento: 200, efectivo: 100, transaccion: 0}), /superar el subtotal/);
    assert.throws(() => calcularSaldoCompra({subtotal: 100, descuento: 0, efectivo: -5, transaccion: 0}), /negativos/);
});

test('contado acepta saldo cero y un centavo de descuadre, rechaza dos', () => {
    assert.doesNotThrow(() => validarSaldoContadoCompra(0));
    assert.doesNotThrow(() => validarSaldoContadoCompra(0.01));
    assert.doesNotThrow(() => validarSaldoContadoCompra(-0.01));
    assert.throws(() => validarSaldoContadoCompra(0.02), /exactamente el total/);
    assert.throws(() => validarSaldoContadoCompra(-0.02), /exactamente el total/);
});

// ---- validarCreditoCompra ----

const creditoValido = (extra = {}) => ({
    saldo: 900000, numeroCuotas: 3, valorCuota: 350000,
    fechaCompromiso: null, traeCuotas: false, ...extra
});

test('validarCreditoCompra acepta un credito de varias cuotas sin fecha de compromiso', () => {
    assert.doesNotThrow(() => validarCreditoCompra(creditoValido()));
});

test('validarCreditoCompra NO exige que las cuotas sumen el saldo', () => {
    // la regla de fondo del modulo: el proveedor calcula sus cuotas con su propio interes,
    // por fuera de este sistema. 3 x 350000 = 1050000 contra un saldo de 900000 es correcto.
    assert.doesNotThrow(() => validarCreditoCompra(creditoValido({numeroCuotas: 3, valorCuota: 350000, saldo: 900000})));
    // y muy por debajo tambien: el usuario puede estar transcribiendo parte del acuerdo.
    assert.doesNotThrow(() => validarCreditoCompra(creditoValido({valorCuota: 1})));
});

test('validarCreditoCompra rechaza un credito sin saldo pendiente', () => {
    assert.throws(() => validarCreditoCompra(creditoValido({saldo: 0})), /CONTADO/);
    assert.throws(() => validarCreditoCompra(creditoValido({saldo: 0.005})), /CONTADO/);
    assert.throws(() => validarCreditoCompra(creditoValido({saldo: -100})), /CONTADO/);
});

test('validarCreditoCompra acepta un saldo apenas por encima de la tolerancia de un centavo', () => {
    assert.doesNotThrow(() => validarCreditoCompra(creditoValido({saldo: 0.02})));
});

test('validarCreditoCompra omite la regla del saldo cuando no se le pasa saldo', () => {
    // asi la llama el middleware de ruta: ahi el subtotal todavia no esta calculado, pero las
    // demas reglas si se pueden atrapar temprano, antes de tocar la base.
    assert.doesNotThrow(() => validarCreditoCompra({
        numeroCuotas: 3, valorCuota: 350000, fechaCompromiso: null, traeCuotas: false
    }));
    assert.throws(() => validarCreditoCompra({
        numeroCuotas: 0, valorCuota: 350000, fechaCompromiso: null, traeCuotas: false
    }), /n.mero de cuotas/);
});

test('validarCreditoCompra exige NumeroCuotas entero mayor o igual a 1', () => {
    assert.throws(() => validarCreditoCompra(creditoValido({numeroCuotas: 0})), /n.mero de cuotas/);
    assert.throws(() => validarCreditoCompra(creditoValido({numeroCuotas: -1})), /n.mero de cuotas/);
    assert.throws(() => validarCreditoCompra(creditoValido({numeroCuotas: 1.5})), /n.mero de cuotas/);
    assert.throws(() => validarCreditoCompra(creditoValido({numeroCuotas: '3'})), /n.mero de cuotas/);
    assert.throws(() => validarCreditoCompra(creditoValido({numeroCuotas: null})), /n.mero de cuotas/);
});

test('validarCreditoCompra acepta exactamente 1 cuota si trae fecha de compromiso', () => {
    assert.doesNotThrow(() => validarCreditoCompra(
        creditoValido({numeroCuotas: 1, valorCuota: 900000, fechaCompromiso: '2026-10-15'})));
});

test('validarCreditoCompra exige fecha de compromiso cuando hay una sola cuota', () => {
    assert.throws(() => validarCreditoCompra(creditoValido({numeroCuotas: 1, fechaCompromiso: null})), /fecha de pago/);
    assert.throws(() => validarCreditoCompra(creditoValido({numeroCuotas: 1, fechaCompromiso: ''})), /fecha de pago/);
    assert.throws(() => validarCreditoCompra(creditoValido({numeroCuotas: 1, fechaCompromiso: 'manana'})), /fecha de pago/);
});

test('validarCreditoCompra no exige fecha de compromiso con varias cuotas', () => {
    assert.doesNotThrow(() => validarCreditoCompra(creditoValido({numeroCuotas: 6, fechaCompromiso: null})));
});

test('validarCreditoCompra exige ValorCuota mayor a cero', () => {
    assert.throws(() => validarCreditoCompra(creditoValido({valorCuota: 0})), /valor de la cuota/);
    assert.throws(() => validarCreditoCompra(creditoValido({valorCuota: -5})), /valor de la cuota/);
    assert.throws(() => validarCreditoCompra(creditoValido({valorCuota: 'mucho'})), /valor de la cuota/);
});

test('validarCreditoCompra permite ValorCuota nulo SOLO si la compra trae el arreglo Cuotas', () => {
    // escenario 3: cuotas de distinto valor, el desglose manda.
    assert.doesNotThrow(() => validarCreditoCompra(creditoValido({valorCuota: null, traeCuotas: true})));
    assert.throws(() => validarCreditoCompra(creditoValido({valorCuota: null, traeCuotas: false})), /valor de la cuota/);
});

// ---- validarCuotasCompra ----

test('validarCuotasCompra acepta la ausencia del arreglo: la tabla es opcional', () => {
    assert.doesNotThrow(() => validarCuotasCompra(undefined, 3));
    assert.doesNotThrow(() => validarCuotasCompra(null, 3));
    assert.doesNotThrow(() => validarCuotasCompra([], 3));
});

test('validarCuotasCompra acepta un desglose completo de valores distintos', () => {
    assert.doesNotThrow(() => validarCuotasCompra([
        {NumCuota: 1, ValorCuota: 120000, FechaPago: '2026-10-15'},
        {NumCuota: 2, ValorCuota: 100000, FechaPago: '2026-11-15'},
        {NumCuota: 3, ValorCuota: 80000,  FechaPago: '2026-12-15'}
    ], 3));
});

test('validarCuotasCompra acepta un desglose incompleto', () => {
    // 2 de 12: el arreglo es informativo, no tiene que estar completo.
    assert.doesNotThrow(() => validarCuotasCompra([
        {NumCuota: 1, ValorCuota: 100000}, {NumCuota: 2, ValorCuota: 100000}
    ], 12));
});

test('validarCuotasCompra acepta cuotas sin fecha de pago', () => {
    assert.doesNotThrow(() => validarCuotasCompra([{NumCuota: 1, ValorCuota: 100000, FechaPago: null}], 3));
    assert.doesNotThrow(() => validarCuotasCompra([{NumCuota: 1, ValorCuota: 100000}], 3));
});

test('validarCuotasCompra rechaza un elemento nulo sin estallar', () => {
    // sin la guarda, el acceso a .NumCuota lanzaria TypeError y la ruta responderia 500 con
    // stack trace en vez de un error de validacion.
    assert.throws(() => validarCuotasCompra([null], 3), /Cuota inv/);
    assert.throws(() => validarCuotasCompra([[1, 2]], 3), /Cuota inv/);
    assert.throws(() => validarCuotasCompra(['1'], 3), /Cuota inv/);
});

test('validarCuotasCompra rechaza NumCuota repetido', () => {
    assert.throws(() => validarCuotasCompra([
        {NumCuota: 2, ValorCuota: 100000}, {NumCuota: 2, ValorCuota: 50000}
    ], 3), /repetid/);
});

test('validarCuotasCompra rechaza NumCuota fuera del rango 1..NumeroCuotas', () => {
    assert.throws(() => validarCuotasCompra([{NumCuota: 0, ValorCuota: 100}], 3), /n.mero de cuota/);
    assert.throws(() => validarCuotasCompra([{NumCuota: 4, ValorCuota: 100}], 3), /n.mero de cuota/);
    assert.throws(() => validarCuotasCompra([{NumCuota: 1.5, ValorCuota: 100}], 3), /n.mero de cuota/);
});

test('validarCuotasCompra rechaza ValorCuota no positivo', () => {
    assert.throws(() => validarCuotasCompra([{NumCuota: 1, ValorCuota: 0}], 3), /valor de la cuota/);
    assert.throws(() => validarCuotasCompra([{NumCuota: 1, ValorCuota: -1}], 3), /valor de la cuota/);
});

test('validarCuotasCompra rechaza fecha de pago invalida', () => {
    assert.throws(() => validarCuotasCompra([{NumCuota: 1, ValorCuota: 100, FechaPago: '2026-02-31'}], 3), /fecha de pago/);
});

test('validarCuotasCompra rechaza un Estado fuera del dominio', () => {
    assert.throws(() => validarCuotasCompra([{NumCuota: 1, ValorCuota: 100, Estado: 'PAGADA'}], 3), /estado de la cuota/);
    assert.doesNotThrow(() => validarCuotasCompra([{NumCuota: 1, ValorCuota: 100, Estado: 'CANCELADA'}], 3));
    assert.doesNotThrow(() => validarCuotasCompra([{NumCuota: 1, ValorCuota: 100, Estado: 'PENDIENTE'}], 3));
});
