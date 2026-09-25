import http from '@/services/http'

export default {
  getAll(payload) {
    // payload: { idEmpresa, campoOrdenar, orden, pagina, textoFiltro }
    return http.post('/tercero/getalltercero', payload)
  },
  create(payload) {
    // payload: { idEmpresa, Nombre, Apellidos, idTipoDocumento, NumeroDocumento, Celular, Email, Direccion }
    return http.post('/tercero/newtercero', payload)
  },
  getById(payload) {
    // payload: { idEmpresa, idTercero }
    return http.post('/tercero/getidtercero', payload)
  },
  update(payload) {
    // payload: { idEmpresa, idTercero, Nombre, Apellidos, idTipoDocumento, NumeroDocumento, Estado, Celular, Email, Direccion }
    return http.put('/tercero/updatetercero', payload)
  },
  getActivas(payload) {
    // payload: { idEmpresa, campoOrdenar, orden, pagina, textoFiltro }
    // campoOrdenar -> 1:Nombre, 2:Apellidos, 3:NumeroDocumento, 4:Email, 5:FechaCreacion
    // orden -> 'ASC' | 'DESC'
    // Usado por TercerosSeleccionar.vue (ventana flotante para elegir un tercero)
    return http.post('/tercero/getactivastercero', payload)
  }
}