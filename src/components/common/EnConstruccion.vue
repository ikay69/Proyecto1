<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 mb-4">{{ titulo }}</h1>
    <v-card class="pa-8 text-center" elevation="1">
      <v-icon size="48" color="grey" class="mb-3">mdi-hammer-wrench</v-icon>
      <p class="text-body-1 text-medium-emphasis">
        Esta pantalla está pendiente de construcción. Se completará cuando el backend
        correspondiente esté disponible.
      </p>
    </v-card>
  </v-container>
</template>

<script>
export default {
  name: 'EnConstruccion',
  props: {
    titulo: {
      type: String,
      required: true
    }
  }
}
</script>
