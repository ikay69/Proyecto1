import { pool } from '../Database/config.js';

/*
crear
validarNombreExiste retorna true o false
validarClaveExiste retorna ture o false
contarEmpresas retorna num
buscarPorClave 
listarTodasEmpresas
listarEmpresasActivas
cambiarEstado
traerDatosPorId
cambiarClave
cambiarPass
actualizarDatos

*/

const Empresa = {
    async crear({ pNombre,
        pTipoDocumento,
        pNumeroDocumento,
        pCelular,
        pTelefono,
        pEmail,
        pDireccion,
        pClave,
        pPassword
    }) {

 
        const [result] = await pool.query(
            `INSERT INTO Empresas (
                Nombre,
                TipoDocumento,
                NumeroDocumento,
                Celular,
                Telefono,
                Email,
                Direccion,
                Clave,
                Pass) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [pNombre,pTipoDocumento,pNumeroDocumento,pCelular,pTelefono,pEmail,pDireccion,pClave,pPassword]
        );

        const empresaId = result.insertId
        return empresaId;

  },
  
  async traerDatosPorNombre({nombre}){
    const [rows] = await pool.query(
        `SELECT Id,Nombre FROM Empresas where Nombre = ?`,
        [nombre]
    );
    
    return rows[0] || null;
  },

  async validarClaveExiste({clave}){
    const [rows] = await pool.query(
        `SELECT Nombre FROM Empresas where Clave = ?`,
        clave
    )

    if (rows.length > 0) {
        return true;  
    } else {
        return false; 
    }
  },

  async contarEmpresas({}){
    const [[{ result }]] = await pool.query('SELECT COUNT(*) AS result FROM Empresas');
    return result
  },

  async buscarPorClave(clave){
    const [rows] = await pool.query(
        'SELECT Id,Nombre,Clave,Estado,Pass FROM Empresas WHERE Clave = ?',
        [clave]
    );

    return rows[0] || null;
  },

  async listarTodasEmpresas(){
    const [rows] = await pool.query(
        `SELECT 
            Id,
            Nombre,
            TipoDocumento,
            NumeroDocumento,
            Celular,
            e.Estado,
            FechaCreacion,
            COUNT(ue.UsuarioId) AS cantUsuarios 
        FROM Empresas e
        LEFT JOIN UsuariosEmpresa ue ON e.Id = ue.EmpresaId
        GROUP BY e.Id;`);
    return rows || null;
  },

  async listarEmpresasActivas(){
    const [rows] = await pool.query(
        `SELECT 
            Id,
            Nombre
        FROM Empresas
        WHERE Estado = true`);
    return rows || null;
  },

  async cambiarEstado({pNewEstado,pId}){
    const [rows] = await pool.query(
        'UPDATE Empresas SET Estado = ? WHERE Id = ?',
        [pNewEstado,pId]
    );
    //console.log('empresa modelo cambia estado:',rows)
    return rows;
  },

  async traerDatosPorId({pId}){
    //console.log('modelo empres id ',pId);

    const [rows] = await pool.query(
       `SELECT 
            Id,
            Nombre,
            TipoDocumento,
            NumeroDocumento,
            Celular,
            Telefono,
            Email,
            Direccion,
            Clave,
            Pass
        FROM Empresas
        WHERE Id = ?`,
        [pId] 
    );

    //console.log('empresa modelo traer id :',rows)

    return rows[0] || null;
  },
    
  async cambiarClave({pNewClave,pId}){
    const [rows] = await pool.query(
        'UPDATE Empresas SET Clave = ? WHERE Id = ?',
        [pNewClave,pId]
    );
    //console.log('empresa modelo cambia clave:',rows)
    return rows;
  },

  async cambiarPass({pnewPass,pId}){
    const [rows] = await pool.query(
        'UPDATE Empresas SET Pass = ? WHERE Id = ?',
        [pnewPass,pId]
    );
    //console.log('empresa modelo cambia pass:',rows)
    return rows;
  },

  async actualizarDatos({pId,pNombre,pTipoDocumento,pNumeroDocumento,pCelular,pTelefono,pEmail,pDireccion}){
    const [rows] = await pool.query(
       `UPDATE Empresas SET 
            Nombre = ?,
            TipoDocumento = ?,
            NumeroDocumento = ?,
            Celular = ?,
            Telefono = ?,
            Email = ?,
            Direccion = ?
        WHERE Id = ?`,
        [pNombre,pTipoDocumento,pNumeroDocumento,pCelular,pTelefono,pEmail,pDireccion,pId] 
    );

    //console.log('empresa modelo traer id :',rows)

    return rows[0] || null;
  },


}



export default Empresa;
