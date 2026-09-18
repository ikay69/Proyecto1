import { pool } from '../Database/config.js';

const UsuariosEmpresa = {
    async crear({pEmpresaId,pUsuarioId}){
      
        const [result] = await pool.query(
            `INSERT INTO UsuariosEmpresa (EmpresaId,UsuarioId) 
            VALUES (?, ?)`,
            [pEmpresaId, pUsuarioId]
        );
        return result;

    },

    async validarRelacion({pEmpresaId,pUsuarioId}){
        //console.log('usuariosempresa emp ',pEmpresaId,' usu ',pUsuarioId)
        const [rows] = await pool.query(
        'SELECT Estado FROM UsuariosEmpresa WHERE EmpresaId = ? AND UsuarioId = ?',
        [pEmpresaId,pUsuarioId]
        );
        return rows[0] || null;
       
    },

    async usuariosDeEmpresa({pEmpresaId}){
        const [rows] = await pool.query(
            `SELECT 
                u.Id                AS usuMioId,
                u.userName          AS usuMioUsuario,
                CONCAT(u.Nombres, ' ', u.Apellidos)            AS usuMioNombre,
                u.Estado            AS usuMioEstado,
                u.Rol               AS usuMioRol,
                u.FechaCreacion     AS usuMioFecCreacion
            FROM Usuarios u
            INNER JOIN UsuariosEmpresa ue ON u.Id = ue.UsuarioId
            WHERE ue.EmpresaId = ?`,
            [pEmpresaId]
        );
        //console.log('usearioemrpesa modelo 45:',rows)
        return rows; 
    },

    async empresasDeUsuario({pUsuarioId}){
        const [rows] = await pool.query(
            `SELECT 
            Id          AS empId,
            Nombre      AS empNombre
            FROM Empresas e
            INNER JOIN UsuariosEmpresa ue ON e.Id = ue.EmpresaId
            WHERE ue.UsuarioId = ?`,
            [pUsuarioId]
        );
        //console.log('usearioemrpesa modelo 45:',rows)
        return rows; 
    },

    async usuariosSinMiEmpresa({pEmpresaId}){
        const [rows] = await pool.query(
          `SELECT 
            u.Id, 
            u.userName, 
            u.Nombres, 
            u.Apellidos,
            u.Rol
            FROM Usuarios u
            LEFT JOIN UsuariosEmpresa ue 
                ON u.Id = ue.UsuarioId AND ue.EmpresaId = ?
            WHERE ue.UsuarioId IS NULL
            AND u.Estado = true;`,
          [pEmpresaId]  
        );

        return rows;
    },

    async cantUsuariosAdminActivos({pEmpresa}){
        const [total] =  await pool.query(

            `SELECT COUNT(*) AS total
            FROM UsuariosEmpresa ue
            INNER JOIN Usuarios u ON ue.UsuarioId = u.Id
            WHERE ue.EmpresaId = ?
            AND ue.Estado = TRUE
            AND u.Estado = TRUE
            AND u.Rol = 'ADMINISTRADOR';`,
            [pEmpresa]
        );

        return total[0].total ;
    }
}


export default UsuariosEmpresa;