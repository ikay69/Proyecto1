import Articulos from '../Models/articulos.js';
import Movimientos from '../Models/movimientos.js';
import Terceros from '../Models/terceros.js';
import Bodegas from '../Models/bodegas.js';
import { registrarMovimientoTransaccional } from '../Helpers/inventarioTransacciones.js';

//el kardex filtra con BETWEEN sobre un TIMESTAMP: una fechaFin solo-fecha ('2026-09-15') es
//medianoche y dejaria fuera todos los movimientos de ese mismo dia, asi que normalizarFechaFin
//la lleva al final del dia. Vive en Helpers/fechas.js, compartida con el rango del listado de
//Compras: la sutileza que resuelve --una cadena solo-fecha se parsea como UTC, y en una zona con
//offset negativo como America/Bogota el dia se corre hacia atras-- no debe estar escrita dos veces.
//movimientoValidaKardexFiltros ya rechazo con 400 lo que no sea una fecha, asi que aqui no lanza.
import { normalizarFechaFin } from '../Helpers/fechas.js';

const movimientosControllers = {
    crearAjuste: async (req,res) => {
        try {
            const {idEmpresa, idBodega, idArticulo, TipoMovimiento, BolsaEstado, idPropietario, Cantidad, CostoUnitario, Observaciones} = req.body;
            const UsuIdLogin = req.usuario.Id;

            //sin esta comprobacion un idArticulo de otra empresa llegaria al motor de
            //movimientos y moveria existencias ajenas
            const existeArticulo = await Articulos.traerPorId({pId:idArticulo, pEmpId:idEmpresa});
            if (!existeArticulo) {
                return res.status(400).json({msg:'Articulo inválido'});
            }

            const existeBodega = await Bodegas.traerPorId({pId:idBodega, pEmpId:idEmpresa});
            if (!existeBodega || !existeBodega.bodEstado) {
                return res.status(400).json({msg:'Bodega inválida'});
            }

            //el propietario tambien se valida contra la empresa del token: sin esto, la bolsa
            //quedaria atada a un Tercero ajeno (y el FK contra Terceros solo verifica el Id).
            if (idPropietario !== undefined && idPropietario !== null) {
                const existePropietario = await Terceros.traerPorId({pId:idPropietario, pEmpId:idEmpresa});
                
                if (!existePropietario) {
                    return res.status(400).json({msg:'Propietario inválido'});
                }

                if(!existePropietario.terEstado){
                    return res.status(400).json({msg:'Propietario inactivo'});
                }
            }

            const movimientoId = await registrarMovimientoTransaccional({
                pEmpId: idEmpresa,
                pUsuId: UsuIdLogin,
                pBodegaId: idBodega,
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
            return res.status(400).json({msg:'Error registrando el movimiento'});
        } catch (error) {
            //registrarMovimiento lanza Error planos con las reglas de negocio
            //(existencia insuficiente, propietario/bolsa incoherentes): son errores del
            //cliente, por eso salen como 400 y no como 500
            return res.status(400).json({msg:String(error.message || error)});
        }
    },

    listarKardex: async (req,res) => {
        try {
            const {idEmpresa, idArticulo, idBodega, fechaInicio, fechaFin, pagina} = req.body;

            //mysql2 serializa el Date nativamente contra la columna TIMESTAMP
            const vFechaFin = normalizarFechaFin(fechaFin);
            const vBodegaId = idBodega || '';

            let vPagina = Number(pagina);
            const cantMovimientos = await Movimientos.contarKardexFiltro({pEmpId:idEmpresa, pBodegaId:vBodegaId, pArticuloId:idArticulo, pFechaInicio:fechaInicio, pFechaFin:vFechaFin});
            const maxPagina = Math.max(1, Math.ceil(cantMovimientos/50));
            vPagina = Math.min(Math.max(vPagina,1), maxPagina);
            const vOffset = (vPagina - 1) * 50;

            const movimientos = await Movimientos.traerKardex({pEmpId:idEmpresa, pBodegaId:vBodegaId, pArticuloId:idArticulo, pFechaInicio:fechaInicio, pFechaFin:vFechaFin, pOffset:vOffset});

            return res.status(200).json({cantData:cantMovimientos, data:movimientos});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    }
};

export default movimientosControllers;
