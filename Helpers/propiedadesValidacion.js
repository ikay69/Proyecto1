//validaciones ruta

import Propiedades from '../Models/propiedades.js';

//cada idPropiedad del body debe existir y ser de la empresa del token: sin esto,
//ArticuloPropiedades escribiria filas apuntando a una Propiedad ajena. Ademas aplica la regla
//del spec: si la Propiedad es de TipoDato NUMERO, el Valor tiene que ser numerico.
//Devuelve el mensaje de error, o null si todo esta correcto.
//Vive separada de Controllers/articulos.js porque Controllers/compras.js tambien la necesita
//para las lineas que traen ArticuloNuevo, y duplicarla es como se desincronizo otra regla en
//este codigo alguna vez.
const validarPropiedadesArticulo = async (idEmpresa, listaPropiedades) => {
    if (!Array.isArray(listaPropiedades)) return null;

    for (const prop of listaPropiedades) {
        const existePropiedad = await Propiedades.traerPorId({pId:prop.idPropiedad, pEmpId:idEmpresa});
        if (!existePropiedad) {
            return 'Propiedad inválida';
        }
        //traerPorId devuelve las columnas con alias (proTipoDato); el fallback cubre
        //cualquier consulta que las entregue sin alias.
        const tipoDato = existePropiedad.proTipoDato ?? existePropiedad.TipoDato;
        if (tipoDato === 'NUMERO' && isNaN(Number(prop.Valor))) {
            return 'El valor de la propiedad debe ser numérico';
        }
    }

    return null;
};

export { validarPropiedadesArticulo };
