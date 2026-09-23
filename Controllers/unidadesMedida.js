import UnidadesMedida from '../Models/unidadesMedida.js';


const unidadesMedidaControllers = {
    //crear unidad medida
    crear:async(req,res)=>{
        try {
            const {idEmpresa,Nombre,Simbolo} = req.body;

            var vNombre = String(Nombre);
            var vSimbolo = String(Simbolo);
            var UsuIdLogin = req.usuario.Id;

            vNombre = vNombre.toUpperCase().trim();
            vSimbolo = vSimbolo.trim();
          
            const existe = await UnidadesMedida.traerPorNombre({pEmpId:idEmpresa,pNombre:vNombre});
            if(existe){
                return res.status(400).json({msg:"Unidad de medida ya existe"})
            }

            const newunidadmedida = await UnidadesMedida.crear({pEmpId:idEmpresa,pUsuIdCrea:UsuIdLogin,pNombre:vNombre,pSimbolo:vSimbolo});
            
            if(newunidadmedida>0){
                return res.status(200).json({msg:'Unidad de medida creada'});
            }else{
                return res.status(400).json({msg:'Error en insersión'});
            }



        } catch (error) {
            // error.message
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    editar:async(req,res)=>{
        try {

            const {idEmpresa,idUnidadMedida,Nombre,Simbolo,Estado} = req.body;
            
            var vNombre = String(Nombre);
            var vSimbolo = String(Simbolo);
            var vEstado = true;
            

            vNombre = vNombre.toUpperCase().trim();
            vSimbolo = vSimbolo.trim();


            if(!Number.isInteger(idUnidadMedida) == true){
                return res.status(400).json({msg:'Unidad de medida invalida'});
            }
            

            if(Estado == true){
                vEstado = true;
            }else{
                vEstado = false;
            }
    

            const existeUnidadMedida = await UnidadesMedida.traerPorId({pId:idUnidadMedida,pEmpId:idEmpresa});
            if(!existeUnidadMedida){
                return res.status(400).json({msg:'Unidad de medida invalida'});
            }
           
            const existeNombre = await UnidadesMedida.traerPorNombre({pEmpId:idEmpresa,pNombre:vNombre});
            
            if(existeNombre){
                if(existeNombre.Id !== idUnidadMedida){
                    return res.status(400).json({msg:'Unidad de medida ya existe'});
                }
            }

            
            const updateUnidadMedida = await UnidadesMedida.editar({pEmpId:idEmpresa,pId:idUnidadMedida,pNombre:vNombre,pSimbolo:vSimbolo,pEstado:vEstado});
            
            
            if(updateUnidadMedida > 0){
                return res.status(200).json({msg:'Unidad de medida actualizada'});
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
                    vCampoOrdenar = 'Simbolo';
                    break;
                case 3:
                    vCampoOrdenar = 'FechaCreacion';
                    break;
                default:
                    vCampoOrdenar = 'Nombre';
                    break;
            }
            
            //el campo que selecciona para ordenar es el mismo que usa para filtrar los registrar que tengan caracters iguales a los de textoFiltro
            //la fecha no es texto por eso se invalida
            if (campoOrdenar == 3){ 
                vTextoFiltro = "'%%'";
            }else{

                if(textoFiltro === undefined || !textoFiltro || textoFiltro.trim().length === 0){
                    vTextoFiltro = "'%%'";
                }else{
                    vTextoFiltro = String(textoFiltro);
                    vTextoFiltro = vTextoFiltro.trim();
                    vTextoFiltro = "'%"+vTextoFiltro+"%'"
                }
            }
            
            

            const cantUnidadesMedida = await UnidadesMedida.contarTodoFiltro({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pTexto:vTextoFiltro})
           
            const maxPagina = Math.ceil(cantUnidadesMedida/50);
            
            if (vPagina>maxPagina){
                vPagina = maxPagina;
            }
            
            if(vPagina<1){
                vPagina = 1;
            }
            
            const vOffset = (vPagina - 1) * 50;

            const unidadesMedida = await UnidadesMedida.traerTodo({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pOffset:vOffset,pTexto:vTextoFiltro})
            
            
            return res.status(200).json({cantData:cantUnidadesMedida,data:unidadesMedida});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarActivas: async(req,res)=>{
        try {

            const {idEmpresa} = req.body;

            const unidadesMedida = await UnidadesMedida.traerActivas({pEmpId:idEmpresa});

            return res.status(200).json({data:unidadesMedida});
        } catch (error) {
            return res.status(500).json({msg:error});
        }
    },

    listarPorId : async(req,res)=>{
        try {
            const {idEmpresa,idUnidadMedida} = req.body;

            const unidadMedida = await UnidadesMedida.traerPorId({pId:idUnidadMedida,pEmpId:idEmpresa})

            return res.status(200).json({data:unidadMedida});
        } catch (error) {
            return res.status(500).json({msg:error});
        }
    }
};

export default unidadesMedidaControllers;