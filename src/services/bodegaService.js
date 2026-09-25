import http from '@/services/http'

export default {
  getAll(payload) {
    // payload: { idEmpresa, campoOrdenar, orden, pagina, textoFiltro }
    return http.post('/bodega/getallbodega', payload)
  },
  create(payload) {
    // payload: { idEmpresa, Nombre }
    return http.post('/bodega/newbodega', payload)
  },
    getById(payload) {
    // payload: { idEmpresa, idBodega }
    return http.post('/bodega/getidbodega', payload)
  },
  update(payload) {
    // payload: { idEmpresa, idBodega, Nombre, Estado }
    return http.put('/bodega/updatebodega', payload)
  },
    getActivas(payload) {
    // payload: { idEmpresa }
    return http.post('/bodega/getactivasbodega', payload)
  }
}