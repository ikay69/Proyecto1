<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 mb-4">{{ esEdicion ? 'Editar producto' : 'Nuevo producto' }}</h1>

    <v-card class="pa-6" max-width="600" elevation="1">
      <v-form ref="form" @submit.prevent="confirmar">
        <v-row dense>
          <!-- Fila 1: Nombre (Ocupa las dos columnas) -->
          <v-col cols="12">
            <v-text-field
              v-model="nombre"
              label="Nombre"
              maxlength="150"
              counter="150"
              :rules="[reglas.requerido]"
              variant="outlined"
              class="mb-2"
            />
          </v-col>

          <!-- Fila 2: Descripción (Ocupa las dos columnas) -->
          <v-col cols="12">
            <v-textarea
              v-model="descripcion"
              label="Descripción"
              maxlength="300"
              counter="300"
              rows="3"
              variant="outlined"
              class="mb-2"
            />
          </v-col>

          <!-- Fila 3: Tipo de producto y Categoría (Cada uno en una columna) -->
          <v-col cols="12" sm="6">
            <v-select
              v-model="idTipoProducto"
              :items="tiposProducto"
              item-title="tipProNombre"
              item-value="tipProId"
              label="Tipo de producto"
              :rules="[reglas.requerido]"
              :loading="cargandoListas"
              variant="outlined"
              class="mb-2"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-select
              v-model="idCategoria"
              :items="categorias"
              item-title="Nombre"
              item-value="Id"
              label="Categoría"
              :rules="[reglas.requerido]"
              :loading="cargandoListas"
              variant="outlined"
              class="mb-2"
            />
          </v-col>

          <!-- Fila 4: Unidad de medida y Tipo de seguimiento (Cada uno en una columna) -->
          <v-col cols="12" sm="6">
            <v-select
              v-model="idUnidadMedida"
              :items="unidadesMedida"
              item-title="uniMedNombre"
              item-value="uniMedId"
              label="Unidad de medida"
              :rules="[reglas.requerido]"
              :loading="cargandoListas"
              variant="outlined"
              class="mb-2"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-select
              v-model="tipoSeguimiento"
              :items="opcionesTipoSeguimiento"
              item-title="texto"
              item-value="valor"
              label="Tipo de seguimiento"
              :rules="[reglas.requerido]"
              variant="outlined"
              class="mb-2"
            />
          </v-col>

          <!-- Fila 5: Estado (Columna 1 activa, Columna 2 vacía) -->
          <v-col cols="12" sm="6">
            <v-select v-if="esEdicion"
              v-model="estado"
              :items="opcionesEstado"
              item-title="texto"
              item-value="valor"
              label="Estado"
              variant="outlined"
              class="mb-2"
            />
          </v-col>
          <v-col cols="12" sm="6" v-if="esEdicion"></v-col>

          <!-- Fila 6: Creado por y Fecha creación (Columna 1 activa, Columna 2 vacía) -->
          <v-col cols="12" sm="6">
            <div v-if="esEdicion && usuario" class="mb-4">
              <div class="text-caption text-medium-emphasis">
                Creado por: <strong>{{ usuario }}</strong>
              </div>
              <div class="text-caption text-medium-emphasis" style="font-size: 11px;">
                Fecha creación: {{ fechaCreacionFormateada }}
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" v-if="esEdicion && usuario"></v-col>

          <!-- Fila 7: Botones (Ocupa dos columnas alineados a la derecha) -->
          <v-col cols="12" class="d-flex justify-end ga-2 mt-2">
            <v-btn variant="outlined" @click="cancelar">Cancelar</v-btn>
            <v-btn color="primary" :loading="guardando" type="submit">Confirmar</v-btn>
          </v-col>
        </v-row>
      </v-form>
    </v-card>
  </v-container>
</template>


<script>
import Swal from 'sweetalert2'
import productoService from '@/services/productoService'
import tipoProductoService from '@/services/tipoProductoService'
import categoriaService from '@/services/categoriaService'
import unidadMedidaService from '@/services/unidadMedidaService'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'ProductosForm',

  data() {
    return {
      nombre: '',
      descripcion: '',
      idTipoProducto: null,
      idCategoria: null,
      idUnidadMedida: null,
      tipoSeguimiento: 'CANTIDAD',
      estado: true,
      usuario: '',
      fechaCreacion: '',

      tiposProducto: [],
      categorias: [],
      unidadesMedida: [],

      cargando: false,
      cargandoListas: false,
      guardando: false,
      opcionesTipoSeguimiento: [
        { valor: 'CANTIDAD', texto: 'Cantidad' },
        { valor: 'UNIDAD', texto: 'Unidad' }
      ],
      opcionesEstado: [
        { valor: true, texto: 'Activo' },
        { valor: false, texto: 'Inactivo' }
      ],
      reglas: {
        requerido: (v) => !!v || 'Campo obligatorio'
      }
    }
  },

  computed: {
    authStore() {
      return useAuthStore()
    },

    idEmpresa() {
      if (this.esEdicion) {
        return Number(this.$route.params.EmpId)
      } else {
        return this.authStore.empresaSeleccionada
      }
    },

    esEdicion() {
      return this.$route.name === 'ProductosEditar'
    },

    idProducto() {
      return Number(this.$route.params.ProdId)
    },

    fechaCreacionFormateada() {
      if (!this.fechaCreacion) return ''
      const fecha = new Date(this.fechaCreacion)
      return fecha.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  },

  async created() {
    await this.cargarListas()
    if (this.esEdicion) {
      this.cargarProducto()
    }
  },

  methods: {
    async cargarListas() {
      this.cargandoListas = true
      try {
        const [resTipos, resCategorias, resUnidades] = await Promise.all([
          tipoProductoService.getActivas({ idEmpresa: this.idEmpresa }),
          categoriaService.getActivas({ idEmpresa: this.idEmpresa }),
          unidadMedidaService.getActivas({ idEmpresa: this.idEmpresa })
        ])
        this.tiposProducto = resTipos.data.data || []
        this.categorias = resCategorias.data.data || []
        this.unidadesMedida = resUnidades.data.data || []
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudieron cargar las listas de tipo de producto, categoría o unidad de medida'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.cargandoListas = false
      }
    },

    async cargarProducto() {
      this.cargando = true
      try {
        const { data } = await productoService.getById({
          idEmpresa: this.idEmpresa,
          idProducto: this.idProducto
        })
        this.nombre = data.data.proNombre
        this.descripcion = data.data.proDescripcion
        this.idTipoProducto = data.data.proTipoProductoId
        this.idCategoria = data.data.proCategoriaId
        this.idUnidadMedida = data.data.proUnidadMedidaId
        this.estado = data.data.proEstado === 1
        this.usuario = data.data.proUsuario
        this.fechaCreacion = data.data.proFecCreacion

        // Si el tipo de producto ya no está activo, lo agregamos igual
        // para que el combo lo muestre seleccionado correctamente.
        const existeTipo = this.tiposProducto.some((tp) => tp.tipDocId === data.data.proTipoProductoId)
        if (!existeTipo) {
          this.tiposProducto.push({
            tipDocId: data.data.proTipoProductoId,
            tipDocNombre: data.data.proTipoProductoNombre
          })
        }

        // Mismo caso para categoría...
        const existeCategoria = this.categorias.some((c) => c.Id === data.data.proCategoriaId)
        if (!existeCategoria) {
          this.categorias.push({
            Id: data.data.proCategoriaId,
            Nombre: data.data.proCategoriaNombre
          })
        }

        // ...y para unidad de medida.
        const existeUnidad = this.unidadesMedida.some((u) => u.uniMedId === data.data.proUnidadMedidaId)
        if (!existeUnidad) {
          this.unidadesMedida.push({
            uniMedId: data.data.proUnidadMedidaId,
            uniMedNombre: data.data.proUnidadMedidaNombre
          })
        }
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo cargar el producto'
        await Swal.fire('Error', mensaje, 'error')
        this.cancelar()
      } finally {
        this.cargando = false
      }
    },

    async confirmar() {
      const { valid } = await this.$refs.form.validate()
      if (!valid) return

      if (!this.idEmpresa) {
        Swal.fire('Atención', 'Seleccione una empresa en la barra superior', 'warning')
        return
      }

      this.guardando = true
      try {
        if (this.esEdicion) {
          const { data } = await productoService.update({
            idEmpresa: this.idEmpresa,
            idProducto: this.idProducto,
            Nombre: this.nombre,
            Descripcion: this.descripcion,
            idTipoProducto: this.idTipoProducto,
            idCategoria: this.idCategoria,
            idUnidadMedida: this.idUnidadMedida,
            TipoSeguimiento: this.tipoSeguimiento,
            Estado: this.estado
          })
          await Swal.fire('Éxito', data.msg || 'Producto actualizado', 'success')
        } else {
          const { data } = await productoService.create({
            idEmpresa: this.idEmpresa,
            Nombre: this.nombre,
            Descripcion: this.descripcion,
            idTipoProducto: this.idTipoProducto,
            idCategoria: this.idCategoria,
            idUnidadMedida: this.idUnidadMedida,
            TipoSeguimiento: this.tipoSeguimiento
          })
          await Swal.fire('Éxito', data.msg || 'Producto creado', 'success')
        }
        this.$router.back()
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'Ocurrió un error al guardar el producto'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.guardando = false
      }
    },

    cancelar() {
      this.$router.back()
    }
  }
}
</script>