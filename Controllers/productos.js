import Productos from '../Models/productos.js';
import TiposProducto from '../Models/tiposProducto.js';
import Categorias from '../Models/categorias.js';
import UnidadesMedida from '../Models/unidadesMedida.js';


const productosControllers = {
    //crear producto
    crear:async(req,res)=>{
        try {
            const {idEmpresa,Nombre,Descripcion,idTipoProducto,idCategoria,idUnidadMedida,TipoSeguimiento} = req.body;

            var vNombre = String(Nombre ?? '');
            var vTipoSeguimiento = String(TipoSeguimiento ?? '');
            var vDescripcion = String(Descripcion ?? '');
            var UsuIdLogin = req.usuario.Id;

            vNombre = vNombre.toUpperCase().trim();
            vTipoSeguimiento = vTipoSeguimiento.toUpperCase().trim();
            vDescripcion = vDescripcion.trim();

            if(!Number.isInteger(idTipoProducto) == true){
                return res.status(400).json({msg:'Tipo de producto invalido'});
            }

            if(!Number.isInteger(idCategoria) == true){
                return res.status(400).json({msg:'Categoria invalida'});
            }

            if(!Number.isInteger(idUnidadMedida) == true){
                return res.status(400).json({msg:'Unidad de medida invalida'});
            }

            //se valida que las referencias existan y pertenezcan a la misma empresa
            const existeTipoProducto = await TiposProducto.traerPorId({pId:idTipoProducto,pEmpId:idEmpresa});
            if(!existeTipoProducto){
                return res.status(400).json({msg:'Tipo de producto invalido'});
            }

            const existeCategoria = await Categorias.traerPorId({pId:idCategoria,pEmpId:idEmpresa});
            if(!existeCategoria){
                return res.status(400).json({msg:'Categoria invalida'});
            }

            const existeUnidadMedida = await UnidadesMedida.traerPorId({pId:idUnidadMedida,pEmpId:idEmpresa});
            if(!existeUnidadMedida){
                return res.status(400).json({msg:'Unidad de medida invalida'});
            }

            const existe = await Productos.traerPorNombre({pEmpId:idEmpresa,pNombre:vNombre});
            if(existe){
                return res.status(400).json({msg:"Producto ya existe"})
            }

            const newProducto = await Productos.crear({
                pEmpId:idEmpresa,
                pUsuIdCrea:UsuIdLogin,
                pNombre:vNombre,
                pDescripcion:vDescripcion,
                pTipoProductoId:idTipoProducto,
                pCategoriaId:idCategoria,
                pUnidadMedidaId:idUnidadMedida,
                pTipoSeguimiento:vTipoSeguimiento
            });

            if(newProducto>0){
                return res.status(200).json({msg:'Producto creado'});
            }else{
                return res.status(400).json({msg:'Error en insersión'});
            }

        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    editar:async(req,res)=>{
        try {

            const {idEmpresa,idProducto,Nombre,Descripcion,idTipoProducto,idCategoria,idUnidadMedida,TipoSeguimiento,Estado} = req.body;

            var vNombre = String(Nombre ?? '');
            var vTipoSeguimiento = String(TipoSeguimiento ?? '');
            var vDescripcion = String(Descripcion ?? '');
            var vEstado = true;
            
            

            vNombre = vNombre.toUpperCase().trim();
            vTipoSeguimiento = vTipoSeguimiento.toUpperCase().trim();
            vDescripcion = vDescripcion.trim();
       

            if(!Number.isInteger(idProducto) == true){
                return res.status(400).json({msg:'Producto invalido'});
            }

            if(!Number.isInteger(idTipoProducto) == true){
                return res.status(400).json({msg:'Tipo de producto invalido'});
            }

            if(!Number.isInteger(idCategoria) == true){
                return res.status(400).json({msg:'Categoria invalida'});
            }

            if(!Number.isInteger(idUnidadMedida) == true){
                return res.status(400).json({msg:'Unidad de medida invalida'});
            }

            if(Estado == true){
                vEstado = true;
            }else{
                vEstado = false;
            }

            const existeProducto = await Productos.traerPorId({pId:idProducto,pEmpId:idEmpresa});
            if(!existeProducto){
                return res.status(400).json({msg:'Producto invalido'});
            }
            

            const existeTipoProducto = await TiposProducto.traerPorId({pId:idTipoProducto,pEmpId:idEmpresa});
            if(!existeTipoProducto){
                return res.status(400).json({msg:'Tipo de producto invalido'});
            }

            if(existeProducto.proTipoProductoId !== idTipoProducto){
                if(existeTipoProducto.tipProEstado !== true){
                    return res.status(400).json({msg:'Producto inactivo'});
                }
            }
           

            const existeCategoria = await Categorias.traerPorId({pId:idCategoria,pEmpId:idEmpresa});
            if(!existeCategoria){
                return res.status(400).json({msg:'Categoria invalida'});
            }

            if(existeProducto.proCategoriaId !== idCategoria){
                if(existeCategoria.catEstado !== true){
                    return res.status(400).json({msg:'Categoria inactivo'});
                }
            }

            const existeUnidadMedida = await UnidadesMedida.traerPorId({pId:idUnidadMedida,pEmpId:idEmpresa});
            if(!existeUnidadMedida){
                return res.status(400).json({msg:'Unidad de medida invalida'});
            }

            if(existeProducto.proUnidadMedidaId !== idUnidadMedida){
                if(existeUnidadMedida.uniMedEstado !== true){
                    return res.status(400).json({msg:'Unidad de medida inactivo'});
                }
            }



            const existeNombre = await Productos.traerPorNombre({pEmpId:idEmpresa,pNombre:vNombre});

            if(existeNombre){
                if(existeNombre.Id !== idProducto){
                    return res.status(400).json({msg:'Producto ya existe'});
                }
            }

            const updateProducto = await Productos.editar({
                pEmpId:idEmpresa,
                pId:idProducto,
                pNombre:vNombre,
                pDescripcion:vDescripcion,
                pTipoProductoId:idTipoProducto,
                pCategoriaId:idCategoria,
                pUnidadMedidaId:idUnidadMedida,
                pTipoSeguimiento:vTipoSeguimiento,
                pEstado:vEstado
            });

            if(updateProducto > 0){
                return res.status(200).json({msg:'Producto actualizado'});
            }else{
                return res.status(400).json({msg:'Error en actualización'});
            }

        } catch (error) {
            let mensaje = String(error);
            return res.status(500).json({msg:mensaje});
        }
    },

    listarTodas: async(req,res)=>{
        try {
            const {idEmpresa,campoOrdenar,orden,pagina,textoFiltro} = req.body;

            var vPagina = Number(pagina);
            var vOrden = '';
            var vCampoOrdenar = '';
            var vTextoFiltro = '';

            if(orden === 'DESC'){
                vOrden = 'DESC';
            }else{
                vOrden = 'ASC';
            }

            switch (campoOrdenar) {
                case 1:
                    vCampoOrdenar = 'Nombre';
                    break;
                case 2:
                    vCampoOrdenar = 'FechaCreacion';
                    break;
                default:
                    vCampoOrdenar = 'Nombre';
                    break;
            }

            //el campo que selecciona para ordenar es el mismo que usa para filtrar los registros que tengan caracteres iguales a los de textoFiltro
            //la fecha no es texto por eso se invalida
            if (campoOrdenar == 2){
                vTextoFiltro = "%%";
            }else{

                if(textoFiltro === undefined || !textoFiltro || textoFiltro.trim().length === 0){
                    vTextoFiltro = "%%";
                }else{
                    vTextoFiltro = String(textoFiltro);
                    vTextoFiltro = vTextoFiltro.trim();
                    vTextoFiltro = "%"+vTextoFiltro+"%";
                }
            }

            const cantProductos = await Productos.contarTodoFiltro({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pTexto:vTextoFiltro})

            const maxPagina = Math.ceil(cantProductos/50);

            if (vPagina>maxPagina){
                vPagina = maxPagina;
            }

            if(vPagina<1){
                vPagina = 1;
            }

            const vOffset = (vPagina - 1) * 50;

            const productos = await Productos.traerTodo({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pOffset:vOffset,pTexto:vTextoFiltro})

            return res.status(200).json({cantData:cantProductos,data:productos});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    //activos ahora paginado igual que listarTodas, ya que una empresa puede tener muchos productos
    listarActivas: async(req,res)=>{
        try {
            const {idEmpresa,campoOrdenar,orden,pagina,textoFiltro} = req.body;

            var vPagina = Number(pagina);
            var vOrden = '';
            var vCampoOrdenar = '';
            var vTextoFiltro = '';

            if(orden === 'DESC'){
                vOrden = 'DESC';
            }else{
                vOrden = 'ASC';
            }

            switch (campoOrdenar) {
                case 1:
                    vCampoOrdenar = 'Nombre';
                    break;
                case 2:
                    vCampoOrdenar = 'FechaCreacion';
                    break;
                default:
                    vCampoOrdenar = 'Nombre';
                    break;
            }

            if (campoOrdenar == 2){
                vTextoFiltro = "%%";
            }else{

                if(textoFiltro === undefined || !textoFiltro || textoFiltro.trim().length === 0){
                    vTextoFiltro = "%%";
                }else{
                    vTextoFiltro = String(textoFiltro);
                    vTextoFiltro = vTextoFiltro.trim();
                    vTextoFiltro = "%"+vTextoFiltro+"%";
                }
            }

            const cantProductos = await Productos.contarActivasFiltro({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pTexto:vTextoFiltro})

            const maxPagina = Math.ceil(cantProductos/50);

            if (vPagina>maxPagina){
                vPagina = maxPagina;
            }

            if(vPagina<1){
                vPagina = 1;
            }

            const vOffset = (vPagina - 1) * 50;

            const productos = await Productos.traerActivas({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pOffset:vOffset,pTexto:vTextoFiltro})

            return res.status(200).json({cantData:cantProductos,data:productos});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarPorId : async(req,res)=>{
        try {
            const {idEmpresa,idProducto} = req.body;

            const producto = await Productos.traerPorId({pId:idProducto,pEmpId:idEmpresa})

            return res.status(200).json({data:producto});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    }
};

export default productosControllers;
