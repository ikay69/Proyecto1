import { pool } from '../Database/config.js';

const UnidadesMedida = {
    async crear({pEmpId,pUsuIdCrea,pNombre,pSimbolo}){
        const [rows] = await pool.query(
            `INSERT INTO UnidadesMedidas(
                EmpresaId,
                UsuarioIdCreador,
                Nombre,
                Simbolo)
            VALUES(?,?,?,?)`,
            [pEmpId,pUsuIdCrea,pNombre,pSimbolo]
        );

        return rows.insertId;
    },

    async editar({pEmpId,pId,pNombre,pSimbolo,pEstado}){
        const [rows] = await pool.query(
            `UPDATE UnidadesMedidas SET
                Nombre = ?,
                Simbolo = ?,
                Estado = ?
            WHERE EmpresaId = ? AND Id = ?;`,
            [pNombre,pSimbolo,pEstado,pEmpId,pId]
        );
        
        return rows.affectedRows;
    },

    async traerTodo({pEmpId,pCampoOrden,pOrden,pOffset,pTexto}){
        
        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT 
                    um.Id as uniMedId,
                    um.EmpresaId as uniMedEmp,
                    um.Nombre as uniMedNombre,
                    um.Simbolo as uniMedSimbolo,
                    um.Estado as uniMedEstado,
                    um.FechaCreacion as uniMedFecCreacion,
                    u.Nombres as uniMedUsuario
                FROM UnidadesMedidas um
                LEFT JOIN Usuarios u on um.UsuarioIdCreador = u.Id 
                    WHERE um.EmpresaId = ? 
                    ORDER BY um.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pOffset]
            );

            return rows || null;
        }else{
            const [rows] = await pool.query(
                `SELECT 
                    um.Id as uniMedId,
                    um.EmpresaId as uniMedEmp,
                    um.Nombre as uniMedNombre,
                    um.Simbolo as uniMedSimbolo,
                    um.Estado as uniMedEstado,
                    um.FechaCreacion as uniMedFecCreacion,
                    u.Nombres as uniMedUsuario
                FROM UnidadesMedidas um
                LEFT JOIN Usuarios u on um.UsuarioIdCreador = u.Id
                    WHERE um.EmpresaId = ? 
                    AND um.${pCampoOrden} LIKE ${pTexto}
                    ORDER BY um.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pOffset]
            );

            return rows || null;
        }
        
    },


    async traerActivas({pEmpId}){
        const [rows] = await pool.query(
            `SELECT 
                Id as uniMedId,
                CONCAT(Nombre, ' ', Simbolo) AS uniMedNombre
            FROM UnidadesMedidas WHERE EmpresaId = ? AND Estado = true;`,
            [pEmpId]
        );

        return rows || null;
    },

    async traerPorId({pId,pEmpId}){
        const [rows] = await pool.query(
            `SELECT  
                um.Id as uniMedId,
                um.EmpresaId as uniMedEmp,
                um.Nombre as uniMedNombre,
                um.Simbolo as uniMedSimbolo,
                um.Estado as uniMedEstado,
                um.FechaCreacion as uniMedFecCreacion,
                u.Nombres as uniMedUsuario
            FROM UnidadesMedidas um
            LEFT JOIN Usuarios u on um.UsuarioIdCreador = u.Id
            WHERE um.Id = ? and um.EmpresaId = ?;`,
            [pId,pEmpId]
        );

        return rows[0] || null;
    },

    async traerPorNombre({pEmpId,pNombre}){
         const [rows] = await pool.query(
            `SELECT * FROM UnidadesMedidas WHERE Nombre = ? and EmpresaId = ?;`,
            [pNombre,pEmpId]
        );

        return rows[0] || null;
    },

    async contarTodoFiltro({pEmpId,pCampoOrden,pOrden,pTexto}){
        console.log('modelo uni med todo emp',pEmpId,' campo ',pCampoOrden,' orden ',pOrden,' texto ',pTexto)
        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM UnidadesMedidas um
                    WHERE um.EmpresaId = ? 
                    ORDER BY um.${pCampoOrden} ${pOrden};`,
                [pEmpId]
            );

            return rows[0] || null;
        }else{
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM UnidadesMedidas um
                    WHERE um.EmpresaId = ? 
                    AND um.${pCampoOrden} LIKE ${pTexto}
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId,pTexto]
            );

           return rows[0].total;
        }
        
    },


}


export default UnidadesMedida