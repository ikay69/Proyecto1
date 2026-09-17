import { pool } from '../Database/config.js';

const TiposProducto = {
    //crear tipo de producto
    async crear({pEmpId,pUsuIdCrea,pNombre}){
        const [rows] = await pool.query(
            `INSERT INTO TiposProductos(
                EmpresaId,
                UsuarioIdCreador,
                Nombre)
            VALUES(?,?,?)`,
            [pEmpId,pUsuIdCrea,pNombre]
        );

        return rows.insertId;
    },

    //TiposProductos no maneja columna Estado, por eso editar solo actualiza Nombre
    async editar({pEmpId,pId,pNombre,pEstado}){
        const [rows] = await pool.query(
            `UPDATE TiposProductos SET
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
                    tp.Id               as tipProId,
                    tp.EmpresaId        as tipProEmp,
                    tp.Nombre           as tipProNombre,
                    tp.Estado           as tipProEstado,
                    tp.FechaCreacion    as tipProFecCreacion,
                    u.Nombres           as tipProUsuario
                FROM TiposProductos tp
                LEFT JOIN Usuarios u on tp.UsuarioIdCreador = u.Id 
                    WHERE tp.EmpresaId = ?
                    ORDER BY tp.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pOffset]
            );

            return rows || null;
        }else{
            const [rows] = await pool.query(
                `SELECT 
                    tp.Id               as tipProId,
                    tp.EmpresaId        as tipProEmp,
                    tp.Nombre           as tipProNombre,
                    tp.Estado           as tipProEstado,
                    tp.FechaCreacion    as tipProFecCreacion,
                    u.Nombres           as tipProUsuario
                FROM TiposProductos tp
                LEFT JOIN Usuarios u on tp.UsuarioIdCreador = u.Id 
                    WHERE tp.EmpresaId = ?
                    AND tp.${pCampoOrden} LIKE ?
                    ORDER BY tp.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pTexto,pOffset]
            );

            return rows || null;
        }

    },

    //no existe columna Estado en esta tabla, se listan todos los registros de la empresa
    async traerActivas({pEmpId}){
        const [rows] = await pool.query(
            `SELECT
                Id AS tipProId,
                Nombre AS tipProNombre
            FROM TiposProductos WHERE EmpresaId = ? 
            AND  Estado = true
            ORDER BY Nombre ASC;`,
            [pEmpId]
        );

        return rows || null;
    },

    async traerPorId({pId,pEmpId}){
        const [rows] = await pool.query(
            `SELECT
                tp.Id               as tipProId,
                tp.EmpresaId        as tipProEmp,
                tp.Nombre           as tipProNombre,
                tp.Estado           as tipProEstado,
                tp.FechaCreacion    as tipProFecCreacion,
                u.Nombres           as tipProUsuario
            FROM TiposProductos tp
            LEFT JOIN Usuarios u on tp.UsuarioIdCreador = u.Id
            WHERE tp.Id = ? and tp.EmpresaId = ?;`,
            [pId,pEmpId]
        );

        return rows[0] || null;
    },

    async traerPorNombre({pEmpId,pNombre}){
        const [rows] = await pool.query(
            `SELECT * FROM TiposProductos WHERE Nombre = ? and EmpresaId = ?;`,
            [pNombre,pEmpId]
        );

        return rows[0] || null;
    },

    async contarTodoFiltro({pEmpId,pCampoOrden,pOrden,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM TiposProductos
                    WHERE EmpresaId = ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId]
            );

            return rows[0].total;
        }else{
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM TiposProductos
                    WHERE EmpresaId = ?
                    AND ${pCampoOrden} LIKE ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId,pTexto]
            );

            return rows[0].total;
        }

    },

}

export default TiposProducto
