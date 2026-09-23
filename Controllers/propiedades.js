import Propiedades from '../Models/propiedades.js';


const propiedadesControllers = {
    //crear propiedad
    crear:async(req,res)=>{
        try {
            const {idEmpresa,Nombre,TipoDato} = req.body;

            var vNombre = String(Nombre ?? '');
            var vTipoDato = String(TipoDato ?? '');
            var UsuIdLogin = req.usuario.Id;

            vNombre = vNombre.toUpperCase().trim();
            vTipoDato = vTipoDato.toUpperCase().trim();

            const existe = await Propiedades.traerPorNombre({pEmpId:idEmpresa,pNombre:vNombre});
            if(existe){
                return res.status(400).json({msg:"Propiedad ya existe"})
            }

            const newPropiedad = await Propiedades.crear({pEmpId:idEmpresa,pUsuIdCrea:UsuIdLogin,pNombre:vNombre,pTipoDato:vTipoDato});

            if(newPropiedad>0){
                return res.status(200).json({msg:'Propiedad creada'});
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

            const {idEmpresa,idPropiedad,Nombre,TipoDato,Estado} = req.body;

            var vNombre = String(Nombre ?? '');
            var vTipoDato = String(TipoDato ?? '');
            var vEstado = true;

            vNombre = vNombre.toUpperCase().trim();
            vTipoDato = vTipoDato.toUpperCase().trim();

            if(!Number.isInteger(idPropiedad) == true){
                return res.status(400).json({msg:'Propiedad invalida'});
            }

            if(Estado == true){
                vEstado = true;
            }else{
                vEstado = false;
            }

            const existePropiedad = await Propiedades.traerPorId({pId:idPropiedad,pEmpId:idEmpresa});
            if(!existePropiedad){
                return res.status(400).json({msg:'Propiedad invalida'});
            }

            const existeNombre = await Propiedades.traerPorNombre({pEmpId:idEmpresa,pNombre:vNombre});

            if(existeNombre){
                if(existeNombre.Id !== idPropiedad){
                    return res.status(400).json({msg:'Propiedad ya existe'});
                }
            }

            const updatePropiedad = await Propiedades.editar({pEmpId:idEmpresa,pId:idPropiedad,pNombre:vNombre,pTipoDato:vTipoDato,pEstado:vEstado});

            if(updatePropiedad > 0){
                return res.status(200).json({msg:'Propiedad actualizada'});
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
                    vCampoOrdenar = 'TipoDato';
                    break;
                case 3:
                    vCampoOrdenar = 'FechaCreacion';
                    break;
                default:
                    vCampoOrdenar = 'Nombre';
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

            const cantPropiedades = await Propiedades.contarTodoFiltro({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pTexto:vTextoFiltro})

            const maxPagina = Math.ceil(cantPropiedades/50);

            if (vPagina>maxPagina){
                vPagina = maxPagina;
            }

            if(vPagina<1){
                vPagina = 1;
            }

            const vOffset = (vPagina - 1) * 50;

            const propiedades = await Propiedades.traerTodo({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pOffset:vOffset,pTexto:vTextoFiltro})

            return res.status(200).json({cantData:cantPropiedades,data:propiedades});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarActivas: async(req,res)=>{
        try {

            const {idEmpresa} = req.body;

            const propiedades = await Propiedades.traerActivas({pEmpId:idEmpresa});

            return res.status(200).json({data:propiedades});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarPorId : async(req,res)=>{
        try {
            const {idEmpresa,idPropiedad} = req.body;

            const propiedad = await Propiedades.traerPorId({pId:idPropiedad,pEmpId:idEmpresa})

            return res.status(200).json({data:propiedad});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    }
};

export default propiedadesControllers;
