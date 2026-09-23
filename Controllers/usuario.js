import bcryptjs from 'bcryptjs';
import Usuario from "../Models/usuario.js";
import UsuariosEmpresa from '../Models/usuariosEmpesa.js';


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
            var usuLog = req.usuario.Id

            pNombres = pNombres.toUpperCase().trim();
            pApellidos = pApellidos.toUpperCase().trim();
            pUserName = pUserName.toUpperCase().trim();
            pPassword = pPassword.trim();
            pRol = pRol.toUpperCase().trim();


            const usuarioEmpresa = await UsuariosEmpresa.validarRelacion({pEmpresaId:pEmpId,pUsuarioId:usuLog});

            if(!usuarioEmpresa){
                return res.status(400).json({msg:"No existe relacion entre usuario y empresa"})
            }

            if(!usuarioEmpresa.Estado){
                return res.status(400).json({msg:"No existe relacion activa entre usuario y empresa"})
            }

            const usuarioExiste = await Usuario.buscarPorUsername(pUserName);
            if (usuarioExiste) {
                return res.status(400).json({mag:'Usuario, ya existe'} );
            }


            const salt2 = bcryptjs.genSaltSync(2);
            const hash2 = bcryptjs.hashSync(pPassword,salt2);

            const usuario = await Usuario.crear({pUserName, pPassword:hash2, pNombres, pApellidos, pRol})
            //console.log('usuario control crea usuario:',usuario)

            if(usuario>0){

                const crearRelacionUsuEmp = await UsuariosEmpresa.crear({pEmpresaId:pEmpId,pUsuarioId:usuario})

                let mensaje = 'Usuario creado';
                return res.status(200).json({ msg: mensaje});
            }else{
                let mensaje = 'Error en la operación';
                return res.status(400).json({ msg: mensaje});
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
                vpagina = maxPagina;
            }

            if (vpagina<0){
                vpagina = 1;
            }
          
            const offset = (vpagina - 1) * 50;
           
            const usuario  = await  Usuario.traerTodosUsuarios({pPagina:offset});
       
            return res.status(200).json({cantData:cantUsuarios,data:usuario});
        } catch (error) {
            return res.status(500).json({msg:error.message || 'Error interno del servidor'})
        }
    },

    //cambiar password usuario 
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


            const usuarioEmpresa = await UsuariosEmpresa.validarRelacion({pEmpresaId:empresaIdLogin,pUsuarioId:idUsuario});
            
            if(!usuarioEmpresa){
                return res.status(400).json({msg:"No existe relacion entre usuario y empresa"})
            }

            if(!usuarioEmpresa.Estado){
                return res.status(400).json({msg:"No existe relacion activa entre usuario y empresa"})
            }


            
            const usuarioCambiarPass = await Usuario.buscarPorId(idUsuario);
            if(!usuarioCambiarPass){
                return res.status(400).json({msg:'usuario invalido'});
            }
            
            // si el usuario logueado no es admnistrador y no es el mismo a cambiar la contraseña, no lo dejara
            
            if (usuarioRolLogin !== 'ADMINISTRADOR' && usuarioLogin !== idUsuario){
                return res.status(400).json({msg:'No tiene permisos'})
            }
            

            if (usuarioRolLogin !== 'ADMINISTRADOR'  && usuarioLogin === idUsuario){
                const passwordCorrecta = await bcryptjs.compareSync(vPass, usuarioCambiarPass.Pass);
                if (!passwordCorrecta) {
                    return res.status(400).json({ msg: 'Contraseña incorrectos' });
                }
            }

            //console.log('control usuaro cambio pass 159 ')

            const salt2 = bcryptjs.genSaltSync(2);
            const hash2 = bcryptjs.hashSync(vpassNew,salt2);
            const cambio = await Usuario.cambiarPass({pId:idUsuario,pPass:hash2})
            
            return res.status(201).json({msg:'contraseña actualizada'})

        } catch (error) {
            res.status(400).json({ msg: error.message || 'Error interno del servidor'});
        }
    },

    //actualizar datos usuario falta
    actualizar:async (req,res)=>{
        try {
            const {idEmpresa,idUsuario,nombres,apellidos,user,rol,estado} = req.body;

            if(!Number.isInteger(idUsuario) == true){
                return res.status(400).json({msg:'Usuario invalida'});
            }

            var empresaIdLogin = req.empresa.Id

            var pNombres = String(nombres);
            var pApellidos = String(apellidos);
            var pUserName = String(user);
            var pRol = String(rol);
            var vEstado = true

            pNombres = pNombres.toUpperCase().trim();
            pApellidos = pApellidos.toUpperCase().trim();
            pUserName = pUserName.toUpperCase().trim();
            pRol = pRol.toUpperCase().trim();

            if(estado !== true){
                vEstado = false;
            }else{
                vEstado = true;
            }

            const usuarioCambiarDatos = await Usuario.buscarPorId(idUsuario);
            if(!usuarioCambiarDatos){
                return res.status(400).json({msg:'usuario invalido'});
            }


            const relacionUsuEmpDeUsuEditar = await UsuariosEmpresa.validarRelacion({pEmpresaId:idEmpresa,pUsuarioId:idUsuario});

            if(!relacionUsuEmpDeUsuEditar){
                return res.status(400).json({msg:"No existe relacion entre usuario y empresa"})
            }

            //validar que no este el userName en otor usuario
            const usuarioActualizar = await Usuario.buscarPorUsername(pUserName);
            if(usuarioActualizar){
                if(usuarioActualizar.Id !== idUsuario){
                    return res.status(400).json({msg:'Nombre de usuario ya existe'})
                }
            }
            
            // si es un administr
            if(usuarioCambiarDatos.Rol == 'ADMINISTRADOR' && vEstado !== true){

                const validarCantAdmin =  await UsuariosEmpresa.cantUsuariosAdminActivos({pEmpresa:idEmpresa});
                
                if(validarCantAdmin < 2){
                    return res.status(400).json({msg:'operacon invalida empresa sin suficientes usuarios'})
                }
            }

            const actualizar = await Usuario.actualizar({pNombres,pApellidos,pUserName,pRol,pId:idUsuario,pEstado:vEstado});

            return res.status(201).json({msg:'Datos actualizados'})
        } catch (error) {
            let mensaje = 'Error en la operación' + String(error);
            res.status(400).json({ msg: mensaje});
        }
    },


    ListarPorId:async(req,res)=>{
        try {
            const {idUsuario} = req.body;

            const usuario = await Usuario.buscarPorId(idUsuario);

            if(!usuario){
                return res.status(400).json({msg:"Usuario invalido"})    
            }

            const empresas = await UsuariosEmpresa.empresasDeUsuario({pUsuarioId:idUsuario})

            const usuarioId = {
                usuId : usuario.Id,
                usuUsuario : usuario.userName,
                usuNombre: usuario.Nombres,
                usuApellido: usuario.Apellidos,
                usuEstado : usuario.Estado,
                usuRol: usuario.Rol,
                usuFecCreacion: usuario.FechaCreacion
            }

            
            return res.status(200).json({data:{usuarioId,empresas}})
        } catch (error) {
            let mensaje = 'Error en la operación' + String(error);
            res.status(500).json({ msg: mensaje});
        }
        
    },



    //------------------------------------------------------
    
    
    
}


export default usuarioControllers;