import { pool } from '../Database/config.js';

const Categorias = {
    //crear categoria
    async crear({pEmpId,pUsuIdCrea,pNombre}){
        const [rows] = await pool.query(
            `INSERT INTO Categorias(
                EmpresaId,
                UsuarioIdCreador,
                Nombre)
            VALUES(?,?,?)`,
            [pEmpId,pUsuIdCrea,pNombre]
        );

        return rows.insertId;
    },

    async editar({pEmpId,pId,pNombre,pEstado}){
        const [rows] = await pool.query(
            `UPDATE Categorias SET
                Nombre = ?,
                Estado = ?
            WHERE EmpresaId = ? AND Id = ?;`,
            [pNombre,pEstado,pEmpId,pId]
        );

        return rows.affectedRows;
    },

    async traerTodo({pEmpId,pCampoOrden,pOrden,pOffset,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT 
                    c.EmpresaId as catEmp,
                    c.Id as catId,
                    c.Nombre as catNombre,
                    c.Estado as catEstado,
                    c.FechaCreacion as catFecCreacion,
                    u.Nombres as catcUsuario
                FROM Categorias c
                left join Usuarios u on c.UsuarioIdCreador = u.Id
                    WHERE c.EmpresaId = ?
                    ORDER BY c.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pOffset]
            );

            return rows || null;
        }else{
            const [rows] = await pool.query(
                `SELECT 
                    c.EmpresaId as catEmp,
                    c.Id as catId,
                    c.Nombre as catNombre,
                    c.Estado as catEstado,
                    c.FechaCreacion as catFecCreacion,
                    u.Nombres as catcUsuario
                FROM Categorias c
                left join Usuarios u on c.UsuarioIdCreador = u.Id
                    WHERE c.EmpresaId = ?
                    AND c.${pCampoOrden} LIKE ?
                    ORDER BY c.${pCampoOrden} ${pOrden}
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
                Nombre
            FROM Categorias WHERE EmpresaId = ? AND Estado = true;`,
            [pEmpId]
        );

        return rows || null;
    },

    async traerPorId({pId,pEmpId}){
        const [rows] = await pool.query(
            `SELECT 
                c.EmpresaId as catEmp,
                c.Id as catId,
                c.Nombre as catNombre,
                c.Estado as catEstado,
                c.FechaCreacion as catFecCreacion,
                u.Nombres as catcUsuario
            FROM Categorias c
            left join Usuarios u on c.UsuarioIdCreador = u.Id
            WHERE c.Id = ? and c.EmpresaId = ?;`,
            [pId,pEmpId]
        );

        return rows[0] || null;
    },

    async traerPorNombre({pEmpId,pNombre}){
        const [rows] = await pool.query(
            `SELECT * FROM Categorias WHERE Nombre = ? and EmpresaId = ?;`,
            [pNombre,pEmpId]
        );

        return rows[0] || null;
    },

    async contarTodoFiltro({pEmpId,pCampoOrden,pOrden,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Categorias
                    WHERE EmpresaId = ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId]
            );

            return rows[0].total;
        }else{
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Categorias
                    WHERE EmpresaId = ?
                    AND ${pCampoOrden} LIKE ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId,pTexto]
            );

            return rows[0].total;
        }

    },

}

export default Categorias
