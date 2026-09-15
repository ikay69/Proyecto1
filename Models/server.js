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
import tiposProducto from '../Routes/tiposProducto.js';
import producto from '../Routes/productos.js'
import articulo from '../Routes/articulos.js';
import existencia from '../Routes/existencias.js';
import movimiento from '../Routes/movimientos.js';

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
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',     // Para cuando pruebas en tu propia máquina
            'http://127.0.0.1:5173',     // Alternativa local
            'http://192.168.1.5:5173'    // El frontend del otro portátil en tu red
        ];



        this.app.use(cors({
            origin: function (origin, callback) {
                // Permitir peticiones sin origen (como Postman, dispositivos móviles o SSR)
                if (!origin) return callback(null, true);
                
                if (allowedOrigins.includes(origin)) {
                    callback(null, true); // Origen permitido
                } else {
                    callback(new Error('Bloqueado por políticas de CORS de la API'));
                }
            },
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: true
        }));           


        //this.app.use(cors());
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
        this.app.use('/api/tiposproducto',tiposProducto);
        this.app.use('/api/producto',producto);
        this.app.use('/api/articulo',articulo);
        this.app.use('/api/existencia',existencia);
        this.app.use('/api/movimiento',movimiento);
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