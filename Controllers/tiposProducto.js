import TiposProducto from '../Models/tiposProducto.js';


const tiposProductoControllers = {
    //crear tipo de producto
    crear:async(req,res)=>{
        try {
            const {idEmpresa,Nombre} = req.body;

            var vNombre = String(Nombre ?? '');
            var UsuIdLogin = req.usuario.Id;

            vNombre = vNombre.toUpperCase().trim();

            const existe = await TiposProducto.traerPorNombre({pEmpId:idEmpresa,pNombre:vNombre});
            if(existe){
                return res.status(400).json({msg:"Tipo de producto ya existe"})
            }

            const newTipoProducto = await TiposProducto.crear({pEmpId:idEmpresa,pUsuIdCrea:UsuIdLogin,pNombre:vNombre});

            if(newTipoProducto>0){
                return res.status(200).json({msg:'Tipo de producto creado'});
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

            const {idEmpresa,idTipoProducto,Nombre,Estado} = req.body;

            var vNombre = String(Nombre ?? '');
            var vEstado = true;

            vNombre = vNombre.toUpperCase().trim();

            if(!Number.isInteger(idTipoProducto) == true){
                return res.status(401).json({msg:'Tipo de producto invalido'});
            }

            if(Estado == true){
                vEstado = true;
            }else{
                vEstado = false;
            }


            const existeTipoProducto = await TiposProducto.traerPorId({pId:idTipoProducto,pEmpId:idEmpresa});
            if(!existeTipoProducto){
                return res.status(401).json({msg:'Tipo de producto invalido'});
            }

            const existeNombre = await TiposProducto.traerPorNombre({pEmpId:idEmpresa,pNombre:vNombre});

            if(existeNombre){
                if(existeNombre.Id !== idTipoProducto){
                    return res.status(401).json({msg:'Tipo de producto ya existe'});
                }
            }

            const updateTipoProducto = await TiposProducto.editar({pEmpId:idEmpresa,pId:idTipoProducto,pNombre:vNombre,pEstado:vEstado});

            if(updateTipoProducto > 0){
                return res.status(200).json({msg:'Tipo de producto actualizado'});
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

            const cantTiposProducto = await TiposProducto.contarTodoFiltro({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pTexto:vTextoFiltro})

            const maxPagina = Math.ceil(cantTiposProducto/50);

            if (vPagina>maxPagina){
                vPagina = maxPagina;
            }

            if(vPagina<1){
                vPagina = 1;
            }

            const vOffset = (vPagina - 1) * 50;

            const tiposProducto = await TiposProducto.traerTodo({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pOffset:vOffset,pTexto:vTextoFiltro})

            return res.status(200).json({cantData:cantTiposProducto,data:tiposProducto});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarActivas: async(req,res)=>{
        try {

            const {idEmpresa} = req.body;

            const tiposProducto = await TiposProducto.traerActivas({pEmpId:idEmpresa});

            return res.status(200).json({data:tiposProducto});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarPorId : async(req,res)=>{
        try {
            const {idEmpresa,idTipoProducto} = req.body;

            const tipoProducto = await TiposProducto.traerPorId({pId:idTipoProducto,pEmpId:idEmpresa})

            return res.status(200).json({data:tipoProducto});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    }
};

export default tiposProductoControllers;
