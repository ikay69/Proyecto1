import http from '@/services/http'

export default {
  login(payload) {
    // payload: { nombre, password, clave }
    return http.post('/login', payload)
  }
}
