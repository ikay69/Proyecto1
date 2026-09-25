<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 mb-4">{{ esEdicion ? 'Editar tipo de producto' : 'Nuevo tipo de producto' }}</h1>

    <v-card class="pa-6" max-width="560" elevation="1">
      <v-form ref="form" @submit.prevent="confirmar">
        <v-text-field
          v-model="nombre"
          label="Nombre"
          maxlength="100"
          counter="100"
          :rules="[reglas.requerido]"
          variant="outlined"
          class="mb-2"
        />

        <v-select v-if="esEdicion"
          v-model="estado"
          :items="opcionesEstado"
          item-title="texto"
          item-value="valor"
          label="Estado"
          variant="outlined"
          class="mb-2"
        />

        <div v-if="esEdicion && usuario" class="mb-4">
          <div class="text-caption text-medium-emphasis">
            Creado por: <strong>{{ usuario }}</strong>
          </div>
          <div class="text-caption text-medium-emphasis" style="font-size: 11px;">
            Fecha creación: {{ fechaCreacionFormateada }}
          </div>
        </div>

        <div class="d-flex justify-end ga-2 mt-4">
          <v-btn variant="outlined" @click="cancelar">Cancelar</v-btn>
          <v-btn color="primary" :loading="guardando" type="submit">Confirmar</v-btn>
        </div>
      </v-form>
    </v-card>
  </v-container>
</template>

<script>
import Swal from 'sweetalert2'
import tipoProductoService from '@/services/tipoProductoService'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'TipoProductosForm',

  data() {
    return {
      nombre: '',
      estado: true,
      usuario: '',
      fechaCreacion: '',

      cargando: false,
      guardando: false,
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
      return this.$route.name === 'TipoProductosEditar'
    },

    idTipoProducto() {
      return Number(this.$route.params.TipProId)
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

  created() {
    if (this.esEdicion) {
      this.cargarTipoProducto()
    }
  },

  methods: {
    async cargarTipoProducto() {
      this.cargando = true
      try {
        const { data } = await tipoProductoService.getById({
          idEmpresa: this.idEmpresa,
          idTipoProducto: this.idTipoProducto
        })
        this.nombre = data.data.tipProNombre
        this.estado = data.data.tipProEstado === 1
        this.usuario = data.data.tipProUsuario
        this.fechaCreacion = data.data.tipProFecCreacion
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo cargar el tipo de producto'
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
          const { data } = await tipoProductoService.update({
            idEmpresa: this.idEmpresa,
            idTipoProducto: this.idTipoProducto,
            Nombre: this.nombre,
            Estado: this.estado
          })
          await Swal.fire('Éxito', data.msg || 'Tipo de producto actualizado', 'success')
        } else {
          const { data } = await tipoProductoService.create({
            idEmpresa: this.idEmpresa,
            Nombre: this.nombre
          })
          await Swal.fire('Éxito', data.msg || 'Tipo de producto creado', 'success')
        }
        this.$router.back()
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'Ocurrió un error al guardar el tipo de producto'
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