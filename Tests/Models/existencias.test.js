import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback } from '../dbTestUtils.js';
import Existencias from '../../Models/existencias.js';

// Articulos.CodigoSKU es VARCHAR(12): se genera un SKU unico de 11 caracteres
const generarSKUDePrueba = () => {
    const tiempo = Date.now().toString(36);
    const azar = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
    return `T${tiempo}${azar}`;
};

const crearArticuloDePrueba = async (connection, empId = 1) => {
    const [productoRows] = await connection.query(
        `SELECT Id FROM Productos WHERE EmpresaId = ? LIMIT 1;`, [empId]
    );
    if (productoRows.length === 0) {
        throw new Error('Se requiere al menos un Producto en la empresa 1 para correr estas pruebas');
    }
    const [usuarioRows] = await connection.query(`SELECT Id FROM Usuarios LIMIT 1;`);

    const [insertResult] = await connection.query(
        `INSERT INTO Articulos(EmpresaId, UsuarioIdCreador, ProductoId, CodigoSKU, Nombre)
         VALUES (?, ?, ?, ?, ?)`,
        [empId, usuarioRows[0].Id, productoRows[0].Id, generarSKUDePrueba(), 'ARTICULO DE PRUEBA']
    );
    return insertResult.insertId;
};

test('upsertCantidad crea la bolsa si no existe', async () => {
    await withRollback(async (connection) => {
        const articuloId = await crearArticuloDePrueba(connection);

        await Existencias.upsertCantidad(connection, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'DISPONIBLE',
            pPropietarioId: null, pDelta: 10
        });

        const bolsa = await Existencias.traerBolsaBloqueada(connection, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
        });

        assert.equal(Number(bolsa.Cantidad), 10);
    });
});

test('upsertCantidad incrementa una bolsa existente', async () => {
    await withRollback(async (connection) => {
        const articuloId = await crearArticuloDePrueba(connection);

        await Existencias.upsertCantidad(connection, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'DISPONIBLE',
            pPropietarioId: null, pDelta: 10
        });
        await Existencias.upsertCantidad(connection, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'DISPONIBLE',
            pPropietarioId: null, pDelta: -4
        });

        const bolsa = await Existencias.traerBolsaBloqueada(connection, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'DISPONIBLE', pPropietarioId: null
        });

        assert.equal(Number(bolsa.Cantidad), 6);
    });
});

test('dos bolsas del mismo articulo con propietarios NULL distintos no chocan (PropietarioIdClave)', async () => {
    await withRollback(async (connection) => {
        const articuloId = await crearArticuloDePrueba(connection);

        await Existencias.upsertCantidad(connection, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'DISPONIBLE',
            pPropietarioId: null, pDelta: 5
        });
        await Existencias.upsertCantidad(connection, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'RESERVADO',
            pPropietarioId: null, pDelta: 3
        });

        // se pasa la conexion de la transaccion: el pool usa otra conexion y no
        // veria las filas aun no confirmadas (aislamiento REPEATABLE READ)
        const bolsas = await Existencias.traerBolsasPorArticulo(
            { pEmpId: 1, pArticuloId: articuloId }, connection
        );

        assert.equal(bolsas.length, 2);
    });
});

test('traerBolsaBloqueada retorna null si la bolsa no existe', async () => {
    await withRollback(async (connection) => {
        const articuloId = await crearArticuloDePrueba(connection);

        const bolsa = await Existencias.traerBolsaBloqueada(connection, {
            pEmpId: 1, pArticuloId: articuloId, pBolsaEstado: 'EN_REPARACION', pPropietarioId: null
        });

        assert.equal(bolsa, null);
    });
});
