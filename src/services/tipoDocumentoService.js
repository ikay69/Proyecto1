import http from '@/services/http'

export default {
  getAll(payload) {
    // payload: { idEmpresa, campoOrdenar, orden, pagina, textoFiltro }
    return http.post('/tipodocumento/getalltipodocumento', payload)
  },
  getActivas(payload) {
    // payload: { idEmpresa }
    return http.post('/tipodocumento/getactivastipodocumento', payload)
  },
  create(payload) {
    // payload: { idEmpresa, Abreviatura, Descripcion }
    return http.post('/tipodocumento/newtipodocumento', payload)
  },
  getById(payload) {
    // payload: { idEmpresa, idTipoDocumento }
    return http.post('/tipodocumento/getidtipodocumento', payload)
  },
  update(payload) {
    // payload: { idEmpresa, idTipoDocumento, Abreviatura, Descripcion, Estado }
    return http.put('/tipodocumento/updatetipodocumento', payload)
  }
}