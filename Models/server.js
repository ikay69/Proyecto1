import express from 'express';
import cors from 'cors';
import dbConnection from '../Database/config.js';

import empresa from '../Routes/empresa.js';
import auth from '../Routes/auth.js';
import usuario from '../Routes/usuario.js';
import usuariosEmpresa from '../Routes/usuariosEmpresa.js'
import unidadesMedida from '../Routes/unidadesMedida.js';
import categoria from '../Routes/categorias.js';
import tipoDocumento from '../Routes/tiposDocumento.js';
import tercero from '../Routes/terceros.js';
import propiedad from '../Routes/propiedades.js';

class Server{
    constructor(){
        this.port = process.env.PORT;   
        this.app = express();                      
        this.middlewares();  
        this.conectarDB();    
        this.routes();                     
    }

    async conectarDB(){
        await dbConnection(); 
    }

    middlewares(){
        this.app.use(express.json());   
        this.app.use(cors());           
        this.app.use(express.static('public')); 

    }

     routes(){
        this.app.use('/api/empresa',empresa);
        this.app.use('/api/login',auth);
        this.app.use('/api/usuario',usuario);
        this.app.use('/api/usuarioEmpresa',usuariosEmpresa);
        this.app.use('/api/unidadMedida',unidadesMedida);
        this.app.use('/api/categoria',categoria);
        this.app.use('/api/tipodocumento',tipoDocumento);
        this.app.use('/api/tercero',tercero);
        this.app.use('/api/propiedad',propiedad);
    }

    listen(){
        this.app.listen(this.port,()=>{
            console.log(`servidor corriendo en el puerto ${this.port}`); 
        })
    }

   
}


export default Server;

/*

// Escucha en el puerto y en '0.0.0.0'
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

const opcionesCors = {
  origin: 'https://mi-aplicacion-frontend.com' // Solo esta página web puede consultar mi API
};
app.use(cors(opcionesCors));

*/