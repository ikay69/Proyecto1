import { defineStore } from 'pinia'

const STORAGE_KEY = 'joyeria_auth'

function cargarDeStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const guardado = cargarDeStorage()
    return {
      token: guardado?.token || null,
      usuario: guardado?.usuario || null,
      rol: guardado?.rol || null,
      empresas: guardado?.empresas || [],
      empresaSeleccionada: guardado?.empresaSeleccionada || null
    }
  },
  getters: {
    isAuthenticated: (state) => !!state.token,
    empresaActual: (state) =>
      state.empresas.find((empresa) => empresa.Id === state.empresaSeleccionada) || null
  },
  actions: {
    // Se llama justo despues de un login exitoso con la respuesta cruda del backend
    setSession({ token, usuario, empresas, rol }) {
      this.token = token
      this.usuario = usuario
      this.empresas = empresas || []
      this.rol = rol
      this.empresaSeleccionada = this.empresas.length ? this.empresas[0].Id : null

      this.persistir()
    },
    setEmpresaSeleccionada(idEmpresa) {
      this.empresaSeleccionada = idEmpresa
      this.persistir()
    },
    persistir() {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          token: this.token,
          usuario: this.usuario,
          rol: this.rol,
          empresas: this.empresas,
          empresaSeleccionada: this.empresaSeleccionada
        })
      )
    },
    logout() {
      this.token = null
      this.usuario = null
      this.rol = null
      this.empresas = []
      this.empresaSeleccionada = null
      localStorage.removeItem(STORAGE_KEY)
    }
  }
})
