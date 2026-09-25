import http from '@/services/http'

export default {
  getAll(payload) {
    // payload: { idEmpresa, campoOrdenar, orden, pagina, textoFiltro }
    return http.post('/categoria/getallcategoria', payload)
  },
  create(payload) {
    // payload: { idEmpresa, Nombre }
    return http.post('/categoria/newcategoria', payload)
  },
  getById(payload) {
    // payload: { idEmpresa, idCategoria }
    // Nota: el documento de la API solo mostraba "idEmpresa" en el body de
    // ejemplo, pero para poder identificar el registro se envia tambien
    // idCategoria (necesario para que el backend sepa cual categoria buscar).
    return http.post('/categoria/getidcategoria', payload)
  },
  update(payload) {
    // payload: { idEmpresa, idCategoria, Nombre, Estado }
    return http.put('/categoria/updatecategoria', payload)
  },
    getActivas(payload) {
    // payload: { idEmpresa }
    return http.post('/categoria/getactivascategoria', payload)
  },

}
