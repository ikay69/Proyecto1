<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <h1 class="text-h5">Ventas</h1>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="irANuevo">
        Agregar
      </v-btn>

      
    </div>


    <v-card class="pa-4 mb-4" elevation="1">
      <v-row dense align="center">
        <v-col cols="12">
          <div class="mb-1 text-subtitle-2">Cliente</div>
          <div class="d-flex align-center ga-2 mb-4">
            <v-btn icon="mdi-arrow-right" variant="tonal" @click="mostrarSelectorTercero = true"></v-btn>
            <p v-if="NombreTercero" class="mb-0 flex-grow-1">
              <strong>Identificación:</strong> {{ DocumentosTercero }} &nbsp;&nbsp;&nbsp;&nbsp; <strong>Nombre: </strong>{{ NombreTercero }}
            </p>
          </div>
        </v-col>
      </v-row>

      <v-row dense align="center">
          <v-col cols="12">
            <div class="mb-1 text-subtitle-2">Articulo</div>
            <div class="d-flex align-center ga-2 mb-4">
              <v-btn icon="mdi-arrow-right" variant="tonal" @click="mostrarSelectorArticulo  = true"></v-btn>
              <p v-if="articuloNombre" class="mb-0 flex-grow-1">
                <strong>Sku:</strong> {{articuloSku}} <strong>Art:</strong> {{ articuloNombre }} - {{articuloUnidadMedida}} - {{articuloPropiedades }}
              </p>
          </div>
        </v-col>
      </v-row>

      <v-row dense align="center">
          <v-col cols="12">
            <div class="mb-1 text-subtitle-2">Articulo a vender</div>
            <div class="d-flex align-center ga-2 mb-4">
              <v-btn icon="mdi-arrow-right" variant="tonal" @click="mostrarSelectorArticuloVendible = true"></v-btn>
              <p v-if="articuloVendibleNombre" class="mb-0 flex-grow-1">
                <strong>Sku:</strong> {{articuloVendibleSku}} <strong>Art:</strong> {{ articuloVendibleNombre }} &nbsp;&nbsp; <strong>Bodega:</strong> {{ articuloVendibleBodegaNombre }} &nbsp;&nbsp; <strong>Disponible:</strong> {{ articuloVendibleDisponible }}
              </p>
          </div>
        </v-col>
      </v-row>


  </v-card>
    

    <TercerosSeleccionar
      v-model="mostrarSelectorTercero"
      :id-empresa="idEmpresa"
      @seleccionar="onTerceroSeleccionado"
    />



    <ArticulosSeleccionar
      v-model="mostrarSelectorArticulo"
      :id-empresa="idEmpresa"
      @seleccionar="onArticuloSeleccionado"
    />

    <ArticulosVendibles
      v-model="mostrarSelectorArticuloVendible"
      :id-empresa="idEmpresa"
      @seleccionar="onArticuloVendibleSeleccionado"
    />

  </v-container>
</template>

<script>
import Swal from 'sweetalert2'
import { useAuthStore } from '@/stores/auth'
import TercerosSeleccionar from '@/views/Terceros/TercerosSeleccionar.vue'
import ArticulosSeleccionar from '@/views/Inventario/Articulos/ArticulosSeleccionar.vue'
import ArticulosVendibles from '@/views/Inventario/Articulos/ArticulosVendibles.vue'

export default {
  name: 'Ventas',

  components: { TercerosSeleccionar ,ArticulosSeleccionar, ArticulosVendibles},

  data() {
    return {
      mostrarSelectorTercero: false,
      
      idTercero: 0,
      DocumentosTercero:'',
      NombreTercero: '',

      mostrarSelectorArticulo:false,
      idArticulo :0,
      articuloNombre:'',
      articuloSku:'',
      articuloPropiedades:'',
      articuloUnidadMedida:'',

      // articulo elegido por ArticulosVendibles: solo activos, para vender, propios y con
      // existencia disponible. Aqui el articulo viene SIEMPRE con su bodega, porque la fila
      // que se selecciona es un par (articulo, bodega).
      mostrarSelectorArticuloVendible:false,
      idArticuloVendible :0,
      articuloVendibleNombre:'',
      articuloVendibleSku:'',
      articuloVendibleBodegaId:0,
      articuloVendibleBodegaNombre:'',
      articuloVendibleDisponible:0,
      articuloVendiblePrecio:0
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
    onTerceroSeleccionado(tercero) {
      console.log(tercero)
      this.idTercero = tercero.Id
      this.NombreTercero = tercero.Nombre
      this.DocumentosTercero = tercero.identificacion
      // ter.identificacion y ter.Celular tambien vienen disponibles si los necesitas
    },

    onArticuloSeleccionado(articulo) {
      this.idArticulo = articulo.artId
      this.articuloNombre = articulo.artNombre
      this.articuloSku  = articulo.artSKU
      this.articuloPropiedades = articulo.artPropiedades
      this.articuloUnidadMedida = articulo.artUnidadMedida
    },

    onArticuloVendibleSeleccionado(articulo) {
      this.idArticuloVendible = articulo.artId
      this.articuloVendibleNombre = articulo.artNombre
      this.articuloVendibleSku = articulo.artSKU
      this.articuloVendibleBodegaId = articulo.artBodegaId
      this.articuloVendibleBodegaNombre = articulo.artBodegaNombre
      this.articuloVendibleDisponible = articulo.artCantidadDisponible
      this.articuloVendiblePrecio = articulo.artPrecio
    },

    irANuevo() {
      Swal.fire('Atención', 'En proceso de construcción', 'warning')
    }
  }
}
</script>