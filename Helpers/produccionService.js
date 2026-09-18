import { pool } from '../Database/config.js';
import OrdenesProduccion from '../Models/ordenesProduccion.js';
import Articulos from '../Models/articulos.js';
import Existencias from '../Models/existencias.js';
import { registrarMovimiento } from './inventarioTransacciones.js';
import { calcularCostoProduccion, calcularCostoUnitarioProducido } from './costeoInventario.js';

//Fundicion/fabricacion: consume uno o mas articulos existentes y produce uno o mas articulos
//nuevos, todo bajo UNA sola transaccion y agrupado por una fila de OrdenesProduccion. Esa fila
//tambien nace dentro de la transaccion, asi que si cualquier movimiento falla no queda ni la
//orden ni rastro en Existencias/Movimientos. La trazabilidad posterior es por
//Movimientos.traerPorOrigen({pTipoOrigen:'PRODUCCION', pOrigenId: ordenId}).
const crearOrdenProduccion = async ({ pEmpId, pUsuId, pObservaciones, consumos, producidos }) => {
    if (!Array.isArray(consumos) || consumos.length === 0) {
        throw new Error('La orden debe tener al menos un consumo');
    }
    if (!Array.isArray(producidos) || producidos.length === 0) {
        throw new Error('La orden debe tener al menos un artículo producido');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const ordenId = await OrdenesProduccion.crear(connection, { pEmpId, pUsuId, pObservaciones });

        const consumosConCosto = [];
        for (const consumo of consumos) {
            const existeArticulo = await Articulos.traerPorId({ pId: consumo.idArticulo, pEmpId });
            if (!existeArticulo) {
                throw new Error(`El artículo ${consumo.idArticulo} no existe en esta empresa`);
            }

            //el costo de lo consumido NO lo decide el llamador: es el costo promedio vigente de la
            //bolsa DISPONIBLE del articulo EN LA BODEGA de ese consumo (el costo vive en
            //Existencias por bodega, no en Articulos), leido con FOR UPDATE dentro de esta misma
            //transaccion.
            const bolsaDisponible = await Existencias.traerBolsaBloqueada(connection, {
                pEmpId, pBodegaId: consumo.idBodega, pArticuloId: consumo.idArticulo, pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
            });
            const costoUnitarioConsumo = bolsaDisponible ? bolsaDisponible.CostoUnitario : null;

            await registrarMovimiento(connection, {
                pEmpId, pUsuId, pBodegaId: consumo.idBodega,
                pArticuloId: consumo.idArticulo,
                pTipoMovimiento: 'SALIDA',
                pBolsaEstado: consumo.BolsaEstado,
                pPropietarioId: consumo.idPropietario ?? null,
                pCantidad: consumo.Cantidad,
                pCostoUnitario: costoUnitarioConsumo,
                pMotivo: 'PRODUCCION',
                pTipoOrigen: 'PRODUCCION',
                pOrigenId: ordenId,
                pObservaciones: null
            });

            consumosConCosto.push({ cantidad: consumo.Cantidad, costoUnitario: costoUnitarioConsumo });
        }

        const costoTotalConsumos = calcularCostoProduccion(consumosConCosto);
        const cantidadTotalProducida = producidos.reduce((acc, p) => acc + Number(p.Cantidad), 0);

        for (const producido of producidos) {
            //si el usuario no fija un costo, se reparte el costo total de lo consumido entre
            //todas las unidades producidas.
            const costoUnitario = (producido.CostoUnitario !== undefined && producido.CostoUnitario !== null)
                ? producido.CostoUnitario
                : calcularCostoUnitarioProducido({ costoTotalConsumos, cantidadProducida: cantidadTotalProducida });

            await registrarMovimiento(connection, {
                pEmpId, pUsuId, pBodegaId: producido.idBodega,
                pArticuloId: producido.idArticulo,
                pTipoMovimiento: 'ENTRADA',
                pBolsaEstado: 'DISPONIBLE',
                pPropietarioId: null,
                pCantidad: producido.Cantidad,
                pCostoUnitario: costoUnitario,
                pMotivo: 'PRODUCCION',
                pTipoOrigen: 'PRODUCCION',
                pOrigenId: ordenId,
                pObservaciones: null
            });
        }

        await connection.commit();
        return ordenId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export { crearOrdenProduccion };
