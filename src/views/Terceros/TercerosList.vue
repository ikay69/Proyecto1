<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <h1 class="text-h5">Terceros</h1>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="irANuevo">
        Agregar
      </v-btn>
    </div>

    <v-card class="pa-4 mb-4" elevation="1">
      <v-row dense align="center">
        <v-col cols="12" sm="4">
          <v-text-field
            v-model="filtros.textoFiltro"
            label="Buscar"
            maxlength="10"
            clearable
            density="compact"
            variant="outlined"
            hide-details
          />
        </v-col>
        <v-col cols="6" sm="3">
          <v-select
            v-model="filtros.campoOrdenar"
            :items="opcionesCampoOrdenar"
            item-title="texto"
            item-value="valor"
            label="Ordenar por"
            density="compact"
            variant="outlined"
            hide-details
          />
        </v-col>
        <v-col cols="6" sm="3">
          <v-select
            v-model="filtros.orden"
            :items="opcionesOrden"
            item-title="texto"
            item-value="valor"
            label="Orden"
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
      <v-table>
        <thead>
          <tr>
            <th>Identificación</th>
            <th>Nombre</th>
            <th>Celular</th>
            <th>Estado</th>
            <th>Fecha de creación</th>
            <th class="text-center">Editar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando">
            <td colspan="6" class="text-center py-6">
              <v-progress-circular indeterminate color="primary" />
            </td>
          </tr>
          <tr v-else-if="!terceros.length">
            <td colspan="6" class="text-center py-6 text-medium-emphasis">
              No hay registros para mostrar
            </td>
          </tr>
          <tr v-for="ter in terceros" :key="ter.Id">
            <td>{{ ter.identificacion }}</td>
            <td>{{ ter.Nombre }}</td>
            <td>{{ ter.Celular || '-' }}</td>
            <td>
              <v-chip :color="ter.Estado === 1 ? 'success' : 'error'" size="small">
                {{ ter.Estado === 1 ? 'Activo' : 'Inactivo' }}
              </v-chip>
            </td>
            <td>{{ formatearFecha(ter.FechaCreacion) }}</td>
            <td class="text-center">
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="irAEditar(idEmpresa, ter.Id)" />
            </td>
          </tr>
        </tbody>
      </v-table>

      <div class="d-flex align-center justify-center pa-4 ga-4">
        <v-btn v-if="pagina > 1" variant="outlined" @click="irPagina(pagina - 1)">
          Anterior
        </v-btn>
        <span>Página {{ pagina }} de {{ totalPaginas }}</span>
        <v-btn v-if="pagina < totalPaginas" variant="outlined" @click="irPagina(pagina + 1)">
          Siguiente
        </v-btn>
      </div>
    </v-card>
  </v-container>
</template>

<script>
import Swal from 'sweetalert2'
import terceroService from '@/services/terceroService'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'TercerosList',
  data() {
    return {
      cargando: false,
      terceros: [],
      cantData: 0,
      pagina: 1,
      filtros: {
        textoFiltro: '',
        campoOrdenar: 5,
        orden: 'DESC'
      },
      opcionesCampoOrdenar: [
        { valor: 1, texto: 'Nombre' },
        { valor: 2, texto: 'Apellidos' },
        { valor: 3, texto: 'Número de documento' },
        { valor: 4, texto: 'Email' },
        { valor: 5, texto: 'Fecha de creación' }
      ],
      opcionesOrden: [
        { valor: 'ASC', texto: 'Ascendente' },
        { valor: 'DESC', texto: 'Descendente' }
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
    this.consultar()
  },
  methods: {
    consultar() {
      this.buscar(1)
    },
    irPagina(pagina) {
      this.buscar(pagina)
    },

    async buscar(pagina) {
      if (!this.idEmpresa) {
        Swal.fire('Atención', 'Seleccione una empresa en la barra superior', 'warning')
        return
      }

      this.cargando = true
      try {
        const { data } = await terceroService.getAll({
          idEmpresa: this.idEmpresa,
          campoOrdenar: this.filtros.campoOrdenar,
          orden: this.filtros.orden,
          pagina,
          textoFiltro: this.filtros.textoFiltro || ''
        })
        this.terceros = data.data || []
        this.cantData = data.cantData || 0
        this.pagina = pagina
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo consultar los terceros'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.cargando = false
      }
    },

    irANuevo() {
      this.$router.push({ name: 'TercerosNuevo' })
    },

    irAEditar(EmpId, TerId) {
      this.$router.push({ name: 'TercerosEditar', params: { EmpId, TerId } })
    },

    formatearFecha(fecha) {
      if (!fecha) return ''
      return new Date(fecha).toLocaleDateString('es-CO')
    }
  }
}
</script>