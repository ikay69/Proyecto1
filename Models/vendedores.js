import { pool } from '../Database/config.js';

// Los alias usan el prefijo vdr y no ven porque ven ya lo usa el modulo de Ventas.
//
// pEstado es el filtro de Estado del listado paginado: -1 trae todos, 1 solo activos y
// 0 solo inactivos. El predicado (? = -1 OR v.Estado = ?) evita ramificar la consulta
// en cuatro combinaciones al cruzarse con el filtro de texto.
const Vendedores = {
    //crear vendedor
    async crear({pEmpId,pUsuIdCrea,pNombre}){
        const [rows] = await pool.query(
            `INSERT INTO Vendedores(
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
            `UPDATE Vendedores SET
                Nombre = ?,
                Estado = ?
            WHERE EmpresaId = ? AND Id = ?;`,
            [pNombre,pEstado,pEmpId,pId]
        );

        return rows.affectedRows;
    },

    async traerTodo({pEmpId,pCampoOrden,pOrden,pOffset,pTexto,pEstado}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT
                    v.EmpresaId as vdrEmp,
                    v.Id as vdrId,
                    v.Nombre as vdrNombre,
                    v.Estado as vdrEstado,
                    v.FechaCreacion as vdrFecCreacion,
                    u.Nombres as vdrUsuario
                FROM Vendedores v
                left join Usuarios u on v.UsuarioIdCreador = u.Id
                    WHERE v.EmpresaId = ?
                    AND (? = -1 OR v.Estado = ?)
                    ORDER BY v.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pEstado,pEstado,pOffset]
            );

            return rows || null;
        }else{
            const [rows] = await pool.query(
                `SELECT
                    v.EmpresaId as vdrEmp,
                    v.Id as vdrId,
                    v.Nombre as vdrNombre,
                    v.Estado as vdrEstado,
                    v.FechaCreacion as vdrFecCreacion,
                    u.Nombres as vdrUsuario
                FROM Vendedores v
                left join Usuarios u on v.UsuarioIdCreador = u.Id
                    WHERE v.EmpresaId = ?
                    AND (? = -1 OR v.Estado = ?)
                    AND v.${pCampoOrden} LIKE ?
                    ORDER BY v.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pEstado,pEstado,pTexto,pOffset]
            );

            return rows || null;
        }

    },

    async traerActivos({pEmpId}){
        const [rows] = await pool.query(
            `SELECT
                Id as vdrId,
                Nombre as vdrNombre
            FROM Vendedores WHERE EmpresaId = ? AND Estado = true
            ORDER BY Nombre ASC;`,
            [pEmpId]
        );

        return rows || null;
    },

    async traerPorId({pId,pEmpId}){
        const [rows] = await pool.query(
            `SELECT
                v.EmpresaId as vdrEmp,
                v.Id as vdrId,
                v.Nombre as vdrNombre,
                v.Estado as vdrEstado,
                v.FechaCreacion as vdrFecCreacion,
                u.Nombres as vdrUsuario
            FROM Vendedores v
            left join Usuarios u on v.UsuarioIdCreador = u.Id
            WHERE v.Id = ? and v.EmpresaId = ?;`,
            [pId,pEmpId]
        );

        return rows[0] || null;
    },

    async traerPorNombre({pEmpId,pNombre}){
        const [rows] = await pool.query(
            `SELECT * FROM Vendedores WHERE Nombre = ? and EmpresaId = ?;`,
            [pNombre,pEmpId]
        );

        return rows[0] || null;
    },

    //cuenta con el mismo WHERE que traerTodo, de lo contrario el total y las paginas se separan.
    //no lleva ORDER BY: sobre un COUNT(*) no cambia nada.
    async contarTodoFiltro({pEmpId,pCampoOrden,pOrden,pTexto,pEstado}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Vendedores
                    WHERE EmpresaId = ?
                    AND (? = -1 OR Estado = ?);`,
                [pEmpId,pEstado,pEstado]
            );

            return rows[0].total;
        }else{
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Vendedores
                    WHERE EmpresaId = ?
                    AND (? = -1 OR Estado = ?)
                    AND ${pCampoOrden} LIKE ?;`,
                [pEmpId,pEstado,pEstado,pTexto]
            );

            return rows[0].total;
        }

    },

}

export default Vendedores
