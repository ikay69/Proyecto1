import Bodegas from '../Models/bodegas.js';


const bodegasControllers = {
    //crear bodega
    crear:async(req,res)=>{
        try {
            const {idEmpresa,Nombre} = req.body;

            var vNombre = String(Nombre ?? '');
            var UsuIdLogin = req.usuario.Id;

            vNombre = vNombre.toUpperCase().trim();

            const existe = await Bodegas.traerPorNombre({pEmpId:idEmpresa,pNombre:vNombre});
            if(existe){
                return res.status(400).json({msg:"Bodega ya existe"})
            }

            const newBodega = await Bodegas.crear({pEmpId:idEmpresa,pUsuIdCrea:UsuIdLogin,pNombre:vNombre});

            if(newBodega>0){
                return res.status(200).json({msg:'Bodega creada'});
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

            const {idEmpresa,idBodega,Nombre,Estado} = req.body;

            var vNombre = String(Nombre ?? '');
            var vEstado = true;

            vNombre = vNombre.toUpperCase().trim();

            if(!Number.isInteger(idBodega) == true){
                return res.status(401).json({msg:'Bodega invalida'});
            }

            if(Estado == true){
                vEstado = true;
            }else{
                vEstado = false;
            }

            const existeBodega = await Bodegas.traerPorId({pId:idBodega,pEmpId:idEmpresa});
            if(!existeBodega){
                return res.status(401).json({msg:'Bodega invalida'});
            }

            const existeNombre = await Bodegas.traerPorNombre({pEmpId:idEmpresa,pNombre:vNombre});

            if(existeNombre){
                if(existeNombre.Id !== idBodega){
                    return res.status(401).json({msg:'Bodega ya existe'});
                }
            }

            const updateBodega = await Bodegas.editar({pEmpId:idEmpresa,pId:idBodega,pNombre:vNombre,pEstado:vEstado});

            if(updateBodega > 0){
                return res.status(200).json({msg:'Bodega actualizada'});
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

            const cantBodegas = await Bodegas.contarTodoFiltro({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pTexto:vTextoFiltro})

            const maxPagina = Math.ceil(cantBodegas/50);

            if (vPagina>maxPagina){
                vPagina = maxPagina;
            }

            if(vPagina<1){
                vPagina = 1;
            }

            const vOffset = (vPagina - 1) * 50;

            const bodegas = await Bodegas.traerTodo({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pOffset:vOffset,pTexto:vTextoFiltro})

            return res.status(200).json({cantData:cantBodegas,data:bodegas});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarActivas: async(req,res)=>{
        try {

            const {idEmpresa} = req.body;

            const bodegas = await Bodegas.traerActivas({pEmpId:idEmpresa});

            return res.status(200).json({data:bodegas});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarPorId : async(req,res)=>{
        try {
            const {idEmpresa,idBodega} = req.body;

            const bodega = await Bodegas.traerPorId({pId:idBodega,pEmpId:idEmpresa})

            if(bodega){
                return res.status(200).json({data:bodega});
            }else{
                return res.status(401).json({data:"Bodega no existe"});
            }
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    }
};

export default bodegasControllers;
