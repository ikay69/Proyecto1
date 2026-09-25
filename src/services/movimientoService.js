import http from '@/services/http'

export default {
  getKardex(payload) {
    // payload: { idEmpresa, idArticulo, idBodega, fechaInicio, fechaFin, pagina }
    return http.post('/movimiento/getkardex', payload)
  }
}