//validaciones ruta

const CAMPOS_ORDENAR_VALIDOS = [1, 2, 3, 4]; // 1:Nombre, 2:CodigoSKU, 3:FechaCreacion

const articuloValidaDatos = async (req,res,next) => {
    const {Nombre, Descripcion, PrecioVentaUnitario, Propiedades} = req.body;

    let vNombre = String(Nombre ?? '').toUpperCase().trim();
    let vDescripcion = String(Descripcion ?? '').trim();

    if (!vNombre || vNombre.length === 0) {
        return res.status(401).json({msg:'El nombre no puede estar vacío'});
    }
    if (vNombre.length > 150) {
        return res.status(401).json({msg:'El nombre supera los 150 caracteres'});
    }
    if (vDescripcion.length > 300) {
        return res.status(401).json({msg:'La descripción supera los 300 caracteres'});
    }

    if (PrecioVentaUnitario !== undefined && PrecioVentaUnitario !== null) {
        if (isNaN(Number(PrecioVentaUnitario)) || Number(PrecioVentaUnitario) < 0) {
            return res.status(401).json({msg:'El precio de venta es inválido'});
        }
    }

    if (Propiedades !== undefined && Propiedades !== null) {
        if (!Array.isArray(Propiedades)) {
            return res.status(401).json({msg:'Propiedades debe ser una lista'});
        }
        for (const prop of Propiedades) {
            //sin este guarda, un elemento null/primitivo haria estallar el acceso a
            //prop.idPropiedad y la ruta respondería 500 en vez de un 401 de validacion
            if (prop === null || typeof prop !== 'object' || Array.isArray(prop)) {
                return res.status(401).json({msg:'idPropiedad inválido en Propiedades'});
            }
            if (!Number.isInteger(prop.idPropiedad)) {
                return res.status(401).json({msg:'idPropiedad inválido en Propiedades'});
            }
            if (prop.Valor === undefined || prop.Valor === null || String(prop.Valor).trim().length === 0) {
                return res.status(401).json({msg:'El valor de la propiedad no puede estar vacío'});
            }
            if (String(prop.Valor).length > 150) {
                return res.status(401).json({msg:'El valor de la propiedad supera los 150 caracteres'});
            }
        }
    }

    next();
};

//se usa tanto para /getallarticulo como /getactivasarticulo, ya que ambas rutas
//reciben el mismo cuerpo (idEmpresa, campoOrdenar, orden, pagina, textoFiltro)
const articuloValidaFiltros = async (req,res,next) => {
    const {campoOrdenar, pagina, textoFiltro} = req.body;

    if (!Number.isInteger(pagina)) {
        return res.status(401).json({msg:'Pagina invalida'});
    }
    if (!CAMPOS_ORDENAR_VALIDOS.includes(campoOrdenar)) {
        return res.status(401).json({msg:'Campo de orden invalido'});
    }
    if (textoFiltro !== undefined && textoFiltro !== null && String(textoFiltro).trim().length > 150) {
        return res.status(401).json({msg:'Texto de filtro supera los 150 caracteres'});
    }

    next();
};

const articuloValidaCosto = async (req,res,next) => {
    const {idBodega, nuevoCosto} = req.body;

    if (!Number.isInteger(idBodega)) {
        return res.status(401).json({msg:'Bodega inválida'});
    }
    if (nuevoCosto === undefined || nuevoCosto === null || isNaN(Number(nuevoCosto)) || Number(nuevoCosto) <= 0) {
        return res.status(401).json({msg:'El nuevo costo debe ser un número mayor a cero'});
    }

    next();
};

export { articuloValidaDatos, articuloValidaFiltros, articuloValidaCosto };
