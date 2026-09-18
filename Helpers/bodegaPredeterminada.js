//El sistema ya soporta multiples bodegas a nivel de esquema/Models (Existencias y Movimientos
//llevan BodegaId), pero el frontend todavia no deja elegir la bodega en las operaciones de
//inventario/ventas/produccion. Mientras eso no exista, los Controllers usan esta bodega fija.
//Cuando el frontend envie idBodega en el body, basta con dejar de importar esta constante y leer
//el valor del request (validando que pertenezca a la empresa, igual que cualquier otro id).
const BODEGA_PREDETERMINADA = 1;

export { BODEGA_PREDETERMINADA };
