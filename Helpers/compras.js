//validaciones ruta

import { validarDatosArticulo } from './articulos.js';
import { validarCreditoCompra, validarCuotasCompra } from './compraCalculos.js';
import { normalizarFecha, normalizarFechaFin } from './fechas.js';

const TIPOS_COMPRA_VALIDOS = ['CONTADO', 'CREDITO'];
const MOTIVO_ANULACION_MIN = 5;
const MOTIVO_ANULACION_MAX = 300;

const compraValidaDatos = async (req,res,next) => {
    const {idTercero, TipoCompra, NumeroDocumentoSoporte, ValorDescuento, ValorEfectivo,
           ValorTransaccion, FechaCompromiso, NumeroCuotas, ValorCuota, Cuotas, Articulos} = req.body;

    if (!Number.isInteger(idTercero)) {
        return res.status(400).json({msg:'Tercero inválido'});
    }

    if (!TIPOS_COMPRA_VALIDOS.includes(TipoCompra)) {
        return res.status(400).json({msg:'Tipo de compra inválido'});
    }

    if (NumeroDocumentoSoporte !== undefined && NumeroDocumentoSoporte !== null) {
        if (String(NumeroDocumentoSoporte).trim().length > 50) {
            return res.status(400).json({msg:'El documento soporte supera los 50 caracteres'});
        }
    }

    if (ValorDescuento !== undefined && ValorDescuento !== null) {
        if (isNaN(Number(ValorDescuento)) || Number(ValorDescuento) < 0) {
            return res.status(400).json({msg:'El descuento es inválido'});
        }
    }

    if (ValorEfectivo !== undefined && ValorEfectivo !== null) {
        if (isNaN(Number(ValorEfectivo)) || Number(ValorEfectivo) < 0) {
            return res.status(400).json({msg:'El valor en efectivo es inválido'});
        }
    }
    if (ValorTransaccion !== undefined && ValorTransaccion !== null) {
        if (isNaN(Number(ValorTransaccion)) || Number(ValorTransaccion) < 0) {
            return res.status(400).json({msg:'El valor en transacción es inválido'});
        }
    }

    const vEfectivo = Number(ValorEfectivo) || 0;
    const vTransaccion = Number(ValorTransaccion) || 0;
    //solo el contado tiene que salir pagado. En una compra a credito el pago inicial es
    //opcional y lo normal es que no haya ninguno: el saldo es justamente el punto.
    if (TipoCompra === 'CONTADO' && vEfectivo <= 0 && vTransaccion <= 0) {
        return res.status(400).json({msg:'Debe registrar algún valor cancelado (efectivo o transacción)'});
    }

    //las reglas del credito NO se reescriben aqui: viven en compraCalculos.js, junto a la del
    //contado, y este middleware solo las traduce a 400. Se llaman SIN `saldo` porque el
    //subtotal todavia no existe -- lo calcula el backend a partir de las lineas --, asi que la
    //regla del saldo la aplica el servicio mas adelante. Todo lo demas se atrapa aqui, antes
    //de tocar la base.
    //
    //En CONTADO los campos del credito simplemente no aplican: el front puede mandarlos en
    //cero o nulos con el formulario completo, y eso no es un error. El Controller los persiste
    //como NULL.
    if (TipoCompra === 'CREDITO') {
        try {
            validarCreditoCompra({
                numeroCuotas: NumeroCuotas,
                valorCuota: ValorCuota,
                fechaCompromiso: FechaCompromiso,
                traeCuotas: Array.isArray(Cuotas) && Cuotas.length > 0
            });
            validarCuotasCompra(Cuotas, NumeroCuotas);
        } catch (error) {
            return res.status(400).json({msg:String(error.message || error)});
        }
    }

    if (!Array.isArray(Articulos) || Articulos.length === 0) {
        return res.status(400).json({msg:'Debe registrar al menos un artículo'});
    }
    //tope superior de lineas: cada linea cuesta una consulta al pool en el Controller y un lock
    //de fila de Existencias retenido hasta el commit. Mismo limite que la venta.
    if (Articulos.length > 200) {
        return res.status(400).json({msg:'La compra no puede tener más de 200 líneas'});
    }

    for (const item of Articulos) {
        //sin este guarda, un elemento null de la lista haria estallar el acceso a item.idBodega
        //y la ruta respondería 500 (con stack trace) en vez de un 400 de validacion.
        if (item === null || typeof item !== 'object' || Array.isArray(item)) {
            return res.status(400).json({msg:'Línea de compra inválida'});
        }
        if (!Number.isInteger(item.idBodega)) {
            return res.status(400).json({msg:'idBodega inválido'});
        }

        //cada linea compra un articulo que ya existe, O da de alta uno nuevo. Las dos cosas a la
        //vez, o ninguna, es un payload contradictorio: se rechaza en vez de adivinar cual gana.
        const traeExistente = item.idArticulo !== undefined && item.idArticulo !== null;
        const traeNuevo = item.ArticuloNuevo !== undefined && item.ArticuloNuevo !== null;
        if (traeExistente === traeNuevo) {
            return res.status(400).json({msg:'Cada línea debe traer idArticulo o ArticuloNuevo, no ambos'});
        }

        if (traeExistente && !Number.isInteger(item.idArticulo)) {
            return res.status(400).json({msg:'idArticulo inválido'});
        }

        if (traeNuevo) {
            const nuevo = item.ArticuloNuevo;
            if (typeof nuevo !== 'object' || Array.isArray(nuevo)) {
                return res.status(400).json({msg:'ArticuloNuevo inválido'});
            }
            if (!Number.isInteger(nuevo.idProducto)) {
                return res.status(400).json({msg:'idProducto inválido en ArticuloNuevo'});
            }
            //mismas reglas que el alta suelta de un articulo (nombre, descripcion, propiedades),
            //reutilizadas desde Helpers/articulos.js para que no se dupliquen ni se desincronicen.
            const errorArticulo = validarDatosArticulo(nuevo);
            if (errorArticulo) {
                return res.status(400).json({msg:errorArticulo});
            }
        }

        if (isNaN(Number(item.Cantidad)) || Number(item.Cantidad) <= 0) {
            return res.status(400).json({msg:'Cantidad inválida'});
        }
        if (isNaN(Number(item.CostoUnidad)) || Number(item.CostoUnidad) <= 0) {
            return res.status(400).json({msg:'CostoUnidad inválido'});
        }
    }

    next();
};

//las dos cotas del rango de fechas son OPCIONALES e INDEPENDIENTES: ausente, vacia o null es
//"sin cota por ese lado". Devuelve la fecha ya normalizada a 'YYYY-MM-DD HH:MM:SS' o null, y
//lanza si el valor es basura, para que el llamador responda 400 con el nombre del campo.
//
//No se valida con Date.parse -- como hace el kardex -- porque Date.parse acepta '2026-02-31' y
//lo corre al 3 de marzo: normalizarFecha lo rechaza.
const cotaDelRango = (valor, normalizador) => {
    if (valor === undefined || valor === null) return null;
    if (typeof valor === 'string' && valor.trim().length === 0) return null;
    return normalizador(valor);
};

const compraValidaFiltros = async (req,res,next) => {
    const {campoOrdenar, pagina, textoFiltro, idTercero, fechaInicio, fechaFin} = req.body;

    if (!Number.isInteger(pagina)) {
        return res.status(400).json({msg:'Pagina invalida'});
    }

    //campoOrdenar es OBLIGATORIO, igual que en los demas listados paginados del backend:
    //1 NumeroDocumentoSoporte, 2 TerceroTipoDoc, 3 TerceroNumeroDoc, 4 TerceroNombre,
    //5 FechaCreacion. El Controller es quien traduce el numero a un nombre de columna.
    if (campoOrdenar !== 1 && campoOrdenar !== 2 && campoOrdenar !== 3 && campoOrdenar !== 4 && campoOrdenar !== 5) {
        return res.status(400).json({msg:'Campo de orden invalido'});
    }

    //idTercero del filtro: ausente o 0 trae las compras de todos los terceros, y un id positivo
    //solo las de ese tercero. Se rechaza null a proposito -- misma regla que el idVendedor de
    //Ventas --: dejarlo pasar lo convertiria en "todos" sin que nadie lo haya pedido. No existe
    //el caso -1 de Ventas porque Compras.TerceroId es NOT NULL: no hay compras sin tercero.
    if (idTercero !== undefined) {
        if (!Number.isInteger(idTercero) || idTercero < 0) {
            return res.status(400).json({msg:'Tercero invalido'});
        }
    }

    if (textoFiltro === undefined || !textoFiltro || String(textoFiltro).trim().length === 0) {
    } else {
        //el tope es el de la columna mas larga por la que se puede filtrar (TerceroNombre,
        //VARCHAR(300)) recortado a 100: por encima de eso el texto ya no puede casar con nada
        //util y solo sirve para pedir un LIKE caro.
        if (String(textoFiltro).trim().length > 100) {
            return res.status(400).json({msg:'Texto de filtro supera los 100 caracteres'});
        }
    }

    //el rango filtra por FechaCreacion y se aplica ordene por donde ordene el listado, a
    //diferencia del textoFiltro, que se desactiva con campoOrdenar: 5.
    let vFechaInicio;
    try {
        vFechaInicio = cotaDelRango(fechaInicio, normalizarFecha);
    } catch {
        return res.status(400).json({msg:'Fecha inicio inválida'});
    }

    //la cota superior se lleva al final del dia cuando viene sin hora: 'YYYY-MM-DD' es
    //medianoche y dejaria fuera las compras de ese mismo dia.
    let vFechaFin;
    try {
        vFechaFin = cotaDelRango(fechaFin, normalizarFechaFin);
    } catch {
        return res.status(400).json({msg:'Fecha fin inválida'});
    }

    //solo hay rango que invertir cuando llegan las dos. Se comparan YA normalizadas, asi que
    //el mismo dia en ambas cotas (00:00:00 contra 23:59:59) es valido: es el caso mas comun del
    //filtro. Las cadenas 'YYYY-MM-DD HH:MM:SS' se ordenan alfabeticamente igual que en el tiempo.
    if (vFechaInicio !== null && vFechaFin !== null && vFechaInicio > vFechaFin) {
        return res.status(400).json({msg:'Rango de fechas inválido'});
    }

    next();
};

//anular es la unica operacion correctiva sobre una compra: no existe edicion, porque una
//compra ya movio existencias y ya recalculo el costo promedio de una o varias bolsas.
//El minimo de 5 caracteres existe para que el campo signifique algo: un motivo de un caracter
//es el mismo vacio con mas pasos.
const compraValidaAnulacion = async (req,res,next) => {
    const {MotivoAnulacion} = req.body;

    if (typeof MotivoAnulacion !== 'string') {
        return res.status(400).json({msg:'El motivo de anulación es obligatorio'});
    }

    const motivo = MotivoAnulacion.trim();
    if (motivo.length < MOTIVO_ANULACION_MIN) {
        return res.status(400).json({msg:`El motivo de anulación debe tener al menos ${MOTIVO_ANULACION_MIN} caracteres`});
    }
    if (motivo.length > MOTIVO_ANULACION_MAX) {
        return res.status(400).json({msg:`El motivo de anulación supera los ${MOTIVO_ANULACION_MAX} caracteres`});
    }

    next();
};

export { compraValidaDatos, compraValidaFiltros, compraValidaAnulacion };
