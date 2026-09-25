<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 mb-4">{{ esEdicion ? 'Editar bodega' : 'Nueva bodega' }}</h1>

    <v-card class="pa-6" max-width="560" elevation="1">
      <v-form ref="form" @submit.prevent="confirmar">
        <v-text-field
          v-model="nombre"
          label="Nombre"
          maxlength="150"
          counter="150"
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
import bodegaService from '@/services/bodegaService'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'BodegasForm',

  data() {
    return {
      nombre: '',
      estado: true,
      usuario: '',
      fechaCreacion: '',

      cargando: false,
      guardando: false,
      opcionesEstado: [
        { valor: true, texto: 'Activa' },
        { valor: false, texto: 'Inactiva' }
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
      return this.$route.name === 'BodegasEditar'
    },

    idBodega() {
      return Number(this.$route.params.BodId)
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
      this.cargarBodega()
    }
  },

  methods: {
    async cargarBodega() {
      this.cargando = true
      try {
        const { data } = await bodegaService.getById({
          idEmpresa: this.idEmpresa,
          idBodega: this.idBodega
        })
        this.nombre = data.data.bodNombre
        this.estado = data.data.bodEstado === 1
        this.usuario = data.data.bodUsuario
        this.fechaCreacion = data.data.bodFecCreacion
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo cargar la bodega'
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
          const { data } = await bodegaService.update({
            idEmpresa: this.idEmpresa,
            idBodega: this.idBodega,
            Nombre: this.nombre,
            Estado: this.estado
          })
          await Swal.fire('Éxito', data.msg || 'Bodega actualizada', 'success')
        } else {
          const { data } = await bodegaService.create({
            idEmpresa: this.idEmpresa,
            Nombre: this.nombre
          })
          await Swal.fire('Éxito', data.msg || 'Bodega creada', 'success')
        }
        this.$router.back()
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'Ocurrió un error al guardar la bodega'
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