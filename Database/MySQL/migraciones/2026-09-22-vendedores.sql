-- Migracion 2026-09-22 -- Tabla Vendedores
--
-- Catalogo simple por empresa, con la misma forma que Categorias y Bodegas:
-- Nombre normalizado a mayusculas por el controlador y unico dentro de la empresa.
--
-- El prefijo de los alias en las consultas es "vdr" y no "ven" porque "ven" ya
-- lo usa el modulo de Ventas.
--
-- Esta tabla NO se enlaza todavia con Ventas. Cuando se agregue VendedorId a
-- Ventas sera en su propia migracion, con su decision de nullable/obligatorio.

CREATE TABLE Vendedores(
    Id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    EmpresaId           BIGINT UNSIGNED NOT NULL,
    UsuarioIdCreador    BIGINT UNSIGNED NOT NULL,
    Nombre              VARCHAR(100) NOT NULL,
    Estado              BOOLEAN NOT NULL DEFAULT TRUE,
    FechaCreacion       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_vendedores_nombre UNIQUE (EmpresaId, Nombre),
    CONSTRAINT fk_vendedores_empresa FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id),
    CONSTRAINT fk_vendedores_usuario FOREIGN KEY (UsuarioIdCreador) REFERENCES Usuarios(Id)
);
