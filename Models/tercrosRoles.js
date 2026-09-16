import { pool } from '../Database/config.js';

const TercerosRoles = {
    async crear({pEmpId,pTerId,pRol,pUsuId}){
        const [rows] = await pool.query(
            `INSERT INTO TercerosRoles(
                EmpresaId,
                TerceroId,
                Rol,
                UsuarioIdCreador)
            VALUES(?,?,?,?)`,
            [pEmpId,pTerId,pRol,pUsuId]
        );

        return rows.insertId;
    },

    async traerPorTercero ({ pEmpId, pTerId }){
        const [rows] = await pool.query(
            `SELECT Id, EmpresaId, TerceroId, Rol, UsuarioIdCreador 
            FROM TercerosRoles 
            WHERE EmpresaId = ? AND TerceroId = ?`,
            [pEmpId, pTerId]
        );
        return rows;
    },

    async traerPorRol({ pEmpId, pRol }) {
        const [rows] = await pool.query(
            `SELECT Id, EmpresaId, TerceroId, Rol, UsuarioIdCreador 
            FROM TercerosRoles 
            WHERE EmpresaId = ? AND Rol = ?`,
            [pEmpId, pRol]
        );
        return rows;
    },

    async traerPorTerceroRol({ pEmpId, pTerId, pRol }) {
        const [rows] = await pool.query(
            `SELECT Id, EmpresaId, TerceroId, Rol, UsuarioIdCreador 
            FROM TercerosRoles 
            WHERE EmpresaId = ? AND TerceroId = ? AND Rol = ?`,
            [pEmpId, pTerId, pRol]
        );
        // Como es un registro único por el CONSTRAINT, retornamos el primer elemento o null
        return rows.length > 0 ? rows[0] : null;
    }
}

export default TercerosRoles