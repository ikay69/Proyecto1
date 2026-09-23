import Terceros from '../Models/terceros.js';
import TiposDocumento from '../Models/tiposDocumento.js';


const tercerosControllers = {
    //crear tercero
    crear:async(req,res)=>{
        try {
            const {idEmpresa,Nombre,Apellidos,idTipoDocumento,NumeroDocumento,Celular,Email,Direccion} = req.body;

            var vNombre = String(Nombre ?? '').trim();
            var vApellidos = String(Apellidos ?? '').trim();
            var vTipoDocumento = (idTipoDocumento === undefined || idTipoDocumento === null || idTipoDocumento === '') ? null : idTipoDocumento;
            var vNumeroDocumento = (NumeroDocumento === undefined || NumeroDocumento === null || String(NumeroDocumento).trim().length === 0) ? null : String(NumeroDocumento).trim();
            var vCelular = (Celular === undefined || Celular === null || String(Celular).trim().length === 0) ? null : String(Celular).trim();
            var vEmail = (Email === undefined || Email === null || String(Email).trim().length === 0) ? null : String(Email).trim();
            var vDireccion = (Direccion === undefined || Direccion === null || String(Direccion).trim().length === 0) ? null : String(Direccion).trim();
            var UsuIdLogin = req.usuario.Id;

            //si viene el tipo de documento se valida que exista
            if(vTipoDocumento !== null){
                if(!Number.isInteger(vTipoDocumento) == true){
                    return res.status(400).json({msg:'Tipo de documento invalido'});
                }

                const existeTipoDocumento = await TiposDocumento.traerPorId({pId:vTipoDocumento,pEmpId:idEmpresa});
                if(!existeTipoDocumento){
                    return res.status(400).json({msg:'Tipo de documento invalido'});
                }
            }

            //la combinacion empresa+tipoDocumento+numeroDocumento no debe existir
            if(vTipoDocumento !== null && vNumeroDocumento !== null){
                const existe = await Terceros.traerPorTipoYNumero({pEmpId:idEmpresa,pTipoDocumento:vTipoDocumento,pNumeroDocumento:vNumeroDocumento});
                if(existe){
                    return res.status(400).json({msg:"Ya existe un tercero con ese tipo y número de documento"})
                }
            }

            const newTercero = await Terceros.crear({
                pEmpId:idEmpresa,
                pUsuIdCrea:UsuIdLogin,
                pNombre:vNombre,
                pApellidos:vApellidos,
                pTipoDocumento:vTipoDocumento,
                pNumeroDocumento:vNumeroDocumento,
                pCelular:vCelular,
                pEmail:vEmail,
                pDireccion:vDireccion
            });

            if(newTercero>0){
                return res.status(200).json({msg:'Tercero creado'});
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

            const {idEmpresa,idTercero,Nombre,Apellidos,idTipoDocumento,NumeroDocumento,Celular,Email,Direccion,Estado} = req.body;

            var vNombre = String(Nombre ?? '').trim();
            var vApellidos = String(Apellidos ?? '').trim();
            var vTipoDocumento = (idTipoDocumento === undefined || idTipoDocumento === null || idTipoDocumento === '') ? null : idTipoDocumento;
            var vNumeroDocumento = (NumeroDocumento === undefined || NumeroDocumento === null || String(NumeroDocumento).trim().length === 0) ? null : String(NumeroDocumento).trim();
            var vCelular = (Celular === undefined || Celular === null || String(Celular).trim().length === 0) ? null : String(Celular).trim();
            var vEmail = (Email === undefined || Email === null || String(Email).trim().length === 0) ? null : String(Email).trim();
            var vDireccion = (Direccion === undefined || Direccion === null || String(Direccion).trim().length === 0) ? null : String(Direccion).trim();
            //Estado no llega obligatorio en terceros, por defecto se mantiene activo
            var vEstado = (Estado === undefined) ? true : (Estado == true);

            if(!Number.isInteger(idTercero) == true){
                return res.status(400).json({msg:'Tercero invalido'});
            }

            const existeTercero = await Terceros.traerPorId({pId:idTercero,pEmpId:idEmpresa});
            if(!existeTercero){
                return res.status(400).json({msg:'Tercero invalido'});
            }

            if(vTipoDocumento !== null){
                if(!Number.isInteger(vTipoDocumento) == true){
                    return res.status(400).json({msg:'Tipo de documento invalido'});
                }

                const existeTipoDocumento = await TiposDocumento.traerPorId({pId:vTipoDocumento,pEmpId:idEmpresa});
                if(!existeTipoDocumento){
                    return res.status(400).json({msg:'Tipo de documento invalido'});
                }
               
                // si no se acutaliza tipo documento no validarlo
                if(existeTercero.terTipDocId !== vTipoDocumento){
                    if (existeTipoDocumento.tipDocEstado == 0) {
                         return res.status(400).json({msg:'Tipo de documento inactivo'});
                    }
                }
            }

            if(vTipoDocumento !== null && vNumeroDocumento !== null){
                const existe = await Terceros.traerPorTipoYNumero({pEmpId:idEmpresa,pTipoDocumento:vTipoDocumento,pNumeroDocumento:vNumeroDocumento});
                if(existe){
                    if(existe.Id !== idTercero){
                        return res.status(400).json({msg:'Ya existe un tercero con ese tipo y número de documento'});
                    }
                }
            }

            const updateTercero = await Terceros.editar({
                pEmpId:idEmpresa,
                pId:idTercero,
                pNombre:vNombre,
                pApellidos:vApellidos,
                pTipoDocumento:vTipoDocumento,
                pNumeroDocumento:vNumeroDocumento,
                pCelular:vCelular,
                pEmail:vEmail,
                pDireccion:vDireccion,
                pEstado:vEstado
            });

            if(updateTercero > 0){
                return res.status(200).json({msg:'Tercero actualizado'});
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
                    vCampoOrdenar = 'Apellidos';
                    break;
                case 3:
                    vCampoOrdenar = 'NumeroDocumento';
                    break;
                case 4:
                    vCampoOrdenar = 'Email';
                    break;
                case 5:
                    vCampoOrdenar = 'FechaCreacion';
                    break;
                default:
                    vCampoOrdenar = 'Nombre';
                    break;
            }

            //el campo que selecciona para ordenar es el mismo que usa para filtrar los registros que tengan caracteres iguales a los de textoFiltro
            //la fecha no es texto por eso se invalida
            if (campoOrdenar == 5){
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

            const cantTerceros = await Terceros.contarTodoFiltro({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pTexto:vTextoFiltro})

            const maxPagina = Math.ceil(cantTerceros/50);

            if (vPagina>maxPagina){
                vPagina = maxPagina;
            }

            if(vPagina<1){
                vPagina = 1;
            }

            const vOffset = (vPagina - 1) * 50;

            const terceros = await Terceros.traerTodo({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pOffset:vOffset,pTexto:vTextoFiltro})

            return res.status(200).json({cantData:cantTerceros,data:terceros});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

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
                    vCampoOrdenar = 'Apellidos';
                    break;
                case 3:
                    vCampoOrdenar = 'NumeroDocumento';
                    break;
                case 4:
                    vCampoOrdenar = 'Email';
                    break;
                case 5:
                    vCampoOrdenar = 'FechaCreacion';
                    break;
                default:
                    vCampoOrdenar = 'Nombre';
                    break;
            }

            //el campo que selecciona para ordenar es el mismo que usa para filtrar los registros que tengan caracteres iguales a los de textoFiltro
            //la fecha no es texto por eso se invalida
            if (campoOrdenar == 5){
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

            const cantTerceros = await Terceros.contarActivivosFiltro({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pTexto:vTextoFiltro})

            const maxPagina = Math.ceil(cantTerceros/50);

            if (vPagina>maxPagina){
                vPagina = maxPagina;
            }

            if(vPagina<1){
                vPagina = 1;
            }

            const vOffset = (vPagina - 1) * 50;

            const terceros = await Terceros.traerActivas({pEmpId:idEmpresa,pCampoOrden:vCampoOrdenar,pOrden:vOrden,pOffset:vOffset,pTexto:vTextoFiltro})

            return res.status(200).json({cantData:cantTerceros,data:terceros});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    },

    listarPorId : async(req,res)=>{
        try {
            const {idEmpresa,idTercero} = req.body;
            var usuarioRolLogin = req.usuario.Rol

            const tercero = await Terceros.traerPorId({pId:idTercero,pEmpId:idEmpresa})

            if(usuarioRolLogin!=='ADMINISTRADOR'){
                delete tercero.usuario;
            }


            return res.status(200).json({data:tercero});
        } catch (error) {
            let mensaje = String(error)
            return res.status(500).json({msg:mensaje});
        }
    }
};

export default tercerosControllers;
