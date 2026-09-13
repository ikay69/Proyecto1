import bcryptjs from 'bcryptjs';
import Usuario from "../Models/usuario.js";
import UsuariosEmpresa from '../Models/usuariosEmpesa.js';
import {
    userValidarPass,
    userValidarNombre
} from '../Helpers/usuario.js';


const usuarioControllers = {

    //crear usuario falta 
    crear:async (req,res)=>{
        try {

            const {nombres,apellidos,user,password,rol} = req.body;


            var pNombres = String(nombres);
            var pApellidos = String(apellidos);
            var pUserName = String(user);
            var pPassword = String(password);
            var pRol = String(rol);
            var pEmpId = req.empresa.Id

            pNombres = pNombres.toUpperCase().trim();
            pApellidos = pApellidos.toUpperCase().trim();
            pUserName = pUserName.toUpperCase().trim();
            pPassword = pPassword.trim();
            pRol = pRol.toUpperCase().trim();
           

            if(pPassword.length === 0 || !pPassword || pPassword === undefined){
                res.status(401).json({ msg: 'Error en contraseña'});
            }
            
            if(pPassword.length > 11){
                res.status(401).json({ msg: 'Error en contraseña max 10 caracteres'});
            }

            if(pUserName.length > 51){
                return res.status(401).json({msg:"Nombre de usuario supero 50 caracteres"})
            }

            if(pRol !== 'ADMINISTRADOR' && pRol !== 'VENDEDOR'){
                res.status(401).json({ msg: 'Error en usuario'});
            }

            if(pNombres.length > 151 || pApellidos.length > 151){
                res.status(401).json({ msg: 'Nombre y apellido invalido (max 150)'});
            }
            
            if(pNombres.length === 0 || !pNombres || pNombres === undefined){
                res.status(401).json({ msg: 'Nombre obligatorio'});
            }

            if(pApellidos.length === 0 || !pApellidos || pApellidos === undefined){
                res.status(401).json({ msg: 'Nombre obligatorio'});
            }

            const usuarioExiste = await Usuario.buscarPorUsername(pUserName);
            //console.log('control usuario crear 54 ',usuarioExiste);
            if (usuarioExiste) {
                return res.status(401).json({mag:'Usuario, ya existe'} );
            }


            const salt2 = bcryptjs.genSaltSync(2);
            const hash2 = bcryptjs.hashSync(pPassword,salt2);

            const usuario = await Usuario.crear({pUserName, pPassword:hash2, pNombres, pApellidos, pRol})
            //console.log('usuario control crea usuario:',usuario)

            if(usuario>0){

                const usuariosempresa = await UsuariosEmpresa.crear({pEmpresaId:pEmpId,pUsuarioId:usuario})

                let mensaje = 'Usuario creado';
                return res.status(200).json({ msg: mensaje});
            }else{
                let mensaje = 'Error en la operación';
                return res.status(401).json({ msg: mensaje});
            }

        } catch (error) {
            
            res.status(500).json({ msg: error.message || 'Error interno del servidor'});
        }
    },

    //listar usuarios con y sin empresa
    listarTodosUsuarios:async (req,res)=>{
        try {
            const {pagina} = req.body;

            var vpagina = pagina
            if(Number.isInteger(vpagina) !== true){
                vpagina = 1
            }

            const cantUsuarios = await Usuario.CantTotalUsuarios();

            const maxPagina = Math.ceil(cantUsuarios/50);
            if (vpagina>maxPagina){
                vpagina = maxPagina
            }
          
            const offset = (vpagina - 1) * 50;
           
            const usuario  = await  Usuario.traerTodosUsuarios({pPagina:offset});
       
            return res.status(200).json({data:usuario,cantData:cantUsuarios});
        } catch (error) {
            return res.status(500).json({msg:error.message || 'Error interno del servidor'})
        }
    },

    //cambiar password usuario falta
    cambiarPass :async (req,res)=>{
        try {

            const {pass,passNew,idUsuario} = req.body;
            //console.log('control usuaro cambio pass 130 ',usuarioEmpresa)
       
            var vPass = String(pass)
            var vpassNew = String(passNew)
            var usuarioLogin = req.usuario.Id;
            var usuarioRolLogin  = req.usuario.Rol;
            var empresaIdLogin = req.empresa.Id;

            vPass = vPass.trim();
            vpassNew = vpassNew.trim();

            if(!Number.isInteger(idUsuario) == true){
                return res.status(401).json({msg:'Usuario invalida'});
            }

            const usuarioEmpresa = await UsuariosEmpresa.validarRelacion({pEmpresaId:empresaIdLogin,pUsuarioId:idUsuario});
            
            if(!usuarioEmpresa){
                return res.status(400).json({msg:"No existe relacion entre usuario y empresa"})
            }

            if(!usuarioEmpresa.Estado){
                return res.status(400).json({msg:"No existe relacion activa entre usuario y empresa"})
            }

            

            var valido = await userValidarPass(vPass);
            if(valido !== true){
                return res.status(401).json({msg:valido});
            }

            valido = await userValidarPass(vpassNew);
            if(valido !== true){
                return res.status(401).json({msg:valido});
            }
            
            const usuarioCambiarPass = await Usuario.buscarPorId(idUsuario);
            if(!usuarioCambiarPass){
                return res.status(401).json({msg:'usuario invalido'});
            }
            
            // si el usuario logueado no es admnistrador y no es el mismo a cambiar la contraseña, no lo dejara
            
            if (usuarioRolLogin !== 'ADMINISTRADOR' && usuarioLogin !== idUsuario){
                return res.status(401).json({msg:'No tiene permisos'})
            }
            

            if (usuarioRolLogin !== 'ADMINISTRADOR'  && usuarioLogin === idUsuario){
                const passwordCorrecta = await bcryptjs.compareSync(vPass, usuarioCambiarPass.Pass);
                if (!passwordCorrecta) {
                    return res.status(401).json({ msg: 'Contraseña incorrectos' });
                }
            }

            //console.log('control usuaro cambio pass 159 ')

            const salt2 = bcryptjs.genSaltSync(2);
            const hash2 = bcryptjs.hashSync(vpassNew,salt2);
            const cambio = await Usuario.cambiarPass({pId:idUsuario,pPass:hash2})
            
            return res.status(201).json({msg:'contraseña actualizada'})

        } catch (error) {
            res.status(401).json({ msg: error.message || 'Error interno del servidor'});
        }
    },

    //actualizar datos usuario falta
    actualizar:async (req,res)=>{
        try {
            const {idUsuario,nombres,apellidos,user,rol} = req.body;

            if(!Number.isInteger(idUsuario) == true){
                return res.status(401).json({msg:'Usuario invalida'});
            }

            var empresaIdLogin = req.empresa.Id

            var pNombres = String(nombres);
            var pApellidos = String(apellidos);
            var pUserName = String(user);
            var pRol = String(rol);
            

            pNombres = pNombres.toUpperCase().trim();
            pApellidos = pApellidos.toUpperCase().trim();
            pUserName = pUserName.toUpperCase().trim();
            pRol = pRol.toUpperCase().trim();


            const usuarioCambiarDatos = await Usuario.buscarPorId(idUsuario);
            if(!usuarioCambiarDatos){
                return res.status(401).json({msg:'usuario invalido'});
            }

            const usuarioEmpresa = await UsuariosEmpresa.validarRelacion({pEmpresaId:empresaIdLogin,pUsuarioId:idUsuario});
            if(!usuarioEmpresa){
                return res.status(400).json({msg:"No existe relacion entre usuario y empresa"})
            }

            if(!usuarioEmpresa.Estado){
                return res.status(400).json({msg:"No existe relacion activa entre usuario y empresa"})
            }

            var valido = await userValidarNombre(pNombres);
            if(!valido){
                return res.status(401).json({msg:valido});
            }

            valido = await userValidarNombre(pApellidos);
            if(!valido){
                return res.status(401).json({msg:valido});
            }

            if(pRol !=='ADMINISTRADOR' && pRol !== 'VENDEDOR'){
                return res.status(401).json({msg:'Rol invalido'})
            }

            const usuarioActualizar = await Usuario.buscarPorUsername(pUserName);
            if(usuarioActualizar){
                if(usuarioActualizar.Id !== idUsuario){
                    return res.status(400).json({msg:'Nombre de usuario ya existe'})
                }
            }

            const actualizar = await Usuario.actualizar({pNombres,pApellidos,pUserName,pRol,pId:idUsuario});

            return res.status(201).json({msg:'Datos actualizados'})
        } catch (error) {
            let mensaje = 'Error en la operación' + String(error);
            res.status(401).json({ msg: mensaje});
        }
    },


    //------------------------------------------------------
    
    //cambiar estado falta
    cambiarEstado:async (req,res)=>{
        try {

             
            
            const {id,estado,passEmp} = req.body;

            var passEmp1 = String(passEmp);
            const empresa = req.empresa

            

            if(Number.isInteger(id) !== true){
                return res.status(402).json({msg:'id invalido'});
            }

            if(typeof estado !== 'boolean'){
               return res.status(402).json({msg:'estado invalida'});
            }

            if(passEmp1.length > 15){
                return res.status(402).json({msg:'contraseña invalida Max 14 caractees'});
            }

            
            const passwordCorrecta = await bcryptjs.compareSync(passEmp1, empresa.Pass);
            if (!passwordCorrecta) {
                return res.status(401).json({ msg: 'Usuario, contraseña o clave de empresa incorrectos' });
            }
            

           
            const usuario = await Usuario.cambiarEstado({id:id,estado:estado})
           
            return res.status(201).json({msg:'Actualizado'})

        } catch (error) {
            let mensaje = 'Error en la operación' + String(error);
            res.status(401).json({ msg: mensaje});
        }
    },

    //eliminar usuario falta
    Eliminar:async (req,res)=>{
        try {



            return res.status(201).json({msg:'en proceso'})
        } catch (error) {
            let mensaje = 'Error en la operación' + String(error);
            res.status(401).json({ msg: mensaje});
        }
    },

    //listar usuarios falta
    ListarPorEmpresa:async(req,res)=>{
        try {

            //validarjwt 28 empresa: { Id: 1, Nombre: 'origen', Clave: 'origen', Estado: 1 }
            //validarjwt 28 user: { Id: 1, Rol: 'ADMINISTRADOR', Estado: 1 }
            
            const {pagina, numDatos,buscador,orden,menorMayor} = req.body;

            var empId = req.empresa.Id;
            var pPagina = pagina;
            var pNumDatos = numDatos;
            var pbuscador = `%${buscador.trim()}%`;
            var porden = 'Nombres';
            var  pdescAsc = menorMayor;

            if(menorMayor=='Asc'){
                pdescAsc = 'ASC'
            }else{
                pdescAsc = 'DESC'
            }

            
            if(!Number.isInteger(pPagina) == true){
                return res.status(402).json({msg:'pagina invalida'});
            }

            if(!Number.isInteger(pNumDatos)){
                return res.status(402).json({msg:'cantidad de datos invalida'});
            }

            if(pNumDatos>50){
                return res.status(402).json({msg:'cantidad de datos sumpera el limite'});
            }

            if(orden!=="1" && orden!=="2" && orden!=="3"  ){
                return res.status(402).json({msg:'Campo de orden no valido'});
            }

            if (pPagina < 1) pPagina = 1;
            if (pNumDatos < 1) pNumDatos = 10;
            const offset = (pPagina - 1) * pNumDatos;

            switch (orden){
                case "1":
                    porden = 'Nombres'
                    break;
                case "2":
                    porden = 'UserName'
                    break;
                case "3":
                    porden = 'FechaCreacion'
                    break;
            }

          
            const usuario = await Usuario.listar({
                empresaId:empId,
                offset:offset,
                limite:pNumDatos,
                texto:pbuscador,
                campoOrden:porden,
                descAsc:pdescAsc
            });
            

            const total = await Usuario.contar({empresaId:empId,texto:pbuscador});

            return res.status(201).json({
                data:usuario,
                total,
                paginas: Math.ceil(total / pNumDatos)
            })
        } catch (error) {
            let mensaje = 'Error en la operación' + String(error);
            res.status(401).json({ msg: mensaje});
        }
    }

    
}


export default usuarioControllers;