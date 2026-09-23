import Articulos from '../Models/articulos.js';
import ArticuloPropiedades from '../Models/articuloPropiedades.js';
import Productos from '../Models/productos.js';
import Existencias from '../Models/existencias.js';
import Bodegas from '../Models/bodegas.js';
import { validarPropiedadesArticulo } from '../Helpers/propiedadesValidacion.js';

//el nombre de columna nunca sale del body: se traduce aqui a un valor fijo, porque los
//Models lo interpolan directamente en el ORDER BY / LIKE
const normalizarCampoOrden = (campoOrdenar) => {
    if (campoOrdenar === 2) return 'CodigoSKU';
    if (campoOrdenar === 3) return 'Descripcion';
    if (campoOrdenar === 4) return 'FechaCreacion';
    return 'Nombre';
};

//el campo por el que se ordena es tambien el que se filtra; la fecha no es texto,
//por eso con campoOrdenar=3 el filtro queda abierto
const normalizarTextoFiltro = (campoOrdenar, textoFiltro) => {
    if (campoOrdenar === 3) return '%%';
    if (!textoFiltro || String(textoFiltro).trim().length === 0) return '%%';
    return `%${String(textoFiltro).trim()}%`;
};

const articulosControllers = {
    crear: async (req,res) => {
        try {
            const {idEmpresa, idProducto, Nombre, Descripcion, PrecioVentaUnitario, Propiedades} = req.body;

            const vNombre = String(Nombre ?? '').toUpperCase().trim();
            const vDescripcion = String(Descripcion ?? '').trim();
            const UsuIdLogin = req.usuario.Id;

            if (!Number.isInteger(idProducto)) {
                return res.status(400).json({msg:'Producto inválido'});
            }

            //el producto debe existir y ser de la misma empresa del token
            const existeProducto = await Productos.traerPorId({pId:idProducto,pEmpId:idEmpresa});
            if (!existeProducto) {
                return res.status(400).json({msg:'Producto inválido'});
            }

            const errorPropiedades = await validarPropiedadesArticulo(idEmpresa, Propiedades);
            if (errorPropiedades) {
                return res.status(400).json({msg:errorPropiedades});
            }

            const nuevoId = await Articulos.crear({
                pEmpId: idEmpresa,
                pUsuIdCrea: UsuIdLogin,
                pProductoId: idProducto,
                pNombre: vNombre,
                pDescripcion: vDescripcion || null,
                pPrecioVentaUnitario: PrecioVentaUnitario ?? null,
                pPropiedades: Propiedades || []
            });

            if (nuevoId > 0) {
                return res.status(200).json({msg:'Articulo creado'});
            }
            return res.status(400).json({msg:'Error en inserción'});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    },

    editar: async (req,res) => {
        try {
            const {idEmpresa, idArticulo, idProducto, Nombre, Descripcion, PrecioVentaUnitario, Vender, Estado, Propiedades} = req.body;

            const vNombre = String(Nombre ?? '').toUpperCase().trim();
            const vDescripcion = String(Descripcion ?? '').trim();

            if (!Number.isInteger(idArticulo)) {
                return res.status(400).json({msg:'Articulo inválido'});
            }
            if (!Number.isInteger(idProducto)) {
                return res.status(400).json({msg:'Producto inválido'});
            }

            //sin esta comprobacion un idArticulo de otra empresa igual llegaria a
            //ArticuloPropiedades.reemplazarValores y escribiria filas ajenas
            const existeArticulo = await Articulos.traerPorId({pId:idArticulo,pEmpId:idEmpresa});
            if (!existeArticulo) {
                return res.status(400).json({msg:'Articulo inválido'});
            }

            const existeProducto = await Productos.traerPorId({pId:idProducto,pEmpId:idEmpresa});
            if (!existeProducto) {
                return res.status(400).json({msg:'Producto inválido'});
            }

            const errorPropiedades = await validarPropiedadesArticulo(idEmpresa, Propiedades);
            if (errorPropiedades) {
                return res.status(400).json({msg:errorPropiedades});
            }

            const filasActualizadas = await Articulos.editar({
                pEmpId: idEmpresa,
                pId: idArticulo,
                pProductoId: idProducto,
                pNombre: vNombre,
                pDescripcion: vDescripcion || null,
                pPrecioVentaUnitario: PrecioVentaUnitario ?? null,
                pVender: Vender === false ? false : true,
                pEstado: Estado === false ? false : true,
                pPropiedades: Propiedades || []
            });

            if (filasActualizadas > 0) {
                return res.status(200).json({msg:'Articulo actualizado'});
            }
            return res.status(400).json({msg:'Error en actualización'});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    },

    //el costo unitario ya no vive en Articulos: este ajuste manual escribe (o crea, si aun no
    //existia) la bolsa DISPONIBLE/sin propietario de la bodega indicada en Existencias, sin
    //tocar su Cantidad.
    editarCosto: async (req,res) => {
        try {
            const {idEmpresa, idBodega, idArticulo, nuevoCosto} = req.body;

            if (!Number.isInteger(idArticulo)) {
                return res.status(400).json({msg:'Articulo inválido'});
            }
            if (!Number.isInteger(idBodega)) {
                return res.status(400).json({msg:'Bodega inválida'});
            }

            const existeArticulo = await Articulos.traerPorId({pId:idArticulo,pEmpId:idEmpresa});
            if (!existeArticulo) {
                return res.status(400).json({msg:'Articulo inválido'});
            }

            const existeBodega = await Bodegas.traerPorId({pId:idBodega,pEmpId:idEmpresa});
            if (!existeBodega || !existeBodega.bodEstado) {
                return res.status(400).json({msg:'Bodega inválida'});
            }

            await Existencias.editarCosto({
                pEmpId: idEmpresa,
                pBodegaId: idBodega,
                pArticuloId: idArticulo,
                pBolsaEstado: 'DISPONIBLE',
                pPropietarioId: null,
                pCosto: Number(nuevoCosto)
            });

            return res.status(200).json({msg:'Costo actualizado'});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    },

    listarTodas: async (req,res) => {
        try {
            const {idEmpresa,campoOrdenar,orden,pagina,textoFiltro} = req.body;

            const vOrden = orden === 'DESC' ? 'DESC' : 'ASC';
            const vCampoOrdenar = normalizarCampoOrden(campoOrdenar);
            const vTextoFiltro = normalizarTextoFiltro(campoOrdenar, textoFiltro);

            let vPagina = Number(pagina);
            const cantArticulos = await Articulos.contarTodoFiltro({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pTexto:vTextoFiltro});
            const maxPagina = Math.max(1, Math.ceil(cantArticulos/50));
            vPagina = Math.min(Math.max(vPagina,1), maxPagina);
            const vOffset = (vPagina - 1) * 50;

            const articulos = await Articulos.traerTodo({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pOffset:vOffset,pTexto:vTextoFiltro});

            return res.status(200).json({cantData:cantArticulos, data:articulos});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    },

    listarActivas: async (req,res) => {
        try {
            const {idEmpresa,campoOrdenar,orden,pagina,textoFiltro} = req.body;

            const vOrden = orden === 'DESC' ? 'DESC' : 'ASC';
            const vCampoOrdenar = normalizarCampoOrden(campoOrdenar);
            const vTextoFiltro = normalizarTextoFiltro(campoOrdenar, textoFiltro);

            let vPagina = Number(pagina);
            const cantArticulos = await Articulos.contarActivasFiltro({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pTexto:vTextoFiltro});
            const maxPagina = Math.max(1, Math.ceil(cantArticulos/50));
            vPagina = Math.min(Math.max(vPagina,1), maxPagina);
            const vOffset = (vPagina - 1) * 50;

            const articulos = await Articulos.traerActivas({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pOffset:vOffset,pTexto:vTextoFiltro});

            
            return res.status(200).json({cantData:cantArticulos, data:articulos});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    },

    //"ventanilla" de venta: solo articulos activos, vendibles y con existencia DISPONIBLE.
    //idBodega es opcional: si se manda, filtra a esa bodega; si no, trae una fila por cada
    //combinacion articulo+bodega con existencia (util para elegir de que bodega vender cada
    //renglon, ya que una venta puede mezclar bodegas por linea).
    listarVendibles: async (req,res) => {
        try {
            const {idEmpresa,idBodega,campoOrdenar,orden,pagina,textoFiltro} = req.body;

            const vOrden = orden === 'DESC' ? 'DESC' : 'ASC';
            const vCampoOrdenar = normalizarCampoOrden(campoOrdenar);
            const vTextoFiltro = normalizarTextoFiltro(campoOrdenar, textoFiltro);
            const vBodegaId = idBodega || '';

            let vPagina = Number(pagina);
            const cantArticulos = await Articulos.contarVendiblesFiltro({pEmpId:idEmpresa,pBodegaId:vBodegaId,pCampoOrden:vCampoOrdenar,pTexto:vTextoFiltro});
            const maxPagina = Math.max(1, Math.ceil(cantArticulos/50));
            vPagina = Math.min(Math.max(vPagina,1), maxPagina);
            const vOffset = (vPagina - 1) * 50;

            const articulos = await Articulos.traerVendibles({pEmpId:idEmpresa,pBodegaId:vBodegaId,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pOffset:vOffset,pTexto:vTextoFiltro});

            return res.status(200).json({cantData:cantArticulos, data:articulos});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    },

    listarPorId: async (req,res) => {
        try {
            const {idEmpresa,idArticulo} = req.body;

            const articulo = await Articulos.traerPorId({pId:idArticulo,pEmpId:idEmpresa});
            if (!articulo) {
                return res.status(400).json({msg:'Articulo inválido'});
            }

            const propiedades = await ArticuloPropiedades.traerPorArticulo({pEmpId:idEmpresa,pArticuloId:idArticulo});
            //el spec pide tambien el resumen de existencias por bolsa en el detalle del articulo
            const existencias = await Existencias.traerBolsasPorArticulo({pEmpId:idEmpresa,pArticuloId:idArticulo});

            return res.status(200).json({data:{...articulo, propiedades, existencias}});
        } catch (error) {
            return res.status(500).json({msg:String(error)});
        }
    }
};

export default articulosControllers;
