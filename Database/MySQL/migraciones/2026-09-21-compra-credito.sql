-- Migracion 2026-09-21 -- Compra a credito y anulacion de compras
--
-- Requiere MySQL 8.0.16+ por DROP CHECK. Servidor de desarrollo verificado: 8.0.46.
-- Antes de correrla sobre una base con datos:
--     SELECT COUNT(*) FROM Compras WHERE TipoCompra = 'POR_ABONO';
-- Si devuelve algo distinto de 0, el ALTER del CHECK falla al revalidar.

-- 1. POR_ABONO sale del dominio. Quedan dos modalidades.
ALTER TABLE Compras DROP CHECK chk_compras_tipocompra;

ALTER TABLE Compras ADD CONSTRAINT chk_compras_tipocompra
      CHECK (TipoCompra IN ('CONTADO','CREDITO'));

-- 2. Auditoria de la anulacion. MotivoAnulacion ya existia, pero por si solo dice por que
--    se anulo y no quien ni cuando. Una compra es dinero saliendo de caja.
--    FechaAnulacion va SIN DEFAULT y SIN ON UPDATE a proposito: la escribe el UPDATE de
--    anulacion y nadie mas. Un ON UPDATE CURRENT_TIMESTAMP la pisaria en cualquier
--    escritura futura sobre la fila.
ALTER TABLE Compras
    ADD COLUMN UsuarioIdAnulador BIGINT UNSIGNED NULL AFTER MotivoAnulacion,
    ADD COLUMN FechaAnulacion    TIMESTAMP NULL       AFTER UsuarioIdAnulador,
    ADD CONSTRAINT fk_compras_anulador FOREIGN KEY (UsuarioIdAnulador) REFERENCES Usuarios(Id);

-- 3. Desglose opcional de las cuotas de una compra a credito. Es una transcripcion de lo que
--    el proveedor cobra, no un calculo de este sistema: por eso la tabla no es obligatoria y
--    sus valores no tienen que sumar el saldo de la compra.
--
--    OJO con el vocabulario: aqui Estado='CANCELADA' significa PAGADA (sentido coloquial de
--    "cancelar una cuota"). En Compras, Estado=FALSE significa ANULADA. Son opuestos.
CREATE TABLE CompraCuotas(
    Id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    EmpresaId   BIGINT UNSIGNED NOT NULL,
    CompraId    BIGINT UNSIGNED NOT NULL,

    NumCuota    INT UNSIGNED NOT NULL,
    ValorCuota  DECIMAL(12,2) NOT NULL,
    FechaPago   TIMESTAMP NULL,
    Estado      VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT chk_compracuota_estado  CHECK (Estado IN ('PENDIENTE','CANCELADA')),
    CONSTRAINT fk_compracuota_empresa  FOREIGN KEY (EmpresaId) REFERENCES Empresas(Id),
    CONSTRAINT fk_compracuota_compra   FOREIGN KEY (CompraId)  REFERENCES Compras(Id),
    CONSTRAINT uq_compracuota_numero   UNIQUE (CompraId, NumCuota),

    INDEX idx_compracuotas_compra (EmpresaId, CompraId)
);
