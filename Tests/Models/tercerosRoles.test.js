import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../Database/config.js';
import TercerosRoles from '../../Models/tercrosRoles.js';

test('crear inserta una fila y traerPorTerceroRol la encuentra', async () => {
    // el sujeto se elige por su ESTADO, no con LIMIT 1: el primer tercero de la empresa 1 ya
    // tiene el rol CLIENTE como dato semilla, asi que insertarselo chocaba contra
    // uq_empresa_tercero_rol y la prueba fallaba sin haber ejercitado nada. Buscando uno que
    // NO lo tenga, esto prueba de verdad el alta del rol -- y sobrevive a un re-sembrado.
    const [terceroRows] = await pool.query(
        `SELECT t.Id
           FROM Terceros t
           LEFT JOIN TercerosRoles tr
                  ON tr.TerceroId = t.Id AND tr.EmpresaId = t.EmpresaId AND tr.Rol = 'CLIENTE'
          WHERE t.EmpresaId = 1 AND tr.Id IS NULL
          LIMIT 1;`
    );
    const [usuarioRows] = await pool.query(`SELECT Id FROM Usuarios LIMIT 1;`);
    if (terceroRows.length === 0) {
        return; // todos los Terceros de la empresa 1 ya son CLIENTE, no hay sujeto para el alta
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
