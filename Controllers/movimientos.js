import Articulos from '../Models/articulos.js';
import Movimientos from '../Models/movimientos.js';
import { registrarMovimientoTransaccional } from '../Helpers/inventarioTransacciones.js';

const movimientosControllers = {
    crearAjuste: async (req,res) => {
        try {
            const {idEmpresa, idArticulo, TipoMovimiento, BolsaEstado, idPropietario, Cantidad, CostoUnitario, Observaciones} = req.body;
            const UsuIdLogin = req.usuario.Id;

            //sin esta comprobacion un idArticulo de otra empresa llegaria al motor de
            //movimientos y moveria existencias ajenas
            const existeArticulo = await Articulos.traerPorId({pId:idArticulo, pEmpId:idEmpresa});
            if (!existeArticulo) {
                return res.status(401).json({msg:'Articulo inválido'});
            }

            const movimientoId = await registrarMovimientoTransaccional({
                pEmpId: idEmpresa,
                pUsuId: UsuIdLogin,
                pArticuloId: idArticulo,
                pTipoMovimiento: TipoMovimiento,
                pBolsaEstado: BolsaEstado,
                pPropietarioId: idPropietario ?? null,
                pCantidad: Cantidad,
                pCostoUnitario: CostoUnitario ?? null,
                pMotivo: 'AJUSTE',
                pTipoOrigen: 'AJUSTE',
                pOrigenId: null,
                pObservaciones: Observaciones ?? null
            });

            if (movimientoId > 0) {
                return res.status(200).json({msg:'Movimiento registrado'});
            }
            return res.status(401).json({msg:'Error registrando el movimiento'});
        } catch (error) {
            //registrarMovimiento lanza Error planos con las reglas de negocio
            //(existencia insuficiente, propietario/bolsa incoherentes): son errores del
            //cliente, por eso salen como 400 y no como 500
            return res.status(400).json({msg:String(error.message || error)});
        }
    },

    listarKardex: async (req,res) => {
        try {
            const {idEmpresa, idArticulo, fechaInicio, fechaFin, pagina} = req.body;

            let vPagina = Number(pagina);
            const cantMovimientos = await Movimientos.contarKardexFiltro({pEmpId:idEmpresa, pArticuloId:idArticulo, pFechaInicio:fechaInicio, pFechaFin:fechaFin});
            const maxPagina = Math.max(1, Math.ceil(cantMovimientos/50));
            vPagina = Math.min(Math.max(vPagina,1), maxPagina);
            const vOffset = (vPagina - 1) * 50;

            const movimientos = await Movimientos.traerKardex({pEmpId:idEmpresa, pArticuloId:idArticulo, pFechaInicio:fechaInicio, pFechaFin:fechaFin, pOffset:vOffset});

            return res.status(200).json({cantData:cantMovimientos, data:movimientos});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    }
};

export default movimientosControllers;
