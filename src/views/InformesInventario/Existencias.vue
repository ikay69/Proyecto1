<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 mb-4">Existencias</h1>

    <v-card class="pa-4 mb-4" elevation="1">
      <v-row dense align="center">
        <v-col cols="12" sm="4">
          <v-text-field
            v-model="filtros.textoFiltro"
            label="Buscar (nombre o SKU)"
            clearable
            density="compact"
            variant="outlined"
            hide-details
          />
        </v-col>
        <v-col cols="6" sm="3">
          <v-select
            v-model="filtros.idBodega"
            :items="bodegas"
            item-title="Nombre"
            item-value="Id"
            label="Bodega"
            :loading="cargandoBodegas"
            density="compact"
            variant="outlined"
            hide-details
          />
        </v-col>
        <v-col cols="6" sm="3">
          <v-select
            v-model="filtros.BolsaEstado"
            :items="opcionesBolsaEstado"
            item-title="texto"
            item-value="valor"
            label="Estado"
            density="compact"
            variant="outlined"
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="2">
          <v-btn color="primary" variant="tonal" block @click="consultar">
            Consultar
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <v-card elevation="1">
      <v-table density="compact">
        <thead>
          <tr>
            <th>Bodega</th>
            <th>SKU</th>
            <th>Artículo</th>
            <th>Estado</th>
            <th>Propietario</th>
            <th>Cantidad</th>
            <th>Costo</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando">
            <td colspan="8" class="text-center py-6">
              <v-progress-circular indeterminate color="primary" />
            </td>
          </tr>
          <tr v-else-if="!existencias.length">
            <td colspan="8" class="text-center py-6 text-medium-emphasis">
              No hay existencias para mostrar
            </td>
          </tr>
          <tr v-for="ex in existencias" :key="ex.existId">
            <td>{{ ex.existBodegaNombre }}</td>
            <td>{{ ex.existSKU }}</td>
            <td>{{ ex.existArticuloNombre }}</td>
            <td>{{ formatearBolsa(ex.existBolsa) }}</td>
            <td>{{ ex.existPropietarioNombre || '-' }}</td>
            <td>{{ ex.existCantidad }}</td>
            <td>{{ ex.existCosto }}</td>
            <td>{{ formatearFecha(ex.existFecha) }}</td>
          </tr>
        </tbody>
      </v-table>

      <div class="d-flex align-center justify-center pa-4 ga-4">
        <v-btn v-if="pagina > 1" variant="outlined" @click="buscar(pagina - 1)">
          Anterior
        </v-btn>
        <span>Página {{ pagina }} de {{ totalPaginas }}</span>
        <v-btn v-if="pagina < totalPaginas" variant="outlined" @click="buscar(pagina + 1)">
          Siguiente
        </v-btn>
      </div>
    </v-card>
  </v-container>
</template>

<script>
import Swal from 'sweetalert2'
import existenciaService from '@/services/existenciaService'
import bodegaService from '@/services/bodegaService'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'Existencias',
  data() {
    return {
      cargando: false,
      existencias: [],
      cantData: 0,
      pagina: 1,

      bodegas: [{ Id: 0, Nombre: 'Todas' }],
      cargandoBodegas: false,

      filtros: {
        textoFiltro: '',
        idBodega: 0,
        BolsaEstado: ''
      },
      opcionesBolsaEstado: [
        { valor: '', texto: 'Todas' },
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
    },
    totalPaginas() {
      return Math.max(1, Math.ceil(this.cantData / 50))
    }
  },
  created() {
    this.cargarBodegas()
    this.consultar()
  },
  methods: {
    async cargarBodegas() {
      this.cargandoBodegas = true
      try {
        const { data } = await bodegaService.getActivas({ idEmpresa: this.idEmpresa })
        this.bodegas = [{ Id: 0, Nombre: 'Todas' }, ...(data.data || [])]
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo cargar la lista de bodegas'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.cargandoBodegas = false
      }
    },

    consultar() {
      this.buscar(1)
    },

    async buscar(pagina) {
      if (!this.idEmpresa) {
        Swal.fire('Atención', 'Seleccione una empresa en la barra superior', 'warning')
        return
      }

      this.cargando = true
      try {
        const { data } = await existenciaService.getExistencias({
          idEmpresa: this.idEmpresa,
          pagina,
          textoFiltro: this.filtros.textoFiltro || '',
          BolsaEstado: this.filtros.BolsaEstado || '',
          idBodega: this.filtros.idBodega
        })
        this.existencias = data.data || []
        this.cantData = data.cantData || 0
        this.pagina = pagina
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo consultar las existencias'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.cargando = false
      }
    },

    formatearBolsa(valor) {
      const encontrada = this.opcionesBolsaEstado.find((o) => o.valor === valor)
      return encontrada ? encontrada.texto : valor
    },

    formatearFecha(fecha) {
      if (!fecha) return ''
      return new Date(fecha).toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>