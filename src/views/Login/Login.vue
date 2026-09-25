<template>
  <v-app>
    <v-main class="d-flex align-center justify-center login-bg">
      <v-card width="420" max-width="92vw" elevation="8" class="pa-4">
        <v-card-title class="text-h5 text-center justify-center mb-1">
          <v-icon start icon="mdi-diamond-stone" />
          Joyería Compra Venta
        </v-card-title>
        <v-card-subtitle class="text-center mb-4">Iniciar sesión</v-card-subtitle>

        <v-card-text>
          <v-form ref="form" @submit.prevent="ingresar">
            <v-text-field
              v-model="nombre"
              label="Usuario"
              prepend-inner-icon="mdi-account"
              :rules="[reglas.requerido]"
              variant="outlined"
              density="comfortable"
              class="mb-2"
              autocomplete="username"
            />

            <v-text-field
              v-model="password"
              label="Contraseña"
              prepend-inner-icon="mdi-lock"
              :type="verPassword ? 'text' : 'password'"
              :append-inner-icon="verPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="verPassword = !verPassword"
              :rules="[reglas.requerido]"
              variant="outlined"
              density="comfortable"
              class="mb-2"
              autocomplete="current-password"
            />

            <v-text-field
              v-model="clave"
              label="Clave de empresa"
              prepend-inner-icon="mdi-key"
              :type="verClave ? 'text' : 'password'"
              :append-inner-icon="verClave ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="verClave = !verClave"
              :rules="[reglas.requerido]"
              variant="outlined"
              density="comfortable"
              class="mb-4"
              autocomplete="off"
            />

            <v-btn :loading="cargando" block color="primary" size="large" type="submit">
              Ingresar
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-main>
  </v-app>
</template>

<script>
import Swal from 'sweetalert2'
import authService from '@/services/authService'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'Login',
  data() {
    return {
      nombre: '',
      password: '',
      clave: '',
      verPassword: false,
      verClave: false,
      cargando: false,
      reglas: {
        requerido: (v) => !!v || 'Campo obligatorio'
      }
    }
  },
  computed: {
    authStore() {
      return useAuthStore()
    }
  },
  methods: {
    async ingresar() {
      const { valid } = await this.$refs.form.validate()
      if (!valid) return

      this.cargando = true
      try {
        const { data } = await authService.login({
          nombre: this.nombre,
          password: this.password,
          clave: this.clave
        })
        this.authStore.setSession(data)
        this.$router.push({ name: 'Inicio' })
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'Usuario, contraseña o clave incorrectos'
        Swal.fire('Error de inicio de sesión', mensaje, 'error')
      } finally {
        this.cargando = false
      }
    }
  }
}
</script>

<style scoped>
.login-bg {
  background: linear-gradient(135deg, #1a1a2e 0%, #2e2e38 100%);
}
</style>
