import http from '@/services/http'

export default {
  getAll(payload) {
    // payload: { idEmpresa, campoOrdenar, orden, pagina, textoFiltro }
    return http.post('/producto/getallproducto', payload)
  },
  create(payload) {
    // payload: { idEmpresa, Nombre, Descripcion, idTipoProducto, idCategoria, idUnidadMedida, TipoSeguimiento }
    return http.post('/producto/newproducto', payload)
  },
  getById(payload) {
    // payload: { idEmpresa, idProducto }
    return http.post('/producto/getidproducto', payload)
  },
  update(payload) {
    // payload: { idEmpresa, idProducto, Nombre, Descripcion, idTipoProducto, idCategoria, idUnidadMedida, TipoSeguimiento, Estado }
    return http.put('/producto/updateproducto', payload)
  },
    getActivas(payload) {
    // payload: { idEmpresa, campoOrdenar, orden, pagina, textoFiltro }
    return http.post('/producto/getactivasproducto', payload)
  },
}