import TiposDocumento from '../Models/tiposDocumento.js';


const tiposDocumentoControllers = {
    //crear tipo de documento
    crear:async(req,res)=>{
        try {
            const {idEmpresa,Abreviatura,Descripcion} = req.body;

            var vAbreviatura = String(Abreviatura ?? '');
            var vDescripcion = String(Descripcion ?? '');
            var UsuIdLogin = req.usuario.Id;

            vAbreviatura = vAbreviatura.toUpperCase().trim();
            vDescripcion = vDescripcion.toUpperCase().trim();

            const existe = await TiposDocumento.traerPorAbreviatura({pEmpId:idEmpresa,pAbreviatura:vAbreviatura});
            if(existe){
                return res.status(400).json({msg:"Tipo de documento ya existe"})
            }

            const newTipoDocumento = await TiposDocumento.crear({pEmpId:idEmpresa,pUsuIdCrea:UsuIdLogin,pAbreviatura:vAbreviatura,pDescripcion:vDescripcion});

            if(newTipoDocumento>0){
                return res.status(200).json({msg:'Tipo de documento creado'});
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

            const {idEmpresa,idTipoDocumento,Abreviatura,Descripcion,Estado} = req.body;

            var vAbreviatura = String(Abreviatura ?? '');
            var vDescripcion = String(Descripcion ?? '');
            var vEstado = true;

            vAbreviatura = vAbreviatura.toUpperCase().trim();
            vDescripcion = vDescripcion.toUpperCase().trim();

            if(!Number.isInteger(idTipoDocumento) == true){
                return res.status(400).json({msg:'Tipo de documento invalido'});
            }

            if(Estado == true){
                vEstado = true;
            }else{
                vEstado = false;
            }

            const existeTipoDocumento = await TiposDocumento.traerPorId({pId:idTipoDocumento,pEmpId:idEmpresa});
            if(!existeTipoDocumento){
                return res.status(400).json({msg:'Tipo de documento invalido'});
            }

            const existeAbreviatura = await TiposDocumento.traerPorAbreviatura({pEmpId:idEmpresa,pAbreviatura:vAbreviatura});

            if(existeAbreviatura){
                if(existeAbreviatura.Id !== idTipoDocumento){
                    return res.status(400).json({msg:'Tipo de documento ya existe'});
                }
            }

            const updateTipoDocumento = await TiposDocumento.editar({pEmpId:idEmpresa,pId:idTipoDocumento,pAbreviatura:vAbreviatura,pDescripcion:vDescripcion,pEstado:vEstado});

            if(updateTipoDocumento > 0){
                return res.status(200).json({msg:'Tipo de documento actualizado'});
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
                    vCampoOrdenar = 'Abreviatura';
                    break;
                case 2:
                    vCampoOrdenar = 'Descripcion';
                    break;
                case 3:
                    vCampoOrdenar = 'FechaCreacion';
                    break;
                default:
                    vCampoOrdenar = 'Abreviatura';
                    break;
            }

            //el campo que selecciona para ordenar es el mismo que usa para filtrar los registros que tengan caracteres iguales a los de textoFiltro
            //la fecha no es texto por eso se invalida
            if (campoOrdenar == 3){
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

            const cantTiposDocumento = await TiposDocumento.contarTodoFiltro({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pTexto:vTextoFiltro})

            const maxPagina = Math.ceil(cantTiposDocumento/50);

            if (vPagina>maxPagina){
                vPagina = maxPagina;
            }

            if(vPagina<1){
                vPagina = 1;
            }

            const vOffset = (vPagina - 1) * 50;

            const tiposDocumento = await TiposDocumento.traerTodo({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pOffset:vOffset,pTexto:vTextoFiltro})

            return res.status(200).json({cantData:cantTiposDocumento,data:tiposDocumento});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarActivas: async(req,res)=>{
        try {

            const {idEmpresa} = req.body;

            const tiposDocumento = await TiposDocumento.traerActivas({pEmpId:idEmpresa});

            return res.status(200).json({data:tiposDocumento});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarPorId : async(req,res)=>{
        try {
            const {idEmpresa,idTipoDocumento} = req.body;

            const tipoDocumento = await TiposDocumento.traerPorId({pId:idTipoDocumento,pEmpId:idEmpresa})

            if(tipoDocumento){
                return res.status(200).json({data:tipoDocumento});
            }else{
               return res.status(400).json({msg:"Tipo de documento no existe"});
            }
            
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    }
};

export default tiposDocumentoControllers;
