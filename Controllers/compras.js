import Terceros from '../Models/terceros.js';
import TiposDocumento from '../Models/tiposDocumento.js';
import Articulos from '../Models/articulos.js';
import Productos from '../Models/productos.js';
import Bodegas from '../Models/bodegas.js';
import Compras from '../Models/compras.js';
import CompraDetalles from '../Models/compraDetalles.js';
import { crearCompraContado } from '../Helpers/compraService.js';
import { validarPropiedadesArticulo } from '../Helpers/propiedadesValidacion.js';

const comprasControllers = {
    crear: async (req,res) => {
        try {
            const {idEmpresa, idTercero, TipoCompra, NumeroDocumentoSoporte,
                   ValorDescuento, ValorEfectivo, ValorTransaccion} = req.body;
            const articulosBody = req.body.Articulos;
            const UsuIdLogin = req.usuario.Id;

            //solo CONTADO esta implementado en esta fase; el validador de ruta ya acepta los 3
            //valores del CHECK para que este mismo endpoint sirva sin renombrarse cuando se
            //construyan la compra con saldo (POR_ABONO) y la compra a credito.
            if (TipoCompra !== 'CONTADO') {
                return res.status(400).json({msg:'Esta modalidad de compra aún no está disponible'});
            }

            //OJO con los nombres de campo: Terceros.traerPorId devuelve columnas ALIASADAS
            //(terEstado, terTipDocId, terNumDoc, terNombres, terApellidos), no los nombres crudos
            //de la tabla. Controllers/ventas.js lee tercero.Estado / .TipoDocumento / .Nombre /
            //.Apellidos, que son undefined con ese modelo -- de ahi que su guard !tercero.Estado
            //sea siempre verdadero y rechace toda venta. Aqui se usan los alias reales.
            const tercero = await Terceros.traerPorId({pId:idTercero, pEmpId:idEmpresa});
            if (!tercero || !tercero.terEstado) {
                return res.status(401).json({msg:'Tercero inválido'});
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
                    return res.status(401).json({msg:`Bodega ${item.idBodega} inválida`});
                }

                if (item.ArticuloNuevo) {
                    const producto = await Productos.traerPorId({pId:item.ArticuloNuevo.idProducto, pEmpId:idEmpresa});
                    if (!producto || !producto.proEstado) {
                        return res.status(401).json({msg:`Producto ${item.ArticuloNuevo.idProducto} inválido`});
                    }

                    //sin esto, un idPropiedad de otra empresa llegaria hasta
                    //ArticuloPropiedades.reemplazarValores y escribiria una fila apuntando a una
                    //Propiedad ajena (la FK de Propiedades no esta acotada por empresa). Misma
                    //funcion que usa el alta suelta de un articulo, para no duplicar la regla.
                    const errorPropiedades = await validarPropiedadesArticulo(idEmpresa, item.ArticuloNuevo.Propiedades);
                    if (errorPropiedades) {
                        return res.status(401).json({msg:errorPropiedades});
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
                    return res.status(401).json({msg:`Articulo ${item.idArticulo} no disponible para la compra`});
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

            const compraId = await crearCompraContado({
                pEmpId: idEmpresa, pUsuId: UsuIdLogin, pTerceroId: idTercero,
                pTerceroTipoDoc: tipoDocAbreviatura,
                pTerceroNumeroDoc: tercero.terNumDoc,
                pTerceroNombre: terceroNombreCompleto,
                pNumeroDocumentoSoporte: soporte,
                pValorDescuento: ValorDescuento, pValorEfectivo: ValorEfectivo,
                pValorTransaccion: ValorTransaccion,
                articulosComprados: articulosResueltos
            });

            if (compraId > 0) {
                return res.status(200).json({msg:'Compra registrada', idCompra: compraId});
            }
            return res.status(401).json({msg:'Error registrando la compra'});
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
            const {idEmpresa, pagina} = req.body;

            let vPagina = Number(pagina);
            const cantCompras = await Compras.contarTodo({pEmpId:idEmpresa});
            const maxPagina = Math.max(1, Math.ceil(cantCompras/50));
            vPagina = Math.min(Math.max(vPagina,1), maxPagina);
            const vOffset = (vPagina - 1) * 50;

            const compras = await Compras.traerTodo({pEmpId:idEmpresa, pOffset:vOffset});

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
                return res.status(401).json({msg:'Compra inválida'});
            }

            const lineas = await CompraDetalles.traerPorCompra({pEmpId:idEmpresa, pCompraId:idCompra});

            return res.status(200).json({data:{...compra, lineas}});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    }
};

export default comprasControllers;
