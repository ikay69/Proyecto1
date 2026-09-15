import bcryptjs from 'bcryptjs';
import Empresa from '../Models/empresa.js';
import Usuario from '../Models/usuario.js';
import UsuariosEmpresa from '../Models/usuariosEmpesa.js';
import { EmpvalidarNombreEmpresa ,
    EmpvalidarTipDoc,
    EmpvalidarNumDoc,
    EmpvalidarCel,
    EmpvalidarTel,
    EmpvalidarEma,
    EmpvalidarDir
    
}from '../Helpers/empresa.js';

//import UsuariosEmpresa from './Models/usuariosEmpesa.js';



const empresaControllers = {
  crear: async (req,res)=>{

    try {

        const salt = bcryptjs.genSaltSync(2);
        const hash = bcryptjs.hashSync('1234',salt);

        const countEmp = await Empresa.contarEmpresas({});
        const nuevoSufijo = countEmp + 1
       
        //console.log('empresa controller crear 20:',countEmp);

        const nombre = 'Empresa'+nuevoSufijo;
        const clave = 'emp'+nuevoSufijo;
       
        const empresaId = await Empresa.crear({ 
            pNombre:nombre,
            pTipoDocumento:'',
            pNumeroDocumento:'',
            pCelular:'',
            pTelefono:'',
            pEmail:'',
            pDireccion:'',
            pClave:clave,
            pPassword: hash 
        });
 

        const userName = 'USER' + nuevoSufijo

        const salt2 = bcryptjs.genSaltSync(2);
        const hash2 = bcryptjs.hashSync('1234',salt2);

        const usuarioid = await Usuario.crear({
            pUserName:userName,
            pPassword:hash2,
            pNombres:'origen',
            pApellidos:'origen',
            pRol:'ADMINISTRADOR'
        });

        const usuariosempresa = await UsuariosEmpresa.crear({pEmpresaId:empresaId,pUsuarioId:usuarioid})
        let mensaje = 'Empresa ' + nombre + ' creada y usuario ' + userName;
    
        res.status(200).json({ msg: mensaje});

    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ msg: 'La clave de empresa ya existe' });
      }
      res.status(400).json({ msg: error.message || 'Error interno del servidor'});
    }
    
  },

  listarTodas: async (req,res)=>{
    try {
        const empresa = await Empresa.listarTodasEmpresas();
        return res.status(200).json({data:empresa});
        
    } catch (error) {
        res.status(400).json({msg:error.message || 'Error interno del servidor'})
    }
  },

  listarActivas: async(req,res)=>{
    try {
        const empresa = await Empresa.listarEmpresasActivas();
        return res.status(200).json({data:empresa});
        
    } catch (error) {
        res.status(401).json({msg:error.message || 'Error interno del servidor'})
    }
  },

  cambiarEstado: async(req,res)=>{
    try {
        const {newEstado,passEmpresa,idEmpresa} = req.body;

        if(!Number.isInteger(idEmpresa) == true){
            return res.status(400).json({msg:'empresa invalida'});
        }

        if(newEstado !== true && newEstado !== false){
            return res.status(400).json({msg:'estado invalido'});
        }

        var idEmpesaLogin = req.empresa.id;
        if(idEmpesaLogin == idEmpresa){
            return res.status(400).json({msg:'no se puede anular así misma'});
        }

        const traeEmpresa = await Empresa.traerDatosPorId({pId:idEmpresa})
        //console.log('empresa modelo estado 102:',traeEmpresa)

        if(!traeEmpresa){
            return res.status(400).json({msg:'Empresa invalida'})
        }

        const passwordCorrecta = await bcryptjs.compareSync(passEmpresa, traeEmpresa.Pass);
        if (!passwordCorrecta) {
            return res.status(400).json({ msg: 'Contraseña incorrecta' });
        }

        const empresa = await Empresa.cambiarEstado({pNewEstado:newEstado,pId:idEmpresa})

        return res.status(200).json({msg:"Estado actualizdo"})
    } catch (error) {
        res.status(400).json({msg:error.message || 'Error interno del servidor'})
    }
  },

  cambiarClave: async(req,res)=>{
    try {
        const {newClave,passEmpresa,idEmpresa} = req.body;

        if(!Number.isInteger(idEmpresa) == true){
            return res.status(400).json({msg:'empresa invalida'});
        }

        if(newClave.lenght >11){
            return res.status(400).json({msg:'clave invalda'});
        }
        
        var idEmpesaLogin = req.empresa.Id;
        if(idEmpesaLogin !== idEmpresa){
            return res.status(400).json({msg:'no puede cambiar clave a otra empresa'});
        }

        const traeEmpresa = await Empresa.traerDatosPorId({pId:idEmpresa})
        //console.log('empresa modelo estado 102:',traeEmpresa)

        if(!traeEmpresa){
            return res.status(400).json({msg:'Empresa invalida'})
        }

        const passwordCorrecta = await bcryptjs.compareSync(passEmpresa, traeEmpresa.Pass);
        if (!passwordCorrecta) {
            return res.status(401).json({ msg: 'Contraseña incorrecta' });
        }
        
        const empresa = await Empresa.cambiarClave({pNewClave:newClave,pId:idEmpresa})

        return res.status(200).json({msg:"Clave actualizdo"})
    } catch (error) {
        res.status(400).json({msg:error.message || 'Error interno del servidor'})
    }
  },

  cambiarPass: async (req,res)=>{
    try {

        const {newPass,passEmpresa,idEmpresa} = req.body;

        if(!Number.isInteger(idEmpresa) == true){
            return res.status(400).json({msg:'empresa invalida'});
        }

        if(newPass.lenght >11){
            return res.status(400).json({msg:'clave invalda'});
        }
        
        var idEmpesaLogin = req.empresa.Id;
        if(idEmpesaLogin !== idEmpresa){
            return res.status(400).json({msg:'no puede cambiar clave a otra empresa'});
        }

        const traeEmpresa = await Empresa.traerDatosPorId({pId:idEmpresa})
        //console.log('empresa modelo estado 102:',traeEmpresa)

        if(!traeEmpresa){
            return res.status(400).json({msg:'Empresa invalida'})
        }

        const passwordCorrecta = await bcryptjs.compareSync(passEmpresa, traeEmpresa.Pass);
        if (!passwordCorrecta) {
            return res.status(401).json({ msg: 'Contraseña incorrecta' });
        }

        const salt2 = bcryptjs.genSaltSync(2);
        const hash2 = bcryptjs.hashSync(newPass,salt2);

        const empresa = await Empresa.cambiarPass({pnewPass:hash2,pId:idEmpresa})
        
        res.status(200).json({msg:'contraseña actualizada'})
    } catch (error) {
        res.status(400).json({msg:error.message || 'Error interno del servidor'})
    }
  },

  traerEmpresaPorId: async(req,res)=>{
    try {

        const {idEmpresa} = req.body;
    
        if(!Number.isInteger(idEmpresa) == true){
            return res.status(400).json({msg:'empresa invalida'});
        }

        const empresa = await Empresa.traerDatosPorId({pId:idEmpresa});
        delete empresa.Pass;
        res.status(200).json({data:empresa})
    } catch (error) {
        res.status(400).json({msg:error.message || 'Error interno del servidor'})
    }

  },

  actualizarDatos : async(req,res)=>{
    try {

        const {idEmpresa,passEmpresa,Nombre,TipoDocumento,NumeroDocumento,Celular,Telefono,Email,Direccion} = req.body;

      
        var vTipoDocumento = TipoDocumento.toUpperCase();
    
        if(!Number.isInteger(idEmpresa) == true){
            return res.status(400).json({msg:'empresa invalida'});
        }

        if(passEmpresa.lenght >11){
            return res.status(400).json({msg:'clave invalda'});
        }
        
        var idEmpesaLogin = req.empresa.Id;
        if(idEmpesaLogin !== idEmpresa){
            return res.status(400).json({msg:'no puede cambiar datos a otra empresa'});
        }

        const traeEmpresa = await Empresa.traerDatosPorId({pId:idEmpresa})
        //console.log('empresa controller datos 102:',traeEmpresa)

        if(!traeEmpresa){
            return res.status(400).json({msg:'Empresa invalida'})
        }

        const passwordCorrecta = await bcryptjs.compareSync(passEmpresa, traeEmpresa.Pass);
        if (!passwordCorrecta) {
            return res.status(401).json({ msg: 'Contraseña incorrecta' });
        }

        var existe = await EmpvalidarNombreEmpresa(Nombre)
        if(existe !== true){return res.status(400).json({msg:`${existe}`})}
    
        existe = await EmpvalidarTipDoc(vTipoDocumento)
        if(existe!==true){return res.status(400).json({msg:`${existe}`})}
    
        existe = await EmpvalidarNumDoc(NumeroDocumento)
        if(existe!==true){return res.status(400).json({msg:`${existe}`})}

        existe = await EmpvalidarCel(Celular)
        if(existe!==true){return res.status(400).json({msg:`${existe}`})}

        existe = await EmpvalidarTel(Telefono)
        if(existe!==true){return res.status(400).json({msg:`${existe}`})}

        existe = await EmpvalidarEma(Email)
        if(existe!==true){return res.status(400).json({msg:`${existe}`})}

        existe = await EmpvalidarDir(Direccion)
        if(existe!==true){return res.status(400).json({msg:`${existe}`})}

        const traeEmpersaNombre = await Empresa.traerDatosPorNombre({nombre:Nombre});
        //console.log('empresa control actualizar 283 ',traeEmpersaNombre)
        
        if (traeEmpersaNombre) {
            if(traeEmpersaNombre.Id !== idEmpresa){
                return res.status(400).json({msg:"Nombre de empresa ya registardo"})
            }
        }

        //return res.status(200).json({msg:'bien'})
        const empresa = await Empresa.actualizarDatos({
            pId:idEmpresa,
            pNombre:Nombre,
            pTipoDocumento:vTipoDocumento,
            pNumeroDocumento:NumeroDocumento,
            pCelular:Celular,
            pTelefono:Telefono,
            pEmail:Email,
            pDireccion:Direccion
        });


        res.status(200).json({msg:'Datos actualizados'})
    } catch (error) {
        res.status(400).json({msg:error.message || 'Error interno del servidor'})
    }
  }

}

export default empresaControllers;