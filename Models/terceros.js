import { pool } from '../Database/config.js';

const Terceros = {
    //crear tercero
    async crear({pEmpId,pUsuIdCrea,pNombre,pApellidos,pTipoDocumento,pNumeroDocumento,pCelular,pEmail,pDireccion}){
        const [rows] = await pool.query(
            `INSERT INTO Terceros(
                EmpresaId,
                UsuarioIdCreador,
                Nombre,
                Apellidos,
                TipoDocumento,
                NumeroDocumento,
                Celular,
                Email,
                Direccion)
            VALUES(?,?,?,?,?,?,?,?,?)`,
            [pEmpId,pUsuIdCrea,pNombre,pApellidos,pTipoDocumento,pNumeroDocumento,pCelular,pEmail,pDireccion]
        );

        return rows.insertId;
    },

    async editar({pEmpId,pId,pNombre,pApellidos,pTipoDocumento,pNumeroDocumento,pCelular,pEmail,pDireccion,pEstado}){
        const [rows] = await pool.query(
            `UPDATE Terceros SET
                Nombre = ?,
                Apellidos = ?,
                TipoDocumento = ?,
                NumeroDocumento = ?,
                Celular = ?,
                Email = ?,
                Direccion = ?,
                Estado = ?
            WHERE EmpresaId = ? AND Id = ?;`,
            [pNombre,pApellidos,pTipoDocumento,pNumeroDocumento,pCelular,pEmail,pDireccion,pEstado,pEmpId,pId]
        );

        return rows.affectedRows;
    },

    async traerTodo({pEmpId,pCampoOrden,pOrden,pOffset,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT 
                    t.Id,
                    CONCAT(tp.Abreviatura,' ',t.NumeroDocumento) as identificacion,
                    CONCAT(t.Nombre,' ',t.Apellidos) as Nombre,
                    t.Celular,
                    t.FechaCreacion,
                    t.Estado
                FROM Terceros t
                lEFT JOIN TiposDocumentos tp on t.EmpresaId = tp.EmpresaId and t.TipoDocumento = tp.Id
                    WHERE t.EmpresaId = ?
                    ORDER BY t.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pOffset]
            );

            return rows || null;
        }else{
            const [rows] = await pool.query(
                `SELECT 
                    t.Id,
                    CONCAT(tp.Abreviatura,' ',t.NumeroDocumento) as identificacion,
                    CONCAT(t.Nombre,' ',t.Apellidos) as Nombre,
                    t.Celular,
                    t.FechaCreacion,
                    t.Estado
                FROM Terceros t
                lEFT JOIN TiposDocumentos tp on t.EmpresaId = tp.EmpresaId and t.TipoDocumento = tp.Id
                    WHERE t.EmpresaId = ?
                    AND t.${pCampoOrden} LIKE ?
                    ORDER BY t.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pTexto,pOffset]
            );

            return rows || null;
        }

    },

    async traerActivas({pEmpId,pCampoOrden,pOrden,pOffset,pTexto}){
        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT 
                    t.Id,
                    CONCAT(tp.Abreviatura,' ',t.NumeroDocumento) as identificacion,
                    CONCAT(t.Nombre,' ',t.Apellidos) as Nombre,
                    Celular
                FROM Terceros t
                lEFT JOIN TiposDocumentos tp on t.EmpresaId = tp.EmpresaId and t.TipoDocumento = tp.Id
                    WHERE t.EmpresaId = ?
                    AND t.Estado = true
                    ORDER BY t.${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pOffset]
            );

            return rows || null;
        }else{
            const [rows] = await pool.query(
                `SELECT 
                    t.Id,
                    CONCAT(tp.Abreviatura,' ',t.NumeroDocumento) as identificacion,
                    CONCAT(t.Nombre,' ',t.Apellidos) as Nombre,
                    Celular
                FROM Terceros t
                lEFT JOIN TiposDocumentos tp on t.EmpresaId = tp.EmpresaId and t.TipoDocumento = tp.Id
                    WHERE t.EmpresaId = ?
                    AND t.Estado = true
                    AND t.${pCampoOrden} LIKE ?
                    ORDER BY ${pCampoOrden} ${pOrden}
                    LIMIT 50 OFFSET ?;`,
                [pEmpId,pTexto,pOffset]
            );

            return rows || null;
        }
    },

    async traerPorId({pId,pEmpId}){
        const [rows] = await pool.query(
            `SELECT 
                t.Id,
                t.Nombre,
                t.Apellidos,
                t.TipoDocumento,
                t.NumeroDocumento,
                t.Celular,
                t.Email,
                t.Direccion,
                t.Estado,
                t.FechaCreacion,
                u.Nombres as usuario
            FROM Terceros t
            LEFT JOIN Usuarios u on t.UsuarioIdCreador = u.Id 
            WHERE t.Id = ? and t.EmpresaId = ?;`,
            [pId,pEmpId]
        );

        return rows[0] || null;
    },

    async traerPorTipoYNumero({pEmpId,pTipoDocumento,pNumeroDocumento}){
        const [rows] = await pool.query(
            `SELECT * FROM Terceros WHERE TipoDocumento = ? and NumeroDocumento = ? and EmpresaId = ?;`,
            [pTipoDocumento,pNumeroDocumento,pEmpId]
        );

        return rows[0] || null;
    },

    async contarTodoFiltro({pEmpId,pCampoOrden,pOrden,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Terceros
                    WHERE EmpresaId = ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId]
            );

            return rows[0].total;
        }else{
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Terceros
                    WHERE EmpresaId = ?
                    AND ${pCampoOrden} LIKE ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId,pTexto]
            );

            return rows[0].total;
        }

    },

    async contarActivivosFiltro({pEmpId,pCampoOrden,pOrden,pTexto}){

        if(pTexto === '%%'){
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Terceros
                    WHERE EmpresaId = ? AND ESTADO = true
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId]
            );

            return rows[0].total;
        }else{
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS total
                FROM Terceros
                    WHERE EmpresaId = ? AND ESTADO = true
                    AND ${pCampoOrden} LIKE ?
                    ORDER BY ${pCampoOrden} ${pOrden};`,
                [pEmpId,pTexto]
            );

            return rows[0].total;
        }

    },

}

export default Terceros
