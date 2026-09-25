import http from '@/services/http'
 
export default {
  getSinMiEmpresa(payload) {
    // payload: { idEmpresa }
    // Devuelve los usuarios que AUN NO estan asignados a la empresa
    return http.post('/usuarioEmpresa/getusuariossinmiempresa', payload)
  },
  getConMiEmpresa(payload) {
    // payload: { idEmpresa }
    // Devuelve los usuarios que YA estan asignados a la empresa
    return http.post('/usuarioEmpresa/getusuariosconmiempresa', payload)
  },
  create(payload) {
    // payload: { idEmpresa, idUsuario }
    return http.post('/usuarioEmpresa/newrelacionusuarioempresa', payload)
  },
}
 
