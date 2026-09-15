import { pool } from '../Database/config.js';

const Productos = {
    //crear producto
    async crear({pEmpId,pUsuIdCrea,pNombre,pDescripcion,pTipoProductoId,pCategoriaId,pUnidadMedidaId,pTipoSeguimiento}){
        const [rows] = await pool.query(
            `INSERT INTO Productos(
                EmpresaId,
                UsuarioIdCreador,
                Nombre,
                Descripcion,
                TipoProductoId,
                CategoriaId,
                UnidadMedidaId,
                TipoSeguimiento)
            VALUES(?,?,?,?,?,?,?,?)`,
            [pEmpId,pUsuIdCrea,pNombre,pDescripcion,pTipoProductoId,pCategoriaId,pUnidadMedidaId,pTipoSeguimiento]
        );

        return rows.insertId;
    },

    async editar({pEmpId,pId,pNombre,pDescripcion,pTipoProductoId,pCategoriaId,pUnidadMedidaId,pTipoSeguimiento,pEstado}){
        const [rows] = await pool.query(
            `UPDATE Productos SET
                Nombre = ?,
                Descripcion = ?,
                TipoProductoId = ?,
                CategoriaId = ?,
                UnidadMedidaId = ?,
                TipoSeguimiento = ?,
                Estado = ?
            WHERE EmpresaId = ? AND Id = ?;`,
            [pNombre,pDescripcion,pTipoProductoId,pCategoriaId,pUnidadMedidaId,pTipoSeguimiento,pEstado,pEmpId,pId]
        );

        return rows.affectedRows;
    },

    //listado general paginado, con join para traer los nombres legibles de las tablas relacionadas
    async traerTodo({pEmpId,pCampoOrden,pOrden,pOffset,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT
                    p.Id AS proId,
                    p.EmpresaId AS proEmp,
                    u.Nombres AS proUsuario,
                    p.FechaCreacion AS proFecCreacion,
                    p.Nombre AS proNombre,
                    p.Descripcion AS proDescripcion,
                    p.Estado AS proEstado,
                    tp.Nombre AS TipoProductoNombre,
                    c.Nombre AS CategoriaNombre,
                    um.Nombre AS UnidadMedidaNombre,
                    um.Simbolo AS UnidadMedidaSimbolo
                FROM Productos p
                    LEFT JOIN TiposProductos tp ON tp.Id = p.TipoProductoId
                    LEFT JOIN Categorias c ON c.Id = p.CategoriaId
                    LEFT JOIN UnidadesMedidas um ON um.Id = p.UnidadMedidaId
                    LEFT JOIN Usuarios u ON p.UsuarioIdCreador = u.Id
                    WHERE p.EmpresaId = ?
                    ORDER BY p.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pOffset]
            );

            return rows || null;
        }else{
            const [rows] = await pool.query(
                `SELECT
                    p.Id AS proId,
                    p.EmpresaId AS proEmp,
                    u.Nombres AS proUsuario,
                    p.FechaCreacion AS proFecCreacion,
                    p.Nombre AS proNombre,
                    p.Descripcion AS proDescripcion,
                    p.Estado AS proEstado,
                    tp.Nombre AS TipoProductoNombre,
                    c.Nombre AS CategoriaNombre,
                    CONCAT(um.Nombre,'(',um.Simbolo,')') AS UnidadMedidaNombre
                FROM Productos p
                    LEFT JOIN TiposProductos tp ON tp.Id = p.TipoProductoId
                    LEFT JOIN Categorias c ON c.Id = p.CategoriaId
                    LEFT JOIN UnidadesMedidas um ON um.Id = p.UnidadMedidaId
                    LEFT JOIN Usuarios u ON p.UsuarioIdCreador = u.Id
                    WHERE p.EmpresaId = ?
                    AND p.${pCampoOrden} LIKE ?
                    ORDER BY p.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pTexto,pOffset]
            );

            return rows || null;
        }

    },

    //activos: igual de paginado/filtrado que traerTodo pero solo Estado = true, con un set de
    //columnas más liviano pensado para selects/dropdowns (ej. al agregar un producto a una venta)
    async traerActivas({pEmpId,pCampoOrden,pOrden,pOffset,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT
                    p.Id AS proId,
                    p.Nombre AS proNombre,
                    p.Descripcion AS proDescripcion,
                    tp.Nombre AS TipoProductoNombre,
                    c.Nombre AS CategoriaNombre,
                    CONCAT(um.Nombre,'(',um.Simbolo,')') AS UnidadMedidaNombre
                FROM Productos p
                    LEFT JOIN TiposProductos tp ON tp.Id = p.TipoProductoId
                    LEFT JOIN Categorias c ON c.Id = p.CategoriaId
                    LEFT JOIN UnidadesMedidas um ON um.Id = p.UnidadMedidaId
                    WHERE p.EmpresaId = ?
                    AND p.Estado = true
                    ORDER BY p.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pOffset]
            );

            return rows || null;
        }else{
            const [rows] = await pool.query(
                `SELECT
                    p.Id AS proId,
                    p.Nombre AS proNombre,
                    p.Descripcion AS proDescripcion,
                    tp.Nombre AS TipoProductoNombre,
                    c.Nombre AS CategoriaNombre,
                    CONCAT(um.Nombre,'(',um.Simbolo,')') AS UnidadMedidaNombre
                FROM Productos p
                    LEFT JOIN TiposProductos tp ON tp.Id = p.TipoProductoId
                    LEFT JOIN Categorias c ON c.Id = p.CategoriaId
                    LEFT JOIN UnidadesMedidas um ON um.Id = p.UnidadMedidaId
                    WHERE p.EmpresaId = ?
                    AND p.Estado = true
                    AND p.${pCampoOrden} LIKE ?
                    ORDER BY p.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pTexto,pOffset]
            );

            return rows || null;
        }

    },

    async traerPorId({pId,pEmpId}){
        const [rows] = await pool.query(
            `SELECT
                p.Id AS proId,
                p.EmpresaId     AS proEmp,
                u.Nombres       AS proUsuario,
                p.FechaCreacion AS proFecCreacion,
                p.Nombre        AS proNombre,
                p.Descripcion   AS proDescripcion,
                p.Estado        AS proEstado,
                tp.Id           AS proTipoProductoId,
                tp.Nombre       AS proTipoProductoNombre,
                c.Id            AS proCategoriaId,
                c.Nombre        AS proCategoriaNombre,
                um.Id           AS proUnidadMedidaId,
                CONCAT(um.Nombre,'(',um.Simbolo,')') AS proUnidadMedidaNombre
            FROM Productos p
                LEFT JOIN TiposProductos tp ON tp.Id = p.TipoProductoId
                LEFT JOIN Categorias c ON c.Id = p.CategoriaId
                LEFT JOIN UnidadesMedidas um ON um.Id = p.UnidadMedidaId
                LEFT JOIN Usuarios u ON p.UsuarioIdCreador = u.Id
                WHERE p.Id = ? and p.EmpresaId = ?;`,
            [pId,pEmpId]
        );

        return rows[0] || null;
    },

    async traerPorNombre({pEmpId,pNombre}){
        const [rows] = await pool.query(
            `SELECT * FROM Productos WHERE Nombre = ? and EmpresaId = ?;`,
            [pNombre,pEmpId]
        );

        return rows[0] || null;
    },

    async contarTodoFiltro({pEmpId,pCampoOrden,pOrden,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Productos
                    WHERE EmpresaId = ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId]
            );

            return rows[0].total;
        }else{
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Productos
                    WHERE EmpresaId = ?
                    AND ${pCampoOrden} LIKE ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId,pTexto]
            );

            return rows[0].total;
        }

    },

    async contarActivasFiltro({pEmpId,pCampoOrden,pOrden,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Productos
                    WHERE EmpresaId = ? AND Estado = true
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId]
            );

            return rows[0].total;
        }else{
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Productos
                    WHERE EmpresaId = ? AND Estado = true
                    AND ${pCampoOrden} LIKE ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId,pTexto]
            );

            return rows[0].total;
        }

    },

}

export default Productos
