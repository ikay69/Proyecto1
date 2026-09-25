import http from '@/services/http'
 
export default {
  getAll(payload) {
    // payload: { idEmpresa, campoOrdenar, orden, pagina, textoFiltro, estadoFiltro }
    return http.post('/vendedor/getallvendedor', payload)
  },
  create(payload) {
    // payload: { idEmpresa, Nombre }
    return http.post('/vendedor/newvendedor', payload)
  },
  update(payload) {
    // payload: { idEmpresa, idVendedor, Nombre, Estado }
    return http.put('/vendedor/updatevendedor', payload)
  },
  getById(payload) {
    // payload: { idEmpresa, idVendedor }
    return http.post('/vendedor/getidvendedor', payload)
  }
}
 
