import Terceros from '../Models/terceros.js';
import TiposDocumento from '../Models/tiposDocumento.js';
import Articulos from '../Models/articulos.js';
import Productos from '../Models/productos.js';
import Bodegas from '../Models/bodegas.js';
import Compras from '../Models/compras.js';
import CompraDetalles from '../Models/compraDetalles.js';
import CompraCuotas from '../Models/compraCuotas.js';
import { crearCompra, anularCompra } from '../Helpers/compraService.js';
import { validarPropiedadesArticulo } from '../Helpers/propiedadesValidacion.js';
import { normalizarFecha } from '../Helpers/fechas.js';

//mismo criterio que el catch de `crear`: un Error plano de este modulo trae reglas de negocio y
//es culpa del cliente (400); un error del driver mysql2 trae code/sqlState y es del servidor
//(500, con mensaje generico, sin filtrar nombres de tabla ni de constraint).
//ER_DUP_ENTRY es el caso especial: es el choque contra uq_compracuota_numero, que SI es algo
//que el cliente puede corregir.
const responderErrorDeCuota = (res, error, verbo) => {
    if (error && error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({msg:'Esa cuota ya está registrada'});
    }
    if (error && (error.code || error.sqlState)) {
        return res.status(500).json({msg:`Ocurrió un error inesperado al ${verbo} la cuota`});
    }
    return res.status(400).json({msg:String(error.message || error)});
};

const comprasControllers = {
    crear: async (req,res) => {
        try {
            const {idEmpresa, idTercero, TipoCompra, NumeroDocumentoSoporte,
                   ValorDescuento, ValorEfectivo, ValorTransaccion,
                   FechaCompromiso, NumeroCuotas, ValorCuota, Cuotas} = req.body;
            const articulosBody = req.body.Articulos;
            const UsuIdLogin = req.usuario.Id;

            
            const tercero = await Terceros.traerPorId({pId:idTercero, pEmpId:idEmpresa});
            if (!tercero || !tercero.terEstado) {
                return res.status(400).json({msg:'Tercero inválido'});
            }

            let tipoDocAbreviatura = null;
            if (tercero.terTipDocId !== null && tercero.terTipDocId !== undefined) {
                const tipoDoc = await TiposDocumento.traerPorId({pId:tercero.terTipDocId, pEmpId:idEmpresa});
                tipoDocAbreviatura = tipoDoc ? tipoDoc.tipDocAbreviatura : null;
            }

            //cada linea se valida AQUI, antes de la transaccion. Las que traen idArticulo
            //resuelven su Nombre desde la base (el snapshot de CompraDetalles nunca usa un nombre
            //que mande el cliente); las que traen ArticuloNuevo solo verifican que el Producto
            //exista, porque el articulo se crea despues, dentro de la transaccion de la compra.
            //A diferencia de la venta, NO se exige Vender=true: esa bandera gobierna la venta, y
            //un articulo comprado nace justamente con Vender=false.
            const articulosResueltos = [];
            for (const item of articulosBody) {
                const bodega = await Bodegas.traerPorId({pId:item.idBodega, pEmpId:idEmpresa});
                if (!bodega || !bodega.bodEstado) {
                    return res.status(400).json({msg:`Bodega ${item.idBodega} inválida`});
                }

                if (item.ArticuloNuevo) {
                    const producto = await Productos.traerPorId({pId:item.ArticuloNuevo.idProducto, pEmpId:idEmpresa});
                    if (!producto || !producto.proEstado) {
                        return res.status(400).json({msg:`Producto ${item.ArticuloNuevo.idProducto} inválido`});
                    }

                    //sin esto, un idPropiedad de otra empresa llegaria hasta
                    //ArticuloPropiedades.reemplazarValores y escribiria una fila apuntando a una
                    //Propiedad ajena (la FK de Propiedades no esta acotada por empresa). Misma
                    //funcion que usa el alta suelta de un articulo, para no duplicar la regla.
                    const errorPropiedades = await validarPropiedadesArticulo(idEmpresa, item.ArticuloNuevo.Propiedades);
                    if (errorPropiedades) {
                        return res.status(400).json({msg:errorPropiedades});
                    }

                    articulosResueltos.push({
                        idBodega: item.idBodega,
                        Cantidad: item.Cantidad,
                        CostoUnidad: item.CostoUnidad,
                        articuloNuevo: {
                            pProductoId: item.ArticuloNuevo.idProducto,
                            //mismo tratamiento que el alta suelta de un articulo: mayusculas y
                            //sin espacios sobrantes.
                            pNombre: String(item.ArticuloNuevo.Nombre).toUpperCase().trim(),
                            pDescripcion: item.ArticuloNuevo.Descripcion
                                ? String(item.ArticuloNuevo.Descripcion).trim()
                                : null,
                            pPropiedades: item.ArticuloNuevo.Propiedades ?? []
                        }
                    });
                    continue;
                }

                const articulo = await Articulos.traerPorId({pId:item.idArticulo, pEmpId:idEmpresa});
                if (!articulo || !articulo.artEstado) {
                    return res.status(400).json({msg:`Articulo ${item.idArticulo} no disponible para la compra`});
                }

                articulosResueltos.push({
                    idArticulo: item.idArticulo,
                    idBodega: item.idBodega,
                    ArticuloNombre: articulo.artNombre,
                    Cantidad: item.Cantidad,
                    CostoUnidad: item.CostoUnidad
                });
            }

            //Terceros.Apellidos es NULL-able en el esquema: concatenar con plantilla grabaria el
            //literal "NOMBRE null" en un snapshot que ya no se puede corregir. Y como
            //Nombre(150) + espacio + Apellidos(150) puede dar 301 caracteres contra un
            //TerceroNombre VARCHAR(300), se recorta antes de que el INSERT falle en modo estricto.
            const terceroNombreCompleto = [tercero.terNombres, tercero.terApellidos].filter(Boolean).join(' ').trim().slice(0, 300);

            const soporte = NumeroDocumentoSoporte && String(NumeroDocumentoSoporte).trim().length > 0
                ? String(NumeroDocumentoSoporte).trim()
                : null;

            //las fechas se normalizan aqui, donde ya se resuelven los demas valores confiables.
            //normalizarFecha lanza con basura; el middleware de ruta ya la rechazo con 400, asi
            //que esto es una red de seguridad que el catch convierte en 400.
            const fechaCompromiso = normalizarFecha(FechaCompromiso);
            const cuotasResueltas = Array.isArray(Cuotas)
                ? Cuotas.map(c => ({
                    NumCuota: c.NumCuota,
                    ValorCuota: Number(c.ValorCuota),
                    FechaPago: normalizarFecha(c.FechaPago),
                    Estado: c.Estado ?? 'PENDIENTE'
                }))
                : null;

            const compraId = await crearCompra({
                pEmpId: idEmpresa, pUsuId: UsuIdLogin, pTerceroId: idTercero,
                pTerceroTipoDoc: tipoDocAbreviatura,
                pTerceroNumeroDoc: tercero.terNumDoc,
                pTerceroNombre: terceroNombreCompleto,
                pNumeroDocumentoSoporte: soporte,
                pTipoCompra: TipoCompra,
                pValorDescuento: ValorDescuento,
                pValorEfectivo: ValorEfectivo,
                pValorTransaccion: ValorTransaccion,
                pFechaCompromiso: fechaCompromiso,
                pNumeroCuotas: NumeroCuotas ?? null,
                pValorCuota: ValorCuota ?? null,
                cuotas: cuotasResueltas,
                articulosComprados: articulosResueltos
            });

            if (compraId > 0) {
                return res.status(200).json({msg:'Compra registrada', idCompra: compraId});
            }
            return res.status(400).json({msg:'Error registrando la compra'});
        } catch (error) {
            //crearCompraContado y sus funciones de calculo propagan Error planos con reglas de
            //negocio (saldo distinto de cero, articulo repetido con costos distintos): esos son
            //errores del cliente, por eso 400 con el mensaje. Un error del driver mysql2 (deadlock,
            //conexion caida, violacion de FK) SI trae `code`/`sqlState` -- un Error plano de este
            //modulo nunca los tiene -- y es un fallo del servidor, no algo que el cliente pueda
            //corregir: se responde 500 con un mensaje generico, sin filtrar el texto crudo de MySQL
            //ni los nombres de tabla/constraint que expone.
            if (error && (error.code || error.sqlState)) {
                return res.status(500).json({msg:'Ocurrió un error inesperado al registrar la compra'});
            }
            return res.status(400).json({msg:String(error.message || error)});
        }
    },

    listarTodas: async (req,res) => {
        try {
            const {idEmpresa, campoOrdenar, orden, pagina, textoFiltro, idTercero} = req.body;

            let vPagina = Number(pagina);

            //cualquier valor que no sea la cadena 'DESC' ordena ascendente. Es la convencion de
            //los otros diez listados paginados: 1 y 2 NO son ASC y DESC, aunque la documentacion
            //lo dijera hasta 2026-09-22.
            const vOrden = (orden === 'DESC') ? 'DESC' : 'ASC';

            //el numero de la ruta se traduce aqui al nombre de la columna. El modelo vuelve a
            //validarlo contra su lista blanca: es el unico dato del listado que viaja al SQL
            //interpolado y no como parametro.
            let vCampoOrdenar = '';
            switch (campoOrdenar) {
                case 1:
                    vCampoOrdenar = 'NumeroDocumentoSoporte';
                    break;
                case 2:
                    vCampoOrdenar = 'TerceroTipoDoc';
                    break;
                case 3:
                    vCampoOrdenar = 'TerceroNumeroDoc';
                    break;
                case 4:
                    vCampoOrdenar = 'TerceroNombre';
                    break;
                case 5:
                    vCampoOrdenar = 'FechaCreacion';
                    break;
                default:
                    vCampoOrdenar = 'FechaCreacion';
                    break;
            }

            //el campo por el que se ordena es el mismo por el que filtra textoFiltro. La fecha
            //no es texto, asi que al ordenar por ella el filtro de texto se desactiva.
            let vTextoFiltro = '%%';
            if (campoOrdenar !== 5) {
                if (textoFiltro !== undefined && textoFiltro && String(textoFiltro).trim().length > 0) {
                    vTextoFiltro = '%' + String(textoFiltro).trim() + '%';
                }
            }

            //ausente, 0 o negativo = todos los terceros. La ruta ya rechazo null y los no enteros.
            const vTerceroId = Number.isInteger(idTercero) && idTercero > 0 ? idTercero : 0;

            //contarTodo y traerTodo reciben EXACTAMENTE los mismos filtros: si se separan,
            //cantData deja de corresponder con las paginas que devuelve el listado.
            const cantCompras = await Compras.contarTodo({
                pEmpId:idEmpresa, pCampoOrden:vCampoOrdenar, pTexto:vTextoFiltro, pTerceroId:vTerceroId
            });
            const maxPagina = Math.max(1, Math.ceil(cantCompras/50));
            vPagina = Math.min(Math.max(vPagina,1), maxPagina);
            const vOffset = (vPagina - 1) * 50;

            const compras = await Compras.traerTodo({
                pEmpId:idEmpresa, pOffset:vOffset, pCampoOrden:vCampoOrdenar, pOrden:vOrden,
                pTexto:vTextoFiltro, pTerceroId:vTerceroId
            });

            return res.status(200).json({cantData:cantCompras, data:compras});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    },

    listarPorId: async (req,res) => {
        try {
            const {idEmpresa, idCompra} = req.body;

            const compra = await Compras.traerPorId({pEmpId:idEmpresa, pId:idCompra});
            if (!compra) {
                return res.status(400).json({msg:'Compra inválida'});
            }

            const lineas = await CompraDetalles.traerPorCompra({pEmpId:idEmpresa, pCompraId:idCompra});

            //las cuotas viajan con su compra: nunca se consultan sin ella, asi que no hay un
            //endpoint aparte. En una compra de contado el arreglo sale vacio.
            const cuotas = compra.compraTipoCompra === 'CREDITO'
                ? await CompraCuotas.traerPorCompra({pEmpId:idEmpresa, pCompraId:idCompra})
                : [];

            return res.status(200).json({data:{...compra, lineas, cuotas}});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    },

    anular: async (req,res) => {
        try {
            const {idEmpresa, idCompra, MotivoAnulacion} = req.body;
            const UsuIdLogin = req.usuario.Id;

            //se lee primero solo para distinguir "no existe" (400) de "ya estaba anulada" (400).
            //La decision de escribir NO depende de esta lectura: el UPDATE lleva su propio
            //AND Estado = TRUE, que es lo que cierra la carrera entre leer y escribir.
            const compra = await Compras.traerPorId({pEmpId:idEmpresa, pId:idCompra});
            if (!compra) {
                return res.status(400).json({msg:'Compra inválida'});
            }

            const anulada = await anularCompra({
                pEmpId: idEmpresa, pCompraId: idCompra, pUsuId: UsuIdLogin,
                pMotivo: String(MotivoAnulacion).trim()
            });
            if (!anulada) {
                return res.status(400).json({msg:'La compra ya está anulada'});
            }

            //anular NO revierte inventario ni caja: hoy el ajuste es manual, por el modulo de
            //Ajustes. El mensaje se lo recuerda al usuario en vez de dejarlo suponer.
            return res.status(200).json({
                msg:'Compra anulada. El inventario no se revirtió: ajústelo manualmente si corresponde.'
            });
        } catch (error) {
            if (error && (error.code || error.sqlState)) {
                return res.status(500).json({msg:'Ocurrió un error inesperado al anular la compra'});
            }
            return res.status(400).json({msg:String(error.message || error)});
        }
    },

    //---- cuotas de una compra a credito ----
    //
    //El desglose es informativo: el proveedor calcula las cuotas por fuera del sistema y el
    //usuario las transcribe. Marcar una cuota como CANCELADA (= pagada) NO mueve caja ni
    //recalcula el ValorSaldo de la cabecera: para eso hara falta el modulo de Abonos.
    //
    //Los tres comparten la misma guarda: una compra anulada congela sus cuotas. Congelar es
    //impedir la escritura, no ocultar la lectura -- getidcompra las sigue devolviendo.

    crearCuota: async (req,res) => {
        try {
            const {idEmpresa, idCompra, NumCuota, ValorCuota, FechaPago, Estado} = req.body;

            const compra = await Compras.traerPorId({pEmpId:idEmpresa, pId:idCompra});
            if (!compra) {
                return res.status(400).json({msg:'Compra inválida'});
            }
            if (!compra.compraEstado) {
                return res.status(400).json({msg:'La compra está anulada'});
            }
            if (compra.compraTipoCompra !== 'CREDITO') {
                return res.status(400).json({msg:'Solo una compra a crédito tiene cuotas'});
            }
            //el tope superior de NumCuota es el NumeroCuotas de ESTA compra: es un dato de la
            //base, por eso se valida aqui y no en el middleware de ruta.
            if (NumCuota > compra.compraNumeroCuotas) {
                return res.status(400).json({msg:`El número de cuota no puede superar ${compra.compraNumeroCuotas}`});
            }

            const cuotaId = await CompraCuotas.crear({
                pEmpId: idEmpresa, pCompraId: idCompra, pNumCuota: NumCuota,
                pValorCuota: Number(ValorCuota), pFechaPago: normalizarFecha(FechaPago),
                pEstado: Estado ?? 'PENDIENTE'
            });

            return res.status(200).json({msg:'Cuota registrada', idCuota: cuotaId});
        } catch (error) {
            return responderErrorDeCuota(res, error, 'registrar');
        }
    },

    actualizarCuota: async (req,res) => {
        try {
            const {idEmpresa, idCuota, NumCuota, ValorCuota, FechaPago, Estado} = req.body;

            //traerPorId ya trae el estado y el NumeroCuotas de la compra: una consulta, no dos.
            const cuota = await CompraCuotas.traerPorId({pEmpId:idEmpresa, pId:idCuota});
            if (!cuota) {
                return res.status(400).json({msg:'Cuota inválida'});
            }
            if (!cuota.compraEstado) {
                return res.status(400).json({msg:'La compra está anulada'});
            }
            if (NumCuota !== undefined && NumCuota > cuota.compraNumeroCuotas) {
                return res.status(400).json({msg:`El número de cuota no puede superar ${cuota.compraNumeroCuotas}`});
            }

            //undefined significa "no cambiar" y llega asi hasta el modelo, que arma el SET con
            //lo que si vino. null en FechaPago SI es un cambio: vacia la fecha.
            const filas = await CompraCuotas.actualizar({
                pEmpId: idEmpresa, pId: idCuota,
                pNumCuota: NumCuota,
                pValorCuota: ValorCuota === undefined ? undefined : Number(ValorCuota),
                pFechaPago: FechaPago === undefined ? undefined : normalizarFecha(FechaPago),
                pEstado: Estado
            });
            if (filas === 0) {
                return res.status(400).json({msg:'No se actualizó la cuota'});
            }

            return res.status(200).json({msg:'Cuota actualizada'});
        } catch (error) {
            return responderErrorDeCuota(res, error, 'actualizar');
        }
    },

    eliminarCuota: async (req,res) => {
        try {
            const {idEmpresa, idCuota} = req.body;

            const cuota = await CompraCuotas.traerPorId({pEmpId:idEmpresa, pId:idCuota});
            if (!cuota) {
                return res.status(400).json({msg:'Cuota inválida'});
            }
            if (!cuota.compraEstado) {
                return res.status(400).json({msg:'La compra está anulada'});
            }

            //borrado real, no logico: esta tabla no tiene columna de estado de fila y sus datos
            //son una transcripcion informativa sin valor contable. Decision explicita.
            await CompraCuotas.eliminar({pEmpId:idEmpresa, pId:idCuota});

            //204 no lleva cuerpo: .send(), nunca .json().
            return res.status(204).send();
        } catch (error) {
            return responderErrorDeCuota(res, error, 'eliminar');
        }
    }
};

export default comprasControllers;
