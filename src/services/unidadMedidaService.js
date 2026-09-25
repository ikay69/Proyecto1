import http from '@/services/http'

export default {
  getAll(payload) {
    // payload: { idEmpresa, campoOrdenar, orden, pagina, textoFiltro }
    return http.post('/unidadMedida/getunidadesmedida', payload)
  },
  create(payload) {
    // payload: { idEmpresa, Nombre, Simbolo }
    return http.post('/unidadMedida/newunidadmedida', payload)
  },
  getById(payload) {
    // payload: { idEmpresa, idUnidadMedida }
    return http.post('/unidadMedida/getidunidadesmedida', payload)
  },
  update(payload) {
    // payload: { idEmpresa, idUnidadMedida, Nombre, Simbolo, Estado }
    return http.put('/unidadMedida/updateunidadmedida', payload)
  },
    getActivas(payload) {
    // payload: { idEmpresa }
    return http.post('/unidadMedida/getunidadesmedidaactivas', payload)
  },
}