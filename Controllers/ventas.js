import Terceros from '../Models/terceros.js';
import TiposDocumento from '../Models/tiposDocumento.js';
import Articulos from '../Models/articulos.js';
import Existencias from '../Models/existencias.js';
import Bodegas from '../Models/bodegas.js';
import Ventas from '../Models/ventas.js';
import VentaDetalles from '../Models/ventaDetalles.js';
import { crearVentaContado } from '../Helpers/ventaService.js';

const ventasControllers = {
    crear: async (req,res) => {
        try {
            const {idEmpresa, idTercero, TipoVenta, ValorDescuento, ValorEfectivo, ValorTransaccion} = req.body;
            const articulosBody = req.body.Articulos;
            const UsuIdLogin = req.usuario.Id;

            //solo CONTADO esta implementado en esta fase; el resto del validador de ruta ya
            //acepta los 3 valores del CHECK para que este mismo endpoint sirva sin renombrarse
            //cuando se construyan las otras modalidades.
            if (TipoVenta !== 'CONTADO') {
                return res.status(400).json({msg:'Esta modalidad de venta aún no está disponible'});
            }

            const tercero = await Terceros.traerPorId({pId:idTercero, pEmpId:idEmpresa});
            if (!tercero || !tercero.Estado) {
                return res.status(401).json({msg:'Tercero inválido'});
            }

            let tipoDocAbreviatura = null;
            if (tercero.TipoDocumento !== null && tercero.TipoDocumento !== undefined) {
                const tipoDoc = await TiposDocumento.traerPorId({pId:tercero.TipoDocumento, pEmpId:idEmpresa});
                tipoDocAbreviatura = tipoDoc ? tipoDoc.tipDocAbreviatura : null;
            }

            //cada idArticulo se valida y se resuelve su Nombre AQUI, antes de la transaccion:
            //el snapshot de VentaDetalles nunca usa un nombre que mande el cliente. Cada linea
            //trae su propia idBodega (un mismo articulo puede venderse en parte desde una bodega
            //y en parte desde otra dentro de la misma venta), validada contra la empresa del
            //token igual que idArticulo/idTercero. De la bolsa DISPONIBLE de ESA bodega en
            //Existencias sale CostoUnitario (el costo vive por bodega, no en Articulos), que el
            //servicio guarda en el kardex como rastro de auditoria: leerlo aqui evita que el
            //servicio vuelva a consultar cada articulo (2N consultas en vez de N) y cierra la
            //ventana TOCTOU entre ambas lecturas.
            const articulosResueltos = [];
            for (const item of articulosBody) {
                const articulo = await Articulos.traerPorId({pId:item.idArticulo, pEmpId:idEmpresa});
                if (!articulo || !articulo.artEstado || !articulo.artVender) {
                    return res.status(401).json({msg:`Articulo ${item.idArticulo} no disponible para la venta`});
                }

                const bodega = await Bodegas.traerPorId({pId:item.idBodega, pEmpId:idEmpresa});
                if (!bodega || !bodega.bodEstado) {
                    return res.status(401).json({msg:`Bodega ${item.idBodega} inválida`});
                }

                const bolsaDisponible = await Existencias.traerBolsa({
                    pEmpId:idEmpresa, pBodegaId:item.idBodega, pArticuloId:item.idArticulo,
                    pBolsaEstado:'DISPONIBLE', pPropietarioId:null
                });
                articulosResueltos.push({
                    idArticulo: item.idArticulo,
                    idBodega: item.idBodega,
                    ArticuloNombre: articulo.artNombre,
                    Cantidad: item.Cantidad,
                    PrecioVentaUnidad: item.PrecioVentaUnidad,
                    CostoUnitario: bolsaDisponible ? bolsaDisponible.CostoUnitario : null
                });
            }

            //Terceros.Apellidos es NULL-able en el esquema (el validador de la API lo exige hoy,
            //pero una fila sembrada directo o heredada puede no tenerlo): concatenar con plantilla
            //grabaria el literal "NOMBRE null" en un snapshot que ya no se puede corregir. Y como
            //Nombre(150) + espacio + Apellidos(150) puede dar 301 caracteres contra un
            //TerceroNombre VARCHAR(300), se recorta antes de que el INSERT falle en modo estricto.
            const terceroNombreCompleto = [tercero.Nombre, tercero.Apellidos].filter(Boolean).join(' ').trim().slice(0, 300);

            const ventaId = await crearVentaContado({
                pEmpId: idEmpresa, pUsuId: UsuIdLogin, pTerceroId: idTercero,
                pTerceroTipoDoc: tipoDocAbreviatura,
                pTerceroNumeroDoc: tercero.NumeroDocumento,
                pTerceroNombre: terceroNombreCompleto,
                pValorDescuento: ValorDescuento, pValorEfectivo: ValorEfectivo, pValorTransaccion: ValorTransaccion,
                articulosVendidos: articulosResueltos
            });

            if (ventaId > 0) {
                return res.status(200).json({msg:'Venta registrada', idVenta: ventaId});
            }
            return res.status(401).json({msg:'Error registrando la venta'});
        } catch (error) {
            //crearVentaContado y sus funciones de calculo propagan Error planos con reglas de
            //negocio (saldo distinto de cero, articulo repetido con precios distintos,
            //existencia insuficiente): son errores del cliente, por eso 400 y no 500.
            return res.status(400).json({msg:String(error.message || error)});
        }
    },

    listarTodas: async (req,res) => {
        try {
            const {idEmpresa, pagina} = req.body;

            let vPagina = Number(pagina);
            const cantVentas = await Ventas.contarTodo({pEmpId:idEmpresa});
            const maxPagina = Math.max(1, Math.ceil(cantVentas/50));
            vPagina = Math.min(Math.max(vPagina,1), maxPagina);
            const vOffset = (vPagina - 1) * 50;

            const ventas = await Ventas.traerTodo({pEmpId:idEmpresa, pOffset:vOffset});

            return res.status(200).json({cantData:cantVentas, data:ventas});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    },

    listarPorId: async (req,res) => {
        try {
            const {idEmpresa, idVenta} = req.body;

            const venta = await Ventas.traerPorId({pEmpId:idEmpresa, pId:idVenta});
            if (!venta) {
                return res.status(401).json({msg:'Venta inválida'});
            }

            const lineas = await VentaDetalles.traerPorVenta({pEmpId:idEmpresa, pVentaId:idVenta});

            return res.status(200).json({data:{...venta, lineas}});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    }
};

export default ventasControllers;
