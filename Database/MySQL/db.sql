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

CREATE TABLE Articulos(
    Id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    EmpresaId           BIGINT UNSIGNED NOT NULL,
    UsuarioIdCreador    BIGINT UNSIGNED NOT NULL,
    FechaCreacion       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    ProductoId          BIGINT UNSIGNED NOT NULL,
    CodigoSKU           VARCHAR(12) NOT NULL,
    Nombre              VARCHAR(150) NOT NULL,
    Descripcion         VARCHAR(300) NULL,

    CostoUnitario       DECIMAL(12,2) NULL,
    PrecioVentaUnitario DECIMAL(12,2) NULL,
    Vender              BOOLEAN NOT NULL DEFAULT TRUE,
    Estado              BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_articulos_sku UNIQUE (EmpresaId, CodigoSKU),
    CONSTRAINT fk_articulos_empresa  FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id),
    CONSTRAINT fk_articulos_usuario  FOREIGN KEY (UsuarioIdCreador) REFERENCES Usuarios(Id),
    CONSTRAINT fk_articulos_producto FOREIGN KEY (ProductoId) REFERENCES Productos(Id)
);

CREATE TABLE ArticuloPropiedades(
    Id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    EmpresaId     BIGINT UNSIGNED NOT NULL,
    ArticuloId    BIGINT UNSIGNED NOT NULL,
    PropiedadId   BIGINT UNSIGNED NOT NULL,
    Valor         VARCHAR(150) NOT NULL,

    CONSTRAINT uq_articulopropiedades_articulo_propiedad UNIQUE (ArticuloId, PropiedadId),
    CONSTRAINT fk_articulopropiedades_empresa   FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id),
    CONSTRAINT fk_articulopropiedades_articulo  FOREIGN KEY (ArticuloId) REFERENCES Articulos(Id),
    CONSTRAINT fk_articulopropiedades_propiedad FOREIGN KEY (PropiedadId) REFERENCES Propiedades(Id)
);

CREATE TABLE Existencias(
    Id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    EmpresaId           BIGINT UNSIGNED NOT NULL,
    ArticuloId          BIGINT UNSIGNED NOT NULL,
    BolsaEstado         VARCHAR(30) NOT NULL,
    PropietarioId       BIGINT UNSIGNED NULL,
    PropietarioIdClave  BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(PropietarioId, 0)) STORED,
    Cantidad            DECIMAL(12,2) NOT NULL DEFAULT 0,
    FechaActualizacion  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_existencias_bolsaestado CHECK (BolsaEstado IN (
        'DISPONIBLE', 'RESERVADO', 'PRESTADO_A_TALLER',
        'RECIBIDO_DE_TALLER', 'EN_GARANTIA_EMPENO', 'EN_REPARACION'
    )),
    CONSTRAINT uq_existencias_bolsa UNIQUE (EmpresaId, ArticuloId, BolsaEstado, PropietarioIdClave),
    CONSTRAINT fk_existencias_empresa  FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id),
    CONSTRAINT fk_existencias_articulo FOREIGN KEY (ArticuloId) REFERENCES Articulos(Id),
    CONSTRAINT fk_existencias_tercero  FOREIGN KEY (PropietarioId) REFERENCES Terceros(Id)
);

CREATE TABLE Movimientos(
    Id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    EmpresaId           BIGINT UNSIGNED NOT NULL,
    UsuarioIdCreador    BIGINT UNSIGNED NOT NULL,
    FechaMovimiento     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    ArticuloId          BIGINT UNSIGNED NOT NULL,
    TipoMovimiento      VARCHAR(10) NOT NULL,
    BolsaEstado         VARCHAR(30) NOT NULL,
    PropietarioId       BIGINT UNSIGNED NULL,
    Cantidad            DECIMAL(12,2) NOT NULL,
    CostoUnitario       DECIMAL(12,2) NULL,
    Motivo              VARCHAR(30) NOT NULL,
    TipoOrigen          VARCHAR(20) NOT NULL,
    OrigenId            BIGINT UNSIGNED NULL,
    Observaciones       VARCHAR(300) NULL,

    CONSTRAINT chk_movimientos_tipo CHECK (TipoMovimiento IN ('ENTRADA','SALIDA')),
    CONSTRAINT chk_movimientos_bolsaestado CHECK (BolsaEstado IN (
        'DISPONIBLE', 'RESERVADO', 'PRESTADO_A_TALLER',
        'RECIBIDO_DE_TALLER', 'EN_GARANTIA_EMPENO', 'EN_REPARACION'
    )),
    CONSTRAINT chk_movimientos_motivo CHECK (Motivo IN (
        'COMPRA', 'VENTA', 'DEVOLUCION_VENTA',
        'EMPENO_INGRESO', 'EMPENO_DEVOLUCION', 'EMPENO_ADJUDICACION',
        'PRESTAMO_PROPIO', 'PRESTAMO_TERCERO',
        'PRODUCCION', 'REPARACION', 'AJUSTE'
    )),
    CONSTRAINT chk_movimientos_tipoorigen CHECK (TipoOrigen IN (
        'COMPRA', 'VENTA', 'EMPENO', 'PRESTAMO', 'PRODUCCION', 'REPARACION', 'AJUSTE'
    )),

    CONSTRAINT fk_movimientos_empresa  FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id),
    CONSTRAINT fk_movimientos_usuario  FOREIGN KEY (UsuarioIdCreador) REFERENCES Usuarios(Id),
    CONSTRAINT fk_movimientos_articulo FOREIGN KEY (ArticuloId) REFERENCES Articulos(Id),
    CONSTRAINT fk_movimientos_tercero  FOREIGN KEY (PropietarioId) REFERENCES Terceros(Id),

    INDEX idx_movimientos_kardex (EmpresaId, ArticuloId, FechaMovimiento)
);

CREATE TABLE OrdenesProduccion(
    Id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    EmpresaId           BIGINT UNSIGNED NOT NULL,
    UsuarioIdCreador    BIGINT UNSIGNED NOT NULL,
    FechaCreacion       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Observaciones       VARCHAR(300) NULL,

    CONSTRAINT fk_ordenesproduccion_empresa FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id),
    CONSTRAINT fk_ordenesproduccion_usuario FOREIGN KEY (UsuarioIdCreador) REFERENCES Usuarios(Id)
);