import { pool } from '../Database/config.js';

const ArticuloPropiedades = {
    //reemplaza por completo el set de valores de un articulo: borra los existentes e
    //inserta los nuevos en bloque. Recibe la conexion de la transaccion del llamador
    //(Articulos.crear/editar) para que todo quede atomico.
    async reemplazarValores(connection, {pEmpId, pArticuloId, propiedades}){
        await connection.query(
            `DELETE FROM ArticuloPropiedades WHERE ArticuloId = ? AND EmpresaId = ?;`,
            [pArticuloId, pEmpId]
        );

        if (!propiedades || propiedades.length === 0) return;

        //insercion masiva con la forma `VALUES ?` de mysql2: requiere query(), no execute()
        const valores = propiedades.map(p => [pEmpId, pArticuloId, p.idPropiedad, p.Valor]);
        await connection.query(
            `INSERT INTO ArticuloPropiedades(EmpresaId, ArticuloId, PropiedadId, Valor) VALUES ?;`,
            [valores]
        );
    },

    async traerPorArticulo({pEmpId, pArticuloId}){
        const [rows] = await pool.query(
            `SELECT
                ap.PropiedadId AS propId, pr.Nombre AS propNombre,
                pr.TipoDato AS propTipoDato, ap.Valor AS propValor
            FROM ArticuloPropiedades ap
                LEFT JOIN Propiedades pr ON pr.Id = ap.PropiedadId
            WHERE ap.ArticuloId = ? AND ap.EmpresaId = ?;`,
            [pArticuloId, pEmpId]
        );
        return rows || [];
    }
};

export default ArticuloPropiedades;
