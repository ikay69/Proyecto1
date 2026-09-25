import http from '@/services/http'

export default {
  getAll(payload) {
    // payload: { idEmpresa, campoOrdenar, orden, pagina, textoFiltro }
    return http.post('/propiedad/getallpropiedad', payload)
  },
  create(payload) {
    // payload: { idEmpresa, Nombre, TipoDato }
    return http.post('/propiedad/newpropiedad', payload)
  },
  getById(payload) {
    // payload: { idEmpresa, idPropiedad }
    return http.post('/propiedad/getidpropiedad', payload)
  },
  update(payload) {
    // payload: { idEmpresa, idPropiedad, Nombre, TipoDato, Estado }
    return http.put('/propiedad/updatepropiedad', payload)
  },
    getActivas(payload) {
    // payload: { idEmpresa }
    return http.post('/propiedad/getactivaspropiedad', payload)
  },
}