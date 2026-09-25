<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <h1 class="text-h5">Artículos</h1>
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
            maxlength="150"
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
            <th>SKU</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Tipo de producto</th>
            <th>Propiedades</th>
            <th>Precio</th>
            <th>Vender</th>
            <th>Estado</th>
            <th class="text-center">Editar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando">
            <td colspan="8" class="text-center py-6">
              <v-progress-circular indeterminate color="primary" />
            </td>
          </tr>
          <tr v-else-if="!articulos.length">
            <td colspan="8" class="text-center py-6 text-medium-emphasis">
              No hay registros para mostrar
            </td>
          </tr>
          <tr v-for="art in articulos" :key="art.artId">
            <td>{{ art.artSKU }}</td>
            <td>{{ art.artNombre }} </td>
            <td>{{ art.artCategoria }}</td>
            <td>{{ art.artTipoProducto }}</td>
            <td class="columna-ajustable-text">{{art.artPropiedades}}</td>
            <td>{{ formatearPrecio(art.artPrecio) }}</td>
            <td>
              <v-chip :color="art.artVender === 1 ? 'success' : 'default'" size="small">
                {{ art.artVender === 1 ? 'Sí' : 'No' }}
              </v-chip>
            </td>
            <td>
              <v-chip :color="art.artEstado === 1 ? 'success' : 'error'" size="small">
                {{ art.artEstado === 1 ? 'Activo' : 'Inactivo' }}
              </v-chip>
            </td>
            <td class="text-center">
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="irAEditar(idEmpresa, art.artId)" />
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
import articuloService from '@/services/articuloService'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'ArticulosList',
  data() {
    return {
      cargando: false,
      articulos: [],
      cantData: 0,
      pagina: 1,
      filtros: {
        textoFiltro: '',
        campoOrdenar: 4,
        orden: 'DESC'
      },
      opcionesCampoOrdenar: [
        { valor: 1, texto: 'Nombre' },
        { valor: 2, texto: 'SKU' },
        { valor: 3, texto: 'Descripción' },
        { valor: 4, texto: 'Fecha de creación' }
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
        const { data } = await articuloService.getAll({
          idEmpresa: this.idEmpresa,
          campoOrdenar: this.filtros.campoOrdenar,
          orden: this.filtros.orden,
          pagina,
          textoFiltro: this.filtros.textoFiltro || ''
        })
        this.articulos = data.data || []
        this.cantData = data.cantData || 0
        this.pagina = pagina
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo consultar los artículos'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.cargando = false
      }
    },

    irANuevo() {
      this.$router.push({ name: 'ArticulosNuevo' })
    },

    irAEditar(EmpId, ArtId) {
      this.$router.push({ name: 'ArticulosEditar', params: { EmpId, ArtId } })
    },

    formatearPrecio(valor) {
      const n = Number(valor)
      if (Number.isNaN(n)) return valor
      return n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  }
}
</script>

<style scoped>
  .columna-ajustable-text {
    /* Establece el ancho fijo que desees */
    max-width: 200px; 
    width: 200px;
    
    /* Fuerza el salto de línea si el texto es muy largo o no tiene espacios */
    white-space: normal !important;
    word-wrap: break-word;
    word-break: break-word;
  }
</style>