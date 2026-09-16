import Articulos from '../Models/articulos.js';
import Movimientos from '../Models/movimientos.js';
import Terceros from '../Models/terceros.js';
import { registrarMovimientoTransaccional } from '../Helpers/inventarioTransacciones.js';

const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

//el kardex filtra con BETWEEN sobre un TIMESTAMP: una fechaFin solo-fecha ('2026-09-15') es
//medianoche y dejaria fuera todos los movimientos de ese mismo dia, asi que se lleva al final
//del dia. Se construye con la hora explicita y NO con new Date('2026-09-15'), porque una cadena
//solo-fecha se parsea como UTC: en una zona con offset negativo (America/Bogota) el Date
//resultante caeria en el dia anterior y el rango quedaria invertido. Cualquier otro formato se
//deja tal cual llego: si el cliente mando una hora, es una cota que eligio a proposito.
const normalizarFechaFin = (fechaFin) => {
    const texto = String(fechaFin ?? '').trim();
    if (!SOLO_FECHA.test(texto)) return fechaFin;

    const vFechaFin = new Date(`${texto}T23:59:59.999`);
    return isNaN(vFechaFin.getTime()) ? fechaFin : vFechaFin;
};

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

            //el propietario tambien se valida contra la empresa del token: sin esto, la bolsa
            //quedaria atada a un Tercero ajeno (y el FK contra Terceros solo verifica el Id).
            if (idPropietario !== undefined && idPropietario !== null) {
                const existePropietario = await Terceros.traerPorId({pId:idPropietario, pEmpId:idEmpresa});
                if (!existePropietario) {
                    return res.status(401).json({msg:'Propietario inválido'});
                }
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

            //mysql2 serializa el Date nativamente contra la columna TIMESTAMP
            const vFechaFin = normalizarFechaFin(fechaFin);

            let vPagina = Number(pagina);
            const cantMovimientos = await Movimientos.contarKardexFiltro({pEmpId:idEmpresa, pArticuloId:idArticulo, pFechaInicio:fechaInicio, pFechaFin:vFechaFin});
            const maxPagina = Math.max(1, Math.ceil(cantMovimientos/50));
            vPagina = Math.min(Math.max(vPagina,1), maxPagina);
            const vOffset = (vPagina - 1) * 50;

            const movimientos = await Movimientos.traerKardex({pEmpId:idEmpresa, pArticuloId:idArticulo, pFechaInicio:fechaInicio, pFechaFin:vFechaFin, pOffset:vOffset});

            return res.status(200).json({cantData:cantMovimientos, data:movimientos});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    }
};

export default movimientosControllers;
