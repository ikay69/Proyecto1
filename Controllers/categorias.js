import Categorias from '../Models/categorias.js';


const categoriasControllers = {
    //crear categoria
    crear:async(req,res)=>{
        try {
            const {idEmpresa,Nombre} = req.body;

            var vNombre = String(Nombre ?? '');
            var UsuIdLogin = req.usuario.Id;

            vNombre = vNombre.toUpperCase().trim();

            const existe = await Categorias.traerPorNombre({pEmpId:idEmpresa,pNombre:vNombre});
            if(existe){
                return res.status(400).json({msg:"Categoria ya existe"})
            }

            const newCategoria = await Categorias.crear({pEmpId:idEmpresa,pUsuIdCrea:UsuIdLogin,pNombre:vNombre});

            if(newCategoria>0){
                return res.status(200).json({msg:'Categoria creada'});
            }else{
                return res.status(401).json({msg:'Error en insersión'});
            }

        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    editar:async(req,res)=>{
        try {

            const {idEmpresa,idCategoria,Nombre,Estado} = req.body;

            var vNombre = String(Nombre ?? '');
            var vEstado = true;

            vNombre = vNombre.toUpperCase().trim();

            if(!Number.isInteger(idCategoria) == true){
                return res.status(401).json({msg:'Categoria invalida'});
            }

            if(Estado == true){
                vEstado = true;
            }else{
                vEstado = false;
            }

            const existeCategoria = await Categorias.traerPorId({pId:idCategoria,pEmpId:idEmpresa});
            if(!existeCategoria){
                return res.status(401).json({msg:'Categoria invalida'});
            }

            const existeNombre = await Categorias.traerPorNombre({pEmpId:idEmpresa,pNombre:vNombre});

            if(existeNombre){
                if(existeNombre.Id !== idCategoria){
                    return res.status(401).json({msg:'Categoria ya existe'});
                }
            }

            const updateCategoria = await Categorias.editar({pEmpId:idEmpresa,pId:idCategoria,pNombre:vNombre,pEstado:vEstado});

            if(updateCategoria > 0){
                return res.status(200).json({msg:'Categoria actualizada'});
            }else{
                return res.status(401).json({msg:'Error en actualización'});
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

            const cantCategorias = await Categorias.contarTodoFiltro({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pTexto:vTextoFiltro})

            const maxPagina = Math.ceil(cantCategorias/50);

            if (vPagina>maxPagina){
                vPagina = maxPagina;
            }

            if(vPagina<1){
                vPagina = 1;
            }

            const vOffset = (vPagina - 1) * 50;

            const categorias = await Categorias.traerTodo({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pOffset:vOffset,pTexto:vTextoFiltro})

            return res.status(200).json({cantData:cantCategorias,data:categorias});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarActivas: async(req,res)=>{
        try {

            const {idEmpresa} = req.body;

            const categorias = await Categorias.traerActivas({pEmpId:idEmpresa});

            return res.status(200).json({data:categorias});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarPorId : async(req,res)=>{
        try {
            const {idEmpresa,idCategoria} = req.body;

            const categoria = await Categorias.traerPorId({pId:idCategoria,pEmpId:idEmpresa})

            if(categoria){
                return res.status(200).json({data:categoria});
            }else{
                return res.status(401).json({data:"Categoría no existe"});
            }
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    }
};

export default categoriasControllers;
