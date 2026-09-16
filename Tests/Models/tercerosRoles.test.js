import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../Database/config.js';
import TercerosRoles from '../../Models/tercrosRoles.js';

test('crear inserta una fila y traerPorTerceroRol la encuentra', async () => {
    const [terceroRows] = await pool.query(`SELECT Id FROM Terceros WHERE EmpresaId = 1 LIMIT 1;`);
    const [usuarioRows] = await pool.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    if (terceroRows.length === 0) {
        return; // no hay Terceros de prueba en esta empresa, se omite
    }
    const terceroId = terceroRows[0].Id;
    const usuarioId = usuarioRows[0].Id;

    let rolId;
    try {
        rolId = await TercerosRoles.crear({pEmpId:1, pTerId:terceroId, pRol:'CLIENTE', pUsuId:usuarioId});
        assert.ok(rolId > 0);

        const encontrado = await TercerosRoles.traerPorTerceroRol({pEmpId:1, pTerId:terceroId, pRol:'CLIENTE'});
        assert.ok(encontrado);
        assert.equal(encontrado.Rol, 'CLIENTE');
    } finally {
        if (rolId) await pool.query(`DELETE FROM TercerosRoles WHERE Id = ?;`, [rolId]);
    }
});
