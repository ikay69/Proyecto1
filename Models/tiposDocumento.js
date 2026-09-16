import { pool } from '../Database/config.js';

const TiposDocumento = {
    //crear tipo de documento
    async crear({pEmpId,pUsuIdCrea,pAbreviatura,pDescripcion}){
        const [rows] = await pool.query(
            `INSERT INTO TiposDocumentos(
                EmpresaId,
                UsuarioIdCreador,
                Abreviatura,
                Descripcion)
            VALUES(?,?,?,?)`,
            [pEmpId,pUsuIdCrea,pAbreviatura,pDescripcion]
        );

        return rows.insertId;
    },

    async editar({pEmpId,pId,pAbreviatura,pDescripcion,pEstado}){
        const [rows] = await pool.query(
            `UPDATE TiposDocumentos SET
                Abreviatura = ?,
                Descripcion = ?,
                Estado = ?
            WHERE EmpresaId = ? AND Id = ?;`,
            [pAbreviatura,pDescripcion,pEstado,pEmpId,pId]
        );

        return rows.affectedRows;
    },

    async traerTodo({pEmpId,pCampoOrden,pOrden,pOffset,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT 
                    td.EmpresaId as tipDocEmp,
                    td.Id as tipDocId,
                    td.Abreviatura as tipDocAbreviatura,
                    td.Descripcion as tipDocNombre,
                    td.Estado as tipDocEstado,
                    td.FechaCreacion as tipDocFecCreacion,
                    u.Nombres as tipDocUsuario
                FROM TiposDocumentos td
                LEFT JOIN Usuarios u on td.UsuarioIdCreador = u.Id
                    WHERE td.EmpresaId = ?
                    ORDER BY td.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pOffset]
            );

            return rows || null;
        }else{
            const [rows] = await pool.query(
                `SELECT 
                    td.EmpresaId as tipDocEmp,
                    td.Id as tipDocId,
                    td.Abreviatura as tipDocAbreviatura,
                    td.Descripcion as tipDocNombre,
                    td.Estado as tipDocEstado,
                    td.FechaCreacion as tipDocFecCreacion,
                    u.Nombres as tipDocUsuario
                FROM TiposDocumentos td
                left join Usuarios u on td.UsuarioIdCreador = u.Id
                    WHERE td.EmpresaId = ?
                    AND td.${pCampoOrden} LIKE ?
                    ORDER BY td.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pTexto,pOffset]
            );

            return rows || null;
        }

    },

    async traerActivas({pEmpId}){
        const [rows] = await pool.query(
            `SELECT
                tp.Id AS tipDocId,
                CONCAT(tp.Abreviatura, ' ', tp.Descripcion) AS tipDocNombre
            FROM TiposDocumentos tp 
            WHERE tp.EmpresaId = ? 
            AND tp.Estado = true;`,
            [pEmpId]
        );

        return rows || null;
    },

    async traerPorId({pId,pEmpId}){
        const [rows] = await pool.query(
            `SELECT 
                td.EmpresaId    as tipDocEmp,
                td.Id           as tipDocId,
                td.Abreviatura  as tipDocAbreviatura,
                td.Descripcion  as tipDocNombre,
                td.Estado       as tipDocEstado,
                td.FechaCreacion as tipDocFecCreacion,
                u.Nombres       as tipDocUsuario
            FROM TiposDocumentos td
            left join Usuarios u on td.UsuarioIdCreador = u.Id
            WHERE td.Id = ? and td.EmpresaId = ?;`,
            [pId,pEmpId]
        );

        return rows[0] || null;
    },

    async traerPorAbreviatura({pEmpId,pAbreviatura}){
        const [rows] = await pool.query(
            `SELECT * FROM TiposDocumentos WHERE Abreviatura = ? and EmpresaId = ?;`,
            [pAbreviatura,pEmpId]
        );

        return rows[0] || null;
    },

    async contarTodoFiltro({pEmpId,pCampoOrden,pOrden,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM TiposDocumentos
                    WHERE EmpresaId = ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId]
            );

            return rows[0].total;
        }else{
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM TiposDocumentos
                    WHERE EmpresaId = ?
                    AND ${pCampoOrden} LIKE ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId,pTexto]
            );

            return rows[0].total;
        }

    },

}

export default TiposDocumento
