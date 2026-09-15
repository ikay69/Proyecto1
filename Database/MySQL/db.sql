CREATE DATABASE IF NOT EXISTS joyeriacompraventa;

USE joyeriacompraventa;

CREATE TABLE Empresas (
    Id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
    Nombre          VARCHAR(150) NOT NULL UNIQUE,
    TipoDocumento   VARCHAR(50) NULL,
    NumeroDocumento VARCHAR(50) NULL,
    Celular         VARCHAR(10) NULL, 
    Telefono        VARCHAR(25) NULL, 
    Email           VARCHAR(150) NULL, 
    Direccion       VARCHAR(200) NULL,
    Clave           VARCHAR(10) NOT NULL UNIQUE, 
    Pass            TEXT NOT NULL,
    Estado          BOOLEAN NOT NULL DEFAULT TRUE, 
    FechaCreacion   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Usuarios (
   Id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   userName         VARCHAR(50) NOT NULL UNIQUE,
   Pass             TEXT NOT NULL,
   Nombres          VARCHAR(150) NOT NULL,
   Apellidos        VARCHAR(150) NOT NULL,
   Estado           BOOLEAN NOT NULL DEFAULT TRUE,
   Rol              VARCHAR(150) NOT NULL,
   FechaCreacion    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   CONSTRAINT chk_rol_usuario CHECK (Rol IN ('ADMINISTRADOR','VENDEDOR'))
);

CREATE TABLE UsuariosEmpresa ( 
    EmpresaId BIGINT UNSIGNED NOT NULL, 
    UsuarioId BIGINT UNSIGNED NOT NULL,
    Estado BOOLEAN NOT NULL DEFAULT TRUE, 
    PRIMARY KEY (EmpresaId, UsuarioId), 
    CONSTRAINT fk_usuarios_empresa_empresas FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id) ,
    CONSTRAINT fk_usuarios_empresa_usuarios FOREIGN KEY (UsuarioId) REFERENCES Usuarios(Id) 
);

CREATE TABLE UnidadesMedidas (
    Id              	BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
    EmpresaId 			BIGINT UNSIGNED NOT NULL, 
    UsuarioIdCreador 	BIGINT UNSIGNED NOT NULL,
    Nombre          	VARCHAR(50) NOT NULL,              
    Simbolo       		VARCHAR(10) NULL,               
	Estado          	BOOLEAN NOT NULL DEFAULT TRUE, 
    FechaCreacion   	TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_unidadesmedidas_nombre UNIQUE (EmpresaId, Nombre),
    CONSTRAINT fk_unidadesmedidas_empresa FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id) ,
    CONSTRAINT fk_unidadesmedidas_usuario FOREIGN KEY (UsuarioIdCreador) REFERENCES Usuarios(Id) 
);

CREATE TABLE TiposDocumentos (
    Id              	BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
    EmpresaId 			BIGINT UNSIGNED NOT NULL, 
    UsuarioIdCreador 	BIGINT UNSIGNED NOT NULL,
    Abreviatura         VARCHAR(10) NOT NULL,     
    Descripcion         VARCHAR(100) NOT NULL,
	Estado          	BOOLEAN NOT NULL DEFAULT TRUE, 
    FechaCreacion   	TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_tiposdocumentos_nombre UNIQUE (EmpresaId, Abreviatura),
    CONSTRAINT fk_tiposdocumentos_empresa FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id) ,
    CONSTRAINT fk_tiposdocumentos_usuario FOREIGN KEY (UsuarioIdCreador) REFERENCES Usuarios(Id) 
);

CREATE TABLE Terceros (
    Id             		BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
    EmpresaId 			BIGINT UNSIGNED NOT NULL, 
    UsuarioIdCreador 	BIGINT UNSIGNED NOT NULL,
    Nombre          	VARCHAR(150) NOT NULL,              
    Apellidos       	VARCHAR(150) NULL,               
    TipoDocumento   	BIGINT UNSIGNED NULL,
    NumeroDocumento   	VARCHAR(50) NULL,
    Celular        	 	VARCHAR(10) NULL,
    Email           	VARCHAR(150) NULL,
    Direccion       	VARCHAR(200) NULL,
    Estado          	BOOLEAN NOT NULL DEFAULT TRUE, 
    FechaCreacion   	TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_terceros_empresa FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id) ,
    CONSTRAINT fk_terceros_usuario FOREIGN KEY (UsuarioIdCreador) REFERENCES Usuarios(Id),
    CONSTRAINT uq_terceros_tipodocumento FOREIGN KEY (TipoDocumento) REFERENCES TiposDocumentos(Id)
);

CREATE TABLE TercerosRoles (
    Id          		BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
    EmpresaId 			BIGINT UNSIGNED NOT NULL, 
    TerceroId   		BIGINT UNSIGNED NOT NULL, 
    Rol 				VARCHAR(15) NOT NULL,
	UsuarioIdCreador	BIGINT UNSIGNED NOT NULL, 
    
    CONSTRAINT uq_empresa_tercero_rol UNIQUE (EmpresaId, TerceroId, Rol),
    CONSTRAINT fk_tercerosRoles_empresas  FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id),
    CONSTRAINT fk_tercerosRoles_terceros  FOREIGN KEY (TerceroId) REFERENCES Terceros(Id) ,
    
	CONSTRAINT chk_rol_tercero CHECK (Rol IN ('CLIENTE', 'PROVEEDOR', 'TALLER'))
);

CREATE TABLE Propiedades(
	Id              	BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
    EmpresaId 			BIGINT UNSIGNED NOT NULL, 
    UsuarioIdCreador 	BIGINT UNSIGNED NOT NULL,
    Nombre          	VARCHAR(50) NOT NULL,          
    TipoDato			VARCHAR(50) NOT NULL,
	Estado          	BOOLEAN NOT NULL DEFAULT TRUE, 
    FechaCreacion   	TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_propiedades_tipodato CHECK (TipoDato IN ('NUMERO', 'TEXTO')),
    
    CONSTRAINT uq_propiedades_nombre UNIQUE (EmpresaId, Nombre),
    CONSTRAINT fk_propiedades_empresa FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id) ,
    CONSTRAINT fk_propiedades_usuario FOREIGN KEY (UsuarioIdCreador) REFERENCES Usuarios(Id) 
);

CREATE TABLE Categorias (
    Id              	BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
    EmpresaId 			BIGINT UNSIGNED NOT NULL, 
    UsuarioIdCreador 	BIGINT UNSIGNED NOT NULL,
    Nombre          	VARCHAR(50) NOT NULL,               
	Estado          	BOOLEAN NOT NULL DEFAULT TRUE, 
    FechaCreacion   	TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_categorias_nombre UNIQUE (EmpresaId, Nombre),
    CONSTRAINT fk_categorias_empresa FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id) ,
    CONSTRAINT fk_categorias_usuario FOREIGN KEY (UsuarioIdCreador) REFERENCES Usuarios(Id) 
);

CREATE TABLE TiposProductos(
	Id              	BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
    EmpresaId 			BIGINT UNSIGNED NOT NULL, 
    UsuarioIdCreador 	BIGINT UNSIGNED NOT NULL,
    FechaCreacion   	TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Nombre				VARCHAR(100) NOT NULL,
    Estado				BOOLEAN NOT NULL DEFAULT TRUE, 
    
	CONSTRAINT uq_tiposproductos_nombre UNIQUE (EmpresaId, Nombre),
    CONSTRAINT fk_tiposproductos_empresa FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id) ,
    CONSTRAINT fk_tiposproductos_usuario FOREIGN KEY (UsuarioIdCreador) REFERENCES Usuarios(Id)
    
);


CREATE TABLE Productos(
	Id              	BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
    EmpresaId 			BIGINT UNSIGNED NOT NULL, 
    UsuarioIdCreador 	BIGINT UNSIGNED NOT NULL,
    FechaCreacion   	TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Nombre				VARCHAR(150) NOT NULL,
    Descripcion			VARCHAR(300) NULL,
    Estado				BOOLEAN NOT NULL DEFAULT TRUE, 
    
    TipoProductoId		BIGINT UNSIGNED NOT NULL, 
    CategoriaId			BIGINT UNSIGNED NOT NULL, 
    UnidadMedidaId		BIGINT UNSIGNED NOT NULL, 
    TipoSeguimiento		VARCHAR(50) NOT NULL, 
    
    CONSTRAINT chk_productos_tipo CHECK (TipoSeguimiento IN ('CANTIDAD', 'UNIDAD')),
    
    CONSTRAINT uq_productos_nombre UNIQUE (EmpresaId, Nombre),
	CONSTRAINT fk_productos_empresa FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id) ,
    CONSTRAINT fk_productos_usuario FOREIGN KEY (UsuarioIdCreador) REFERENCES Usuarios(Id) ,
    CONSTRAINT fk_productos_categoria FOREIGN KEY (CategoriaId) REFERENCES Categorias(Id) ,
	CONSTRAINT fk_productos_unidadmedida FOREIGN KEY (UnidadMedidaId) REFERENCES UnidadesMedidas(Id) ,
    CONSTRAINT fk_productos_tipoproducto FOREIGN KEY (TipoProductoId) REFERENCES TiposProductos(Id) 
);