import http from '@/services/http'

export default {
  getExistencias(payload) {
    // payload: { idEmpresa, pagina, textoFiltro, BolsaEstado, idBodega }
    return http.post('/existencia/getexistencias', payload)
  },
    getExistenciasArticulo(payload) {
    // payload: { idEmpresa, idArticulo }
    return http.post('/existencia/getexistenciasarticulo', payload)
  }
}