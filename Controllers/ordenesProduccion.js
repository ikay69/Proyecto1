import Articulos from '../Models/articulos.js';
import OrdenesProduccion from '../Models/ordenesProduccion.js';
import Movimientos from '../Models/movimientos.js';
import Terceros from '../Models/terceros.js';
import Bodegas from '../Models/bodegas.js';
import { crearOrdenProduccion } from '../Helpers/produccionService.js';

const ordenesProduccionControllers = {
    crear: async (req,res) => {
        try {
            const {idEmpresa, Observaciones, consumos, producidos} = req.body;
            const UsuIdLogin = req.usuario.Id;

            //crearOrdenProduccion ya valida la existencia de cada consumo (Articulos.traerPorId
            //dentro de la transaccion), pero NO la de los producidos: sin esta comprobacion un
            //idArticulo de otra empresa recibiria Existencias/Movimientos marcados con la EmpresaId
            //del llamador. Se revisan TODOS los producidos aqui, antes de abrir la transaccion.
            for (const producido of producidos) {
                const existeArticulo = await Articulos.traerPorId({pId:producido.idArticulo, pEmpId:idEmpresa});
                if (!existeArticulo) {
                    return res.status(401).json({msg:`Articulo ${producido.idArticulo} inválido`});
                }
                const existeBodega = await Bodegas.traerPorId({pId:producido.idBodega, pEmpId:idEmpresa});
                if (!existeBodega || !existeBodega.bodEstado) {
                    return res.status(401).json({msg:`Bodega ${producido.idBodega} inválida`});
                }
            }

            //la bodega de cada consumo tampoco la valida crearOrdenProduccion: sin esta
            //comprobacion se descontaria/costearia una bolsa de una bodega de otra empresa. El
            //propietario de cada bolsa consumida tampoco lo valida crearOrdenProduccion: sin esta
            //comprobacion se descontaria la bolsa de un Tercero de otra empresa.
            for (const consumo of consumos) {
                const existeBodega = await Bodegas.traerPorId({pId:consumo.idBodega, pEmpId:idEmpresa});
                if (!existeBodega || !existeBodega.bodEstado) {
                    return res.status(401).json({msg:`Bodega ${consumo.idBodega} inválida`});
                }
                if (consumo.idPropietario === undefined || consumo.idPropietario === null) continue;
                const existePropietario = await Terceros.traerPorId({pId:consumo.idPropietario, pEmpId:idEmpresa});
                if (!existePropietario) {
                    return res.status(401).json({msg:`Propietario ${consumo.idPropietario} inválido`});
                }
            }

            const ordenId = await crearOrdenProduccion({
                pEmpId: idEmpresa, pUsuId: UsuIdLogin,
                pObservaciones: Observaciones ?? null, consumos, producidos
            });

            if (ordenId > 0) {
                return res.status(200).json({msg:'Orden de producción registrada'});
            }
            return res.status(401).json({msg:'Error registrando la orden'});
        } catch (error) {
            //crearOrdenProduccion propaga Error planos con las reglas de negocio (articulo
            //inexistente, existencia insuficiente, bolsa/propietario incoherentes): son errores
            //del cliente, por eso salen como 400 y no como 500
            return res.status(400).json({msg:String(error.message || error)});
        }
    },

    listarTodas: async (req,res) => {
        try {
            const {idEmpresa, pagina} = req.body;

            let vPagina = Number(pagina);
            const cantOrdenes = await OrdenesProduccion.contarTodo({pEmpId:idEmpresa});
            const maxPagina = Math.max(1, Math.ceil(cantOrdenes/50));
            vPagina = Math.min(Math.max(vPagina,1), maxPagina);
            const vOffset = (vPagina - 1) * 50;

            const ordenes = await OrdenesProduccion.traerTodo({pEmpId:idEmpresa, pOffset:vOffset});

            return res.status(200).json({cantData:cantOrdenes, data:ordenes});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    },

    listarPorId: async (req,res) => {
        try {
            const {idEmpresa, idOrden} = req.body;

            const orden = await OrdenesProduccion.traerPorId({pEmpId:idEmpresa, pId:idOrden});
            if (!orden) {
                return res.status(401).json({msg:'Orden inválida'});
            }

            //la trazabilidad de la orden vive en Movimientos: consumos (SALIDA) y producidos
            //(ENTRADA) quedan atados por TipoOrigen='PRODUCCION' + OrigenId=idOrden
            const movimientos = await Movimientos.traerPorOrigen({pEmpId:idEmpresa, pTipoOrigen:'PRODUCCION', pOrigenId:idOrden});

            return res.status(200).json({data:{...orden, movimientos}});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    }
};

export default ordenesProduccionControllers;
