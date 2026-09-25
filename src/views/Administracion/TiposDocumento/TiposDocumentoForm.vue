<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 mb-4">{{ esEdicion ? 'Editar tipo de documento' : 'Nuevo tipo de documento' }}</h1>

    <v-card class="pa-6" max-width="560" elevation="1">
      <v-form ref="form" @submit.prevent="confirmar">
        <v-text-field
          v-model="abreviatura"
          label="Abreviatura"
          maxlength="10"
          counter="10"
          :rules="[reglas.requerido]"
          variant="outlined"
          class="mb-2"
        />

        <v-text-field
          v-model="descripcion"
          label="Descripción"
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
import tipoDocumentoService from '@/services/tipoDocumentoService'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'TiposDocumentoForm',

  data() {
    return {
      abreviatura: '',
      descripcion: '',
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
      return this.$route.name === 'TiposDocumentoEditar'
    },

    idTipoDocumento() {
      return Number(this.$route.params.TipDocId)
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
      this.cargarTipoDocumento()
    }
  },

  methods: {
    async cargarTipoDocumento() {
      this.cargando = true
      try {
        const { data } = await tipoDocumentoService.getById({
          idEmpresa: this.idEmpresa,
          idTipoDocumento: this.idTipoDocumento
        })
        this.abreviatura = data.data.tipDocAbreviatura
        this.descripcion = data.data.tipDocNombre
        this.estado = data.data.tipDocEstado === 1
        this.usuario = data.data.tipDocUsuario
        this.fechaCreacion = data.data.tipDocFecCreacion
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo cargar el tipo de documento'
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
          const { data } = await tipoDocumentoService.update({
            idEmpresa: this.idEmpresa,
            idTipoDocumento: this.idTipoDocumento,
            Abreviatura: this.abreviatura,
            Descripcion: this.descripcion,
            Estado: this.estado
          })
          await Swal.fire('Éxito', data.msg || 'Tipo de documento actualizado', 'success')
        } else {
          const { data } = await tipoDocumentoService.create({
            idEmpresa: this.idEmpresa,
            Abreviatura: this.abreviatura,
            Descripcion: this.descripcion
          })
          await Swal.fire('Éxito', data.msg || 'Tipo de documento creado', 'success')
        }
        this.$router.back()
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'Ocurrió un error al guardar el tipo de documento'
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