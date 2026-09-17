import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../Database/config.js';
import { crearOrdenProduccion } from '../../Helpers/produccionService.js';
import Existencias from '../../Models/existencias.js';
import Articulos from '../../Models/articulos.js';
import Movimientos from '../../Models/movimientos.js';

// crearOrdenProduccion CONFIRMA su propia transaccion, asi que estas pruebas no pueden correr
// dentro de withRollback: siembran con conexiones propias y limpian a mano en el finally.

// Articulos.CodigoSKU es VARCHAR(12) con UNIQUE (EmpresaId, CodigoSKU): 'T' + tiempo en
// base36 (8) + 2 caracteres al azar = 11 caracteres, igual que en Tests/Models.
const generarSKUDePrueba = (prefijo = 'P') => {
    const tiempo = Date.now().toString(36);
    const azar = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
    return `${prefijo}${tiempo}${azar}`;
};

// Siembra la materia prima y su bolsa DISPONIBLE escribiendo directo en las tablas, sin pasar
// por registrarMovimientoTransaccional. Dos razones:
//  - el unico movimiento que puede existir despues es el que genere la orden de produccion, asi
//    las aserciones sobre Movimientos son exactas;
//  - registrarMovimientoTransaccional bloquea una bolsa todavia inexistente (SELECT ... FOR
//    UPDATE deja un gap lock en uq_existencias_bolsa) y recien despues inserta; con los archivos
//    de prueba corriendo en paralelo ese patron produce deadlocks intermitentes de InnoDB.
// Es el mismo enfoque que ya usa Tests/Helpers/inventarioTransacciones.test.js para sus pruebas
// de camino confirmado.
const sembrarArticuloConExistencia = async ({empId, usuarioId, productoId, cantidad, costo}) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [insertResult] = await conn.query(
            `INSERT INTO Articulos(EmpresaId, UsuarioIdCreador, ProductoId, CodigoSKU, Nombre)
             VALUES (?, ?, ?, ?, 'MATERIA PRIMA DE PRUEBA');`,
            [empId, usuarioId, productoId, generarSKUDePrueba('M')]
        );
        const articuloId = insertResult.insertId;
        await Existencias.upsertCantidadYCosto(conn, {
            pEmpId: empId, pArticuloId: articuloId, pBolsaEstado: 'DISPONIBLE',
            pPropietarioId: null, pDelta: cantidad, pCosto: costo
        });
        await conn.commit();
        return articuloId;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// Movimientos, Existencias y ArticuloPropiedades se borran primero: sus FK contra Articulos son
// RESTRICT y bloquearian el DELETE del articulo.
const limpiarArticulo = async (articuloId) => {
    if (!articuloId) return;
    await pool.query(`DELETE FROM Movimientos WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM Existencias WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM ArticuloPropiedades WHERE ArticuloId = ?;`, [articuloId]);
    await pool.query(`DELETE FROM Articulos WHERE Id = ?;`, [articuloId]);
};

const traerContexto = async () => {
    const [productoRows] = await pool.query(`SELECT Id FROM Productos WHERE EmpresaId = 1 LIMIT 1;`);
    const [usuarioRows] = await pool.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    return { productoId: productoRows[0].Id, usuarioId: usuarioRows[0].Id };
};

test('crearOrdenProduccion consume materia prima y produce un articulo nuevo con costo derivado', async () => {
    const { productoId, usuarioId } = await traerContexto();

    let materiaPrimaId, joyaId, ordenId;
    try {
        materiaPrimaId = await sembrarArticuloConExistencia({
            empId: 1, usuarioId, productoId, cantidad: 10, costo: 100
        });
        joyaId = await Articulos.crear({
            pEmpId: 1, pUsuIdCrea: usuarioId, pProductoId: productoId,
            pNombre: 'JOYA PRODUCIDA', pDescripcion: null, pPrecioVentaUnitario: null, pPropiedades: []
        });

        ordenId = await crearOrdenProduccion({
            pEmpId: 1, pUsuId: usuarioId, pObservaciones: 'fundicion de prueba',
            consumos: [{ idArticulo: materiaPrimaId, BolsaEstado: 'DISPONIBLE', idPropietario: null, Cantidad: 4 }],
            producidos: [{ idArticulo: joyaId, Cantidad: 1, CostoUnitario: null }]
        });

        const connVerif = await pool.getConnection();
        try {
            const bolsaMateriaPrima = await Existencias.traerBolsaBloqueada(connVerif, {
                pEmpId: 1, pArticuloId: materiaPrimaId, pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
            });
            const bolsaJoya = await Existencias.traerBolsaBloqueada(connVerif, {
                pEmpId: 1, pArticuloId: joyaId, pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
            });

            assert.equal(Number(bolsaMateriaPrima.Cantidad), 6);
            assert.equal(Number(bolsaJoya.Cantidad), 1);
            assert.equal(Number(bolsaJoya.CostoUnitario), 400); // 4 unidades consumidas * costo 100 / 1 producida
        } finally {
            connVerif.release();
        }

        const movimientosOrden = await Movimientos.traerPorOrigen({ pEmpId: 1, pTipoOrigen: 'PRODUCCION', pOrigenId: ordenId });
        assert.equal(movimientosOrden.length, 2);
        // la salida de materia prima se costeo con el CostoUnitario vigente del articulo, no con
        // un valor enviado por el llamador
        const salida = movimientosOrden.find(m => m.movTipo === 'SALIDA');
        assert.equal(Number(salida.movCosto), 100);
    } finally {
        await limpiarArticulo(materiaPrimaId);
        await limpiarArticulo(joyaId);
        if (ordenId) await pool.query(`DELETE FROM OrdenesProduccion WHERE Id = ?;`, [ordenId]);
    }
});

test('crearOrdenProduccion respeta un costoUnitario explicito en el producido', async () => {
    const { productoId, usuarioId } = await traerContexto();

    let materiaPrimaId, joyaId, ordenId;
    try {
        materiaPrimaId = await sembrarArticuloConExistencia({
            empId: 1, usuarioId, productoId, cantidad: 10, costo: 100
        });
        joyaId = await Articulos.crear({
            pEmpId: 1, pUsuIdCrea: usuarioId, pProductoId: productoId,
            pNombre: 'JOYA CON COSTO MANUAL', pDescripcion: null, pPrecioVentaUnitario: null, pPropiedades: []
        });

        ordenId = await crearOrdenProduccion({
            pEmpId: 1, pUsuId: usuarioId, pObservaciones: null,
            consumos: [{ idArticulo: materiaPrimaId, BolsaEstado: 'DISPONIBLE', idPropietario: null, Cantidad: 2 }],
            producidos: [{ idArticulo: joyaId, Cantidad: 1, CostoUnitario: 500 }]
        });

        const connVerif = await pool.getConnection();
        try {
            const bolsaJoya = await Existencias.traerBolsaBloqueada(connVerif, {
                pEmpId: 1, pArticuloId: joyaId, pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
            });
            assert.equal(Number(bolsaJoya.CostoUnitario), 500);
        } finally {
            connVerif.release();
        }
    } finally {
        await limpiarArticulo(materiaPrimaId);
        await limpiarArticulo(joyaId);
        if (ordenId) await pool.query(`DELETE FROM OrdenesProduccion WHERE Id = ?;`, [ordenId]);
    }
});

// Esta es la prueba que justifica que toda la orden viva en UNA sola transaccion: el primer
// consumo es valido y se aplica, el segundo no tiene saldo. Si cada movimiento corriera en su
// propia transaccion, la primera salida quedaria confirmada y la bolsa bajaria a 6.
test('crearOrdenProduccion revierte toda la orden si un consumo posterior falla', async () => {
    const { productoId, usuarioId } = await traerContexto();

    let materiaPrimaId, materiaPrimaSinSaldoId, joyaId;
    try {
        materiaPrimaId = await sembrarArticuloConExistencia({
            empId: 1, usuarioId, productoId, cantidad: 10, costo: 100
        });
        materiaPrimaSinSaldoId = await sembrarArticuloConExistencia({
            empId: 1, usuarioId, productoId, cantidad: 1, costo: 50
        });
        joyaId = await Articulos.crear({
            pEmpId: 1, pUsuIdCrea: usuarioId, pProductoId: productoId,
            pNombre: 'JOYA NUNCA PRODUCIDA', pDescripcion: null, pPrecioVentaUnitario: null, pPropiedades: []
        });

        const [ordenesAntes] = await pool.query(`SELECT COUNT(*) AS total FROM OrdenesProduccion WHERE EmpresaId = 1;`);

        await assert.rejects(
            () => crearOrdenProduccion({
                pEmpId: 1, pUsuId: usuarioId, pObservaciones: 'fundicion que falla',
                consumos: [
                    { idArticulo: materiaPrimaId, BolsaEstado: 'DISPONIBLE', idPropietario: null, Cantidad: 4 },
                    { idArticulo: materiaPrimaSinSaldoId, BolsaEstado: 'DISPONIBLE', idPropietario: null, Cantidad: 999 }
                ],
                producidos: [{ idArticulo: joyaId, Cantidad: 1, CostoUnitario: null }]
            }),
            /Existencia insuficiente/
        );

        const [ordenesDespues] = await pool.query(`SELECT COUNT(*) AS total FROM OrdenesProduccion WHERE EmpresaId = 1;`);

        const connVerif = await pool.getConnection();
        try {
            const bolsaMateriaPrima = await Existencias.traerBolsaBloqueada(connVerif, {
                pEmpId: 1, pArticuloId: materiaPrimaId, pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
            });
            const bolsaJoya = await Existencias.traerBolsaBloqueada(connVerif, {
                pEmpId: 1, pArticuloId: joyaId, pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
            });
            const [movimientos] = await connVerif.query(
                `SELECT Id FROM Movimientos WHERE ArticuloId IN (?,?,?);`,
                [materiaPrimaId, materiaPrimaSinSaldoId, joyaId]
            );

            // la salida del primer consumo se revirtio: sigue en 10, no en 6
            assert.equal(Number(bolsaMateriaPrima.Cantidad), 10);
            // el articulo producido nunca llego a existir en inventario ni a recostearse
            assert.equal(bolsaJoya, null);
            // ningun movimiento quedo en el kardex
            assert.equal(movimientos.length, 0);
        } finally {
            connVerif.release();
        }

        // y la propia OrdenesProduccion, creada dentro de la misma transaccion, tampoco quedo
        assert.equal(Number(ordenesDespues[0].total), Number(ordenesAntes[0].total));
    } finally {
        await limpiarArticulo(materiaPrimaId);
        await limpiarArticulo(materiaPrimaSinSaldoId);
        await limpiarArticulo(joyaId);
    }
});

test('crearOrdenProduccion rechaza una orden sin consumos o sin producidos', async () => {
    const { usuarioId } = await traerContexto();

    await assert.rejects(
        () => crearOrdenProduccion({
            pEmpId: 1, pUsuId: usuarioId, pObservaciones: null,
            consumos: [], producidos: [{ idArticulo: 1, Cantidad: 1, CostoUnitario: 10 }]
        }),
        /al menos un consumo/
    );

    await assert.rejects(
        () => crearOrdenProduccion({
            pEmpId: 1, pUsuId: usuarioId, pObservaciones: null,
            consumos: [{ idArticulo: 1, BolsaEstado: 'DISPONIBLE', idPropietario: null, Cantidad: 1 }],
            producidos: []
        }),
        /al menos un art/
    );
});
