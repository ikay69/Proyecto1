import { pool } from '../Database/config.js';

const Propiedades = {
    //crear propiedad
    async crear({pEmpId,pUsuIdCrea,pNombre,pTipoDato}){
        const [rows] = await pool.query(
            `INSERT INTO Propiedades(
                EmpresaId,
                UsuarioIdCreador,
                Nombre,
                TipoDato)
            VALUES(?,?,?,?)`,
            [pEmpId,pUsuIdCrea,pNombre,pTipoDato]
        );

        return rows.insertId;
    },

    async editar({pEmpId,pId,pNombre,pTipoDato,pEstado}){
        const [rows] = await pool.query(
            `UPDATE Propiedades SET
                Nombre = ?,
                TipoDato = ?,
                Estado = ?
            WHERE EmpresaId = ? AND Id = ?;`,
            [pNombre,pTipoDato,pEstado,pEmpId,pId]
        );

        return rows.affectedRows;
    },

    async traerTodo({pEmpId,pCampoOrden,pOrden,pOffset,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT 
                    p.Id as proId,
                    p.EmpresaId as proEmp,
                    p.Nombre as proNombre,
                    p.TipoDato as proTipoDato,
                    p.Estado as proEstado,
                    p.FechaCreacion as proFecCreacon,
                    u.Nombres as proUsuario
                FROM Propiedades p
                LEFT JOIN Usuarios u on p.UsuarioIdCreador = u.Id
                    WHERE p.EmpresaId = ?
                    ORDER BY p.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pOffset]
            );

            return rows || null;
        }else{
            const [rows] = await pool.query(
                `SELECT 
                    p.Id as proId,
                    p.EmpresaId as proEmp,
                    p.Nombre as proNombre,
                    p.TipoDato as proTipoDato,
                    p.Estado as proEstado,
                    p.FechaCreacion as proFecCreacon,
                    u.Nombres as proUsuario
                FROM Propiedades p
                LEFT JOIN Usuarios u on p.UsuarioIdCreador = u.Id
                    WHERE EmpresaId = ?
                    AND p.${pCampoOrden} LIKE ?
                    ORDER BY p.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pTexto,pOffset]
            );

            return rows || null;
        }

    },

    async traerActivas({pEmpId}){
        const [rows] = await pool.query(
            `SELECT
                Id,
                Nombre,
                TipoDato
            FROM Propiedades WHERE EmpresaId = ? AND Estado = true;`,
            [pEmpId]
        );

        return rows || null;
    },

    async traerPorId({pId,pEmpId}){
        const [rows] = await pool.query(
            `SELECT  
                p.Id as proId,
                p.EmpresaId as proEmp,
                p.Nombre as proNombre,
                p.TipoDato as proTipoDato,
                p.Estado as proEstado,
                p.FechaCreacion as proFecCreacion,
                u.Nombres as proUsuario
            FROM Propiedades p
            LEFT JOIN Usuarios u on p.UsuarioIdCreador = u.Id 
            WHERE p.Id = ? 
            and p.EmpresaId = ?;`,
            [pId,pEmpId]
        );

        return rows[0] || null;
    },

    async traerPorNombre({pEmpId,pNombre}){
        const [rows] = await pool.query(
            `SELECT * FROM Propiedades WHERE Nombre = ? and EmpresaId = ?;`,
            [pNombre,pEmpId]
        );

        return rows[0] || null;
    },

    async contarTodoFiltro({pEmpId,pCampoOrden,pOrden,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Propiedades
                    WHERE EmpresaId = ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId]
            );

            return rows[0].total;
        }else{
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Propiedades
                    WHERE EmpresaId = ?
                    AND ${pCampoOrden} LIKE ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId,pTexto]
            );

            return rows[0].total;
        }

    },

}

export default Propiedades
