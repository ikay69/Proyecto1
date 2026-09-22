import Vendedores from '../Models/vendedores.js';


const vendedoresControllers = {
    //crear vendedor
    crear:async(req,res)=>{
        try {
            const {idEmpresa,Nombre} = req.body;

            var vNombre = String(Nombre ?? '');
            var UsuIdLogin = req.usuario.Id;

            vNombre = vNombre.toUpperCase().trim();

            const existe = await Vendedores.traerPorNombre({pEmpId:idEmpresa,pNombre:vNombre});
            if(existe){
                return res.status(400).json({msg:"Vendedor ya existe"})
            }

            const newVendedor = await Vendedores.crear({pEmpId:idEmpresa,pUsuIdCrea:UsuIdLogin,pNombre:vNombre});

            if(newVendedor>0){
                return res.status(200).json({msg:'Vendedor creado'});
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

            const {idEmpresa,idVendedor,Nombre,Estado} = req.body;

            var vNombre = String(Nombre ?? '');
            var vEstado = true;

            vNombre = vNombre.toUpperCase().trim();

            if(!Number.isInteger(idVendedor) == true){
                return res.status(401).json({msg:'Vendedor invalido'});
            }

            if(Estado == true){
                vEstado = true;
            }else{
                vEstado = false;
            }

            const existeVendedor = await Vendedores.traerPorId({pId:idVendedor,pEmpId:idEmpresa});
            if(!existeVendedor){
                return res.status(401).json({msg:'Vendedor invalido'});
            }

            const existeNombre = await Vendedores.traerPorNombre({pEmpId:idEmpresa,pNombre:vNombre});

            if(existeNombre){
                if(existeNombre.Id !== idVendedor){
                    return res.status(401).json({msg:'Vendedor ya existe'});
                }
            }

            const updateVendedor = await Vendedores.editar({pEmpId:idEmpresa,pId:idVendedor,pNombre:vNombre,pEstado:vEstado});

            if(updateVendedor > 0){
                return res.status(200).json({msg:'Vendedor actualizado'});
            }else{
                return res.status(401).json({msg:'Error en actualización'});
            }

        } catch (error) {
            let mensaje = String(error);
            return res.status(500).json({msg:mensaje});
        }
    },

    listarTodos: async(req,res)=>{
        try {
            const {idEmpresa,campoOrdenar,orden,pagina,textoFiltro,estadoFiltro} = req.body;

            var vPagina = Number(pagina);
            var vOrden = '';
            var vCampoOrdenar = '';
            var vTextoFiltro = '';
            var vEstado = -1;

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

            //estadoFiltro de la ruta: 0 o ausente = todos, 1 = activos, 2 = inactivos.
            //el modelo lo espera como -1 = todos, 1 = activo, 0 = inactivo, porque ahi el
            //valor se compara contra la columna Estado, que es booleana.
            switch (estadoFiltro) {
                case 1:
                    vEstado = 1;
                    break;
                case 2:
                    vEstado = 0;
                    break;
                default:
                    vEstado = -1;
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

            const cantVendedores = await Vendedores.contarTodoFiltro({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pTexto:vTextoFiltro,pEstado:vEstado})

            const maxPagina = Math.ceil(cantVendedores/50);

            if (vPagina>maxPagina){
                vPagina = maxPagina;
            }

            if(vPagina<1){
                vPagina = 1;
            }

            const vOffset = (vPagina - 1) * 50;

            const vendedores = await Vendedores.traerTodo({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pOffset:vOffset,pTexto:vTextoFiltro,pEstado:vEstado})

            return res.status(200).json({cantData:cantVendedores,data:vendedores});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarActivos: async(req,res)=>{
        try {

            const {idEmpresa} = req.body;

            const vendedores = await Vendedores.traerActivos({pEmpId:idEmpresa});

            return res.status(200).json({data:vendedores});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarPorId : async(req,res)=>{
        try {
            const {idEmpresa,idVendedor} = req.body;

            const vendedor = await Vendedores.traerPorId({pId:idVendedor,pEmpId:idEmpresa})

            if(vendedor){
                return res.status(200).json({data:vendedor});
            }else{
                return res.status(401).json({data:"Vendedor no existe"});
            }
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    }
};

export default vendedoresControllers;
