<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 mb-4">Kardex</h1>

    <v-card class="pa-4 mb-4" elevation="1">
      <div class="mb-1 text-subtitle-2">Artículo</div>
      <div class="d-flex align-center ga-2 mb-4">
        <v-btn icon="mdi-arrow-up" variant="tonal" @click="mostrarSelectorArticulo = true" />
        <p v-if="articuloSeleccionado" class="mb-0 flex-grow-1">
          <strong>SKU:</strong> {{ articuloSeleccionado.artSKU }}
          &nbsp;&nbsp;<strong>Artículo:</strong> {{ articuloSeleccionado.artNombre }} - {{ articuloSeleccionado.artPropiedades}} 
        </p>
        <p v-else class="mb-0 flex-grow-1 text-medium-emphasis">
          Seleccione un artículo
        </p>
      </div>

      <v-row dense align="center">
        <v-col cols="12" sm="3">
          <v-select
            v-model="filtros.idBodega"
            :items="bodegas"
            item-title="Nombre"
            item-value="Id"
            label="Bodega"
            :loading="cargandoBodegas"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="6" sm="3">
          <v-text-field
            v-model="filtros.fechaInicio"
            label="Fecha inicio"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="6" sm="3">
          <v-text-field
            v-model="filtros.fechaFin"
            label="Fecha fin"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="3">
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
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Bodega</th>
            <th>Bolsa</th>
            <th>Propietario</th>
            <th>Cantidad</th>
            <th>Costo</th>
            <th>Motivo</th>
            <th>Origen</th>
            <th>Saldo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando">
            <td colspan="11" class="text-center py-6">
              <v-progress-circular indeterminate color="primary" />
            </td>
          </tr>
          <tr v-else-if="!movimientos.length">
            <td colspan="11" class="text-center py-6 text-medium-emphasis">
              No hay movimientos para mostrar
            </td>
          </tr>
          <tr v-for="mov in movimientos" :key="mov.movId">
            <td>{{ formatearFecha(mov.movFecha) }}</td>
            <td>
              <v-chip :color="mov.movTipo === 'ENTRADA' ? 'success' : 'error'" size="small">
                {{ mov.movTipo }}
              </v-chip>
            </td>
            <td>{{ mov.movBodegaNombre }}</td>
            <td>{{ mov.movBolsa }}</td>
            <td>{{ mov.movPropietarioNombre || '-' }}</td>
            <td>{{ mov.movCantidad }}</td>
            <td>{{ mov.movCosto }}</td>
            <td>{{ mov.movMotivo }}</td>
            <td>{{ mov.movTipoOrigen }}</td>
            <td>{{ mov.movSaldo }}</td>
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

    <ArticulosSeleccionar
      v-model="mostrarSelectorArticulo"
      :id-empresa="idEmpresa"
      @seleccionar="onArticuloSeleccionado"
    />
  </v-container>
</template>

<script>
import Swal from 'sweetalert2'
import movimientoService from '@/services/movimientoService'
import bodegaService from '@/services/bodegaService'
import ArticulosSeleccionar from '@/views/Inventario/Articulos/ArticulosSeleccionar.vue'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'Kardex',

  components: { ArticulosSeleccionar },

  data() {

    // 1. Obtener la fecha actual
    const fechaActual = new Date();
    
    // 2. Formatear a YYYY-MM-DD usando la zona horaria local
    const year = fechaActual.getFullYear();
    const month = String(fechaActual.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
    const day = String(fechaActual.getDate()).padStart(2, '0');
    
    const fechaHoy = `${year}-${month}-${day}`;



    return {
      mostrarSelectorArticulo: false,
      articuloSeleccionado: null,

      bodegas: [{ Id: 0, Nombre: 'Todas' }],
      cargandoBodegas: false,

      movimientos: [],
      cantData: 0,
      pagina: 1,
      cargando: false,

      filtros: {
        idBodega: 0,
        fechaInicio: fechaHoy,
        fechaFin: fechaHoy
      }
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

    onArticuloSeleccionado(articulo) {
      this.articuloSeleccionado = articulo
    },

    consultar() {
      if (!this.articuloSeleccionado) {
        Swal.fire('Atención', 'Seleccione un artículo', 'warning')
        return
      }
      this.buscar(1)
    },

    async buscar(pagina) {
      if (!this.idEmpresa) {
        Swal.fire('Atención', 'Seleccione una empresa en la barra superior', 'warning')
        return
      }

      this.cargando = true
      try {
        const { data } = await movimientoService.getKardex({
          idEmpresa: this.idEmpresa,
          idArticulo: this.articuloSeleccionado.artId,
          idBodega: this.filtros.idBodega,
          fechaInicio: this.filtros.fechaInicio,
          fechaFin: this.filtros.fechaFin,
          pagina
        })
        this.movimientos = data.data || []
        this.cantData = data.cantData || 0
        this.pagina = pagina
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo consultar el kardex'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.cargando = false
      }
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