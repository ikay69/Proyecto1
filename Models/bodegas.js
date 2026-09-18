import { pool } from '../Database/config.js';

const Bodegas = {
    //crear bodega
    async crear({pEmpId,pUsuIdCrea,pNombre}){
        const [rows] = await pool.query(
            `INSERT INTO Bodegas(
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
            `UPDATE Bodegas SET
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
                    b.EmpresaId as bodEmp,
                    b.Id as bodId,
                    b.Nombre as bodNombre,
                    b.Estado as bodEstado,
                    b.FechaCreacion as bodFecCreacion,
                    u.Nombres as bodUsuario
                FROM Bodegas b
                left join Usuarios u on b.UsuarioIdCreador = u.Id
                    WHERE b.EmpresaId = ?
                    ORDER BY b.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pOffset]
            );

            return rows || null;
        }else{
            const [rows] = await pool.query(
                `SELECT
                    b.EmpresaId as bodEmp,
                    b.Id as bodId,
                    b.Nombre as bodNombre,
                    b.Estado as bodEstado,
                    b.FechaCreacion as bodFecCreacion,
                    u.Nombres as bodUsuario
                FROM Bodegas b
                left join Usuarios u on b.UsuarioIdCreador = u.Id
                    WHERE b.EmpresaId = ?
                    AND b.${pCampoOrden} LIKE ?
                    ORDER BY b.${pCampoOrden} ${pOrden}
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
            FROM Bodegas WHERE EmpresaId = ? AND Estado = true;`,
            [pEmpId]
        );

        return rows || null;
    },

    async traerPorId({pId,pEmpId}){
        const [rows] = await pool.query(
            `SELECT
                b.EmpresaId as bodEmp,
                b.Id as bodId,
                b.Nombre as bodNombre,
                b.Estado as bodEstado,
                b.FechaCreacion as bodFecCreacion,
                u.Nombres as bodUsuario
            FROM Bodegas b
            left join Usuarios u on b.UsuarioIdCreador = u.Id
            WHERE b.Id = ? and b.EmpresaId = ?;`,
            [pId,pEmpId]
        );

        return rows[0] || null;
    },

    async traerPorNombre({pEmpId,pNombre}){
        const [rows] = await pool.query(
            `SELECT * FROM Bodegas WHERE Nombre = ? and EmpresaId = ?;`,
            [pNombre,pEmpId]
        );

        return rows[0] || null;
    },

    async contarTodoFiltro({pEmpId,pCampoOrden,pOrden,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Bodegas
                    WHERE EmpresaId = ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId]
            );

            return rows[0].total;
        }else{
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Bodegas
                    WHERE EmpresaId = ?
                    AND ${pCampoOrden} LIKE ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId,pTexto]
            );

            return rows[0].total;
        }

    },

}

export default Bodegas
