<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 mb-4">Existencia artículo</h1>

    <v-card class="pa-4 mb-4" elevation="1">
      <div class="mb-1 text-subtitle-2">Artículo</div>
      <div class="d-flex align-center ga-2">
        <v-btn icon="mdi-arrow-up" variant="tonal" @click="mostrarSelectorArticulo = true" />
        <p v-if="articuloSeleccionado" class="mb-0 flex-grow-1">
          <strong>SKU:</strong> {{ articuloSeleccionado.artSKU }}
          &nbsp;&nbsp;<strong>Artículo:</strong> {{ articuloSeleccionado.artNombre }}
        </p>
        <p v-else class="mb-0 flex-grow-1 text-medium-emphasis">
          Seleccione un artículo
        </p>
      </div>
    </v-card>

    <v-card elevation="1">
      <v-table density="compact">
        <thead>
          <tr>
            <th>Bodega</th>
            <th>Estado</th>
            <th>Propietario</th>
            <th>Cantidad</th>
            <th>Costo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando">
            <td colspan="5" class="text-center py-6">
              <v-progress-circular indeterminate color="primary" />
            </td>
          </tr>
          <tr v-else-if="!articuloSeleccionado">
            <td colspan="5" class="text-center py-6 text-medium-emphasis">
              Seleccione un artículo para ver sus existencias
            </td>
          </tr>
          <tr v-else-if="!existencias.length">
            <td colspan="5" class="text-center py-6 text-medium-emphasis">
              Este artículo no tiene existencias
            </td>
          </tr>
          <tr v-for="(ex, i) in existencias" :key="i">
            <td>{{ ex.existBodegaNombre }}</td>
            <td>{{ formatearBolsa(ex.existBolsa) }}</td>
            <td>{{ ex.existPropietarioNombre || '-' }}</td>
            <td>{{ ex.existCantidad }}</td>
            <td>{{ ex.existCosto }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <ArticulosSeleccionar
      v-model="mostrarSelectorArticulo"
      :id-empresa="idEmpresa"
      @seleccionar="onArticuloSeleccionado"
    />
  </v-container>
</template>

<script>
import Swal from 'sweetalert2'
import existenciaService from '@/services/existenciaService'
import ArticulosSeleccionar from '@/views/Inventario/Articulos/ArticulosSeleccionar.vue'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'ExistenciaArticulo',

  components: { ArticulosSeleccionar },

  data() {
    return {
      mostrarSelectorArticulo: false,
      articuloSeleccionado: null,
      existencias: [],
      cargando: false,
      opcionesBolsaEstado: [
        { valor: 'DISPONIBLE', texto: 'Disponible' },
        { valor: 'RESERVADO', texto: 'Reservado' },
        { valor: 'PRESTADO_A_TALLER', texto: 'Prestado a taller' },
        { valor: 'RECIBIDO_DE_TALLER', texto: 'Recibido de taller' },
        { valor: 'EN_GARANTIA_EMPENO', texto: 'En garantía/empeño' },
        { valor: 'EN_REPARACION', texto: 'En reparación' }
      ]
    }
  },

  computed: {
    authStore() {
      return useAuthStore()
    },
    idEmpresa() {
      return this.authStore.empresaSeleccionada
    }
  },

  methods: {
    onArticuloSeleccionado(articulo) {
      this.articuloSeleccionado = articulo
      this.consultar()
    },

    async consultar() {
      if (!this.idEmpresa) {
        Swal.fire('Atención', 'Seleccione una empresa en la barra superior', 'warning')
        return
      }

      this.cargando = true
      try {
        const { data } = await existenciaService.getExistenciasArticulo({
          idEmpresa: this.idEmpresa,
          idArticulo: this.articuloSeleccionado.artId
        })
        this.existencias = data.data || []
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo consultar las existencias del artículo'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.cargando = false
      }
    },

    formatearBolsa(valor) {
      const encontrada = this.opcionesBolsaEstado.find((o) => o.valor === valor)
      return encontrada ? encontrada.texto : valor
    }
  }
}
</script>