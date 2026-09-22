-- Migracion 2026-09-22 -- VendedorId en Ventas
--
-- Quien hizo la venta, opcional. Va NULL-able porque las ventas que ya existen no
-- tienen vendedor y no hay forma de adivinarselo: se quedan en NULL y el listado
-- puede aislarlas con idVendedor = -1.
--
-- No se guarda un snapshot del nombre (a diferencia de TerceroNombre): los vendedores
-- no se borran, solo se desactivan, asi que el FK ya conserva la identidad. Un renombre
-- si cambia el nombre que muestran las ventas viejas, y es el comportamiento buscado.

ALTER TABLE Ventas
    ADD COLUMN VendedorId BIGINT UNSIGNED NULL AFTER TerceroNombre,
    ADD CONSTRAINT fk_ventas_vendedor FOREIGN KEY (VendedorId) REFERENCES Vendedores(Id);

-- idx_ventas_listado (EmpresaId, FechaCreacion) no sirve para el listado filtrado por
-- vendedor: la columna del WHERE tiene que ir antes que la del ORDER BY en el indice.
-- Con (EmpresaId, VendedorId, FechaCreacion) el filtro se resuelve por indice y la
-- ordenacion sale ya ordenada, sin filesort.
--
-- Medido con EXPLAIN sobre 3000 ventas sembradas (2000 repartidas entre 5 vendedores,
-- 1000 sin vendedor) en el servidor de desarrollo:
--     WHERE EmpresaId=1 AND VendedorId=?    -> idx_ventas_vendedor, 400 filas,
--                                              "Backward index scan; Using index"
--     WHERE EmpresaId=1 AND VendedorId IS NULL -> idx_ventas_vendedor, 1001 filas,
--                                              "Using where; Backward index scan; Using index"
--     WHERE EmpresaId=1 (sin filtro)        -> idx_ventas_listado, "Backward index scan"
-- Ninguno de los tres ordena en memoria. Con la tabla casi vacia el optimizador elige el
-- indice de una sola columna que MySQL crea para el FK y si aparece un filesort: es un
-- artefacto del volumen, no del indice.
ALTER TABLE Ventas
    ADD INDEX idx_ventas_vendedor (EmpresaId, VendedorId, FechaCreacion);
