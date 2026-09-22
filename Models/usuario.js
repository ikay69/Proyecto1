import { pool } from '../Database/config.js';

const Usuario = {
    async crear({pUserName, pPassword, pNombres, pApellidos, pRol}){
        try {
            
            const [result] = await pool.query(
                `INSERT INTO Usuarios (
                    userName,
                    Pass,
                    Nombres,
                    Apellidos,
                    Rol
                ) 
                VALUES (?, ?, ?, ?, ?)`,
                [pUserName, pPassword, pNombres, pApellidos, pRol]
            );

            return result.insertId

        } catch (error) {
            return String(error)
        }
    },

    async buscarPorUsername(userName) {
        const [rows] = await pool.query(
        'SELECT Id, Nombres, userName, Pass, Rol, Estado FROM Usuarios WHERE userName = ?',
        [userName]
        );
        return rows[0] || null;
    },

    async buscarPorIdJwt(id) {
        const [rows] = await pool.query(
            'SELECT Id,Rol,Estado FROM Usuarios WHERE Id = ?',
            [id]
        );
        return rows[0] || null;
    },

    async buscarPorId(id){
        const [rows] = await pool.query(
            'SELECT * FROM Usuarios WHERE Id = ?',
            [id]
        );
        return rows[0] || null;
    },

    async CantTotalUsuarios(){
        const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM Usuarios u `);
        return countRows[0].total
    },

    async traerTodosUsuarios({pPagina}){
        const [rows] = await pool.query(`
            SELECT 
                u.Id            AS usuid,
                u.userName      as usuUsuario,
                u.Nombres       AS usuNombres,
                u.Apellidos     AS usuApellidos,
                u.Estado        AS usuEstado,
                u.Rol           AS usuRol,
                u.FechaCreacion as usuFecCreacion
            FROM Usuarios u
            ORDER BY u.FechaCreacion ASC
            LIMIT 50 OFFSET ?;`,
            [pPagina]);

       return rows || null;
    },

    async cambiarPass({pId,pPass}){
        const [rows] = await pool.query(
            'UPDATE Usuarios SET Pass = ? WHERE id = ?',
            [pPass,pId])
        ;
        
        return rows.changedRows;
    },

    async actualizar({pNombres,pApellidos,pUserName,pRol,pId,pEstado}){
       // console.log('modelo usuario actualizar 83 nombre ',pNombres, ' ape ',pApellidos, ' user ',pUserName,' rol' ,pRol, ' id ', pId )
        const [rows] = await pool.query(
            `UPDATE Usuarios SET
                Nombres = ?,
                Apellidos = ?,
                userName = ?,
                Rol = ?,
                Estado = ?
            WHERE Id = ?
            `,
        [pNombres,pApellidos,pUserName,pRol,pEstado,pId])

        return rows.affectedRows;
    },








    async cambiarEstado({id,estado}){
        const [rows] = await pool.query(
            'UPDATE Usuarios SET Estado = ? WHERE id = ?;',
            [estado,id]
        );
        console.log('usuario model 56 rows.',rows);
    },

    //medias
    async listar({empresaId,offset,limite,texto,campoOrden,descAsc}){
       // console.log('emp:',empresaId,' offset:',offset,' limite:',limite,' texto:',texto, ' campoOrden:',campoOrden, ' descAsc :',descAsc)
        
        const [rows] = await pool.query(
            `SELECT 
                u.Id,
                u.userName,
                u.Nombres,
                u.Apellidos,
                u.Estado,
                u.Rol,
                u.FechaCreacion
            FROM Usuarios u 
            INNER JOIN UsuariosEmpresa ue ON u.Id = ue.UsuarioId
            WHERE ue.EmpresaId = ? 
            AND u.Nombres LIKE ?
            ORDER BY u.${campoOrden} ${descAsc}
            LIMIT ? OFFSET ?`,
            [empresaId,texto,limite,offset]
        );

       
        return rows || null;
    },



    async contar({empresaId,texto}){
        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total
            FROM Usuarios u 
            INNER JOIN UsuariosEmpresa ue ON u.Id = ue.UsuarioId
            WHERE ue.EmpresaId = ? 
            AND u.Nombres LIKE ?`,
            [empresaId,texto]
        );
        return countRows[0].total
    },

    

}


export default Usuario;