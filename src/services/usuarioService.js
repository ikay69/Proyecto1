import http from '@/services/http'

export default {
  getAll(payload) {
    // payload: { pagina }
    // Nota: este listado no tiene filtro de texto ni ordenamiento, solo paginacion (50 por pagina)
    return http.post('/usuario/getuserall', payload)
  },
  create(payload) {
    // payload: { nombres, apellidos, user, password, rol }
    return http.post('/usuario/newusuer', payload)
  },
  getById(payload) {
    // payload: { idEmpresa, idUsuario }
    return http.post('/usuario/getidusuario', payload)
  },
  update(payload) {
    // payload: { idUsuario, nombres, apellidos, user, rol, estado }
    // No incluye password, para eso ver changePassword()
    
    return http.put('/usuario/updateuser', payload)
  },
  changePassword(payload) {
    // payload: { idUsuario, pass, passNew }
    return http.put('/usuario/changepassuser', payload)
  }
}
