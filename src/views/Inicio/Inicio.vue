<template>
  <v-container fluid class="pa-6">
    <v-card class="pa-8 text-center" elevation="2">
      <v-icon size="64" color="primary" class="mb-4">mdi-diamond-stone</v-icon>
      <h1 class="text-h4 mb-2">Bienvenido, {{ usuario }}</h1>
      <p class="text-subtitle-1 text-medium-emphasis">
        Empresa actual: {{ empresaActual ? empresaActual.Nombre : 'Ninguna seleccionada' }}
      </p>
      <p class="text-body-2 text-medium-emphasis mt-2">
        Sistema de gestión para joyería y compra venta.
      </p>
    </v-card>
  </v-container>
</template>

<script>
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'Inicio',
  computed: {
    authStore() {
      return useAuthStore()
    },
    usuario() {
      return this.authStore.usuario
    },
    empresaActual() {
      return this.authStore.empresaActual
    }
  }
}
</script>
