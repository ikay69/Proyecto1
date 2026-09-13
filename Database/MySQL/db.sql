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


DESCRIBE Empresas;

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

DESCRIBE Usuarios;

CREATE TABLE UsuariosEmpresa ( 
    EmpresaId   BIGINT UNSIGNED NOT NULL, 
    UsuarioId   BIGINT UNSIGNED NOT NULL,
    Estado      BOOLEAN NOT NULL DEFAULT TRUE, 
    PRIMARY KEY (EmpresaId, UsuarioId), 
    CONSTRAINT fk_usuarios_empresa_empresas FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id) ,
    CONSTRAINT fk_usuarios_empresa_usuarios FOREIGN KEY (UsuarioId) REFERENCES Usuarios(Id) 
);

DESCRIBE UsuariosEmpresa;

CREATE TABLE UnidadesMedidas (
    Id              	BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
    EmpresaId 			BIGINT UNSIGNED NOT NULL, 
    UsuarioIdCreador 	BIGINT UNSIGNED NOT NULL,
    Nombre          	VARCHAR(50) NOT NULL,              
    Simbolo       		VARCHAR(10) NULL,               
	Estado          	BOOLEAN NOT NULL DEFAULT TRUE, 
    FechaCreacion   	TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_unidadesmedida_nombre UNIQUE (EmpresaId, Nombre),
    CONSTRAINT fk_unidadesmedida_empresa FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id) ,
    CONSTRAINT fk_unidadesmedida_usuario FOREIGN KEY (UsuarioIdCreador) REFERENCES Usuarios(Id) 
);

DESCRIBE UnidadesMedidas;


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
DESCRIBE Categorias;

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
DESCRIBE TiposDocumentos;


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

DESCRIBE Terceros;

CREATE TABLE TercerosRoles (
    Id          		BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
    EmpresaId 			BIGINT UNSIGNED NOT NULL, 
    UsuarioIdCreador	BIGINT UNSIGNED NOT NULL, 
    TerceroId   		BIGINT UNSIGNED NOT NULL, 
    Rol ENUM('CLIENTE', 'PROVEEDOR', 'TALLER') NOT NULL, 
    
    CONSTRAINT uq_empresa_tercero_rol UNIQUE (EmpresaId, TerceroId, Rol),
    CONSTRAINT fk_tercerosRoles_empresas  FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id),
    CONSTRAINT fk_tercerosRoles_terceros  FOREIGN KEY (TerceroId) REFERENCES Terceros(Id) 
);

DESCRIBE TercerosRoles;











CREATE TABLE Categorias(
	Id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    EmpresaId 		BIGINT UNSIGNED NOT NULL, 
    Nombre         VARCHAR(50) NOT NULL,
	Estado 			BOOLEAN NOT NULL DEFAULT TRUE, 
    FechaCreacion    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categorias_empresas FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id) ,
    CONSTRAINT uq_categorias_empresas UNIQUE (Id,EmpresaId),
    CONSTRAINT uq_categorias_nombre UNIQUE (Id,Nombres)
);

DESCRIBE Categorias;