import http from '@/services/http'

export default {
  getAll(payload) {
    // payload: { idEmpresa, campoOrdenar, orden, pagina, textoFiltro }
    return http.post('/articulo/getallarticulo', payload)
  },
  create(payload) {
    // payload: { idEmpresa, idProducto, Nombre, Descripcion, PrecioVentaUnitario, Vender, Propiedades }
    return http.post('/articulo/newarticulo', payload)
  },
  getById(payload) {
    // payload: { idEmpresa, idArticulo }
    return http.post('/articulo/getidarticulo', payload)
  },
  update(payload) {
    // ⚠️ Ruta NO confirmada en el documento — verificar con tu hermano
    // payload: { idEmpresa, idArticulo, idProducto, Nombre, Descripcion, PrecioVentaUnitario, Vender, Estado, Propiedades }
    return http.put('/articulo/updatearticulo', payload)
  },

  getActivas(payload) {
    // payload: { idEmpresa, campoOrdenar, orden, pagina, textoFiltro }
    // campoOrdenar -> 1:Nombre, 2:SKU, 3:Descripcion, 4:FechaCreacion
    // orden -> 'ASC' | 'DESC'
    // Usado por ArticulosSeleccionar.vue (ventana flotante para elegir un articulo)

    return http.post('/articulo/getactivasarticulo', payload)
  },

  getVendibles(payload) {
    // payload: { idEmpresa, idBodega, campoOrdenar, orden, pagina, textoFiltro }
    // idBodega -> null (todas las bodegas) o un entero mayor que cero.
    //   Un 0 tambien pasa hoy, pero por accidente: la ruta lo declara
    //   optional({values:'falsy'}) y 0 es falsy, asi que se salta validarId y llega al
    //   controller como "sin filtro". No es el contrato; manda null.
    // campoOrdenar -> 1:Nombre, 2:SKU, 3:Descripcion, 4:FechaCreacion
    // orden -> 'ASC' | 'DESC'
    // Devuelve solo articulos activos, marcados para vender, propios y con existencia
    // disponible mayor que cero. Una fila es un par (articulo, bodega): el mismo artId
    // aparece tantas veces como bodegas tengan existencia de el.
    // Usado por ArticulosVendibles.vue (ventana flotante para elegir un articulo a vender)

    return http.post('/articulo/getvendiblesarticulo', payload)
  }


}