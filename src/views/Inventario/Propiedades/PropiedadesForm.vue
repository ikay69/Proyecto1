<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 mb-4">{{ esEdicion ? 'Editar propiedad' : 'Nueva propiedad' }}</h1>

    <v-card class="pa-6" max-width="560" elevation="1">
      <v-form ref="form" @submit.prevent="confirmar">
        <v-text-field
          v-model="nombre"
          label="Nombre"
          maxlength="50"
          counter="50"
          :rules="[reglas.requerido]"
          variant="outlined"
          class="mb-2"
        />

        <v-select
          v-model="tipoDato"
          :items="opcionesTipoDato"
          item-title="texto"
          item-value="valor"
          label="Tipo de dato"
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
import propiedadService from '@/services/propiedadService'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'PropiedadesForm',

  data() {
    return {
      nombre: '',
      tipoDato: 'TEXTO',
      estado: true,
      usuario: '',
      fechaCreacion: '',

      cargando: false,
      guardando: false,
      opcionesTipoDato: [
        { valor: 'TEXTO', texto: 'Texto' },
        { valor: 'NUMERO', texto: 'Número' }
      ],
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
      return this.$route.name === 'PropiedadesEditar'
    },

    idPropiedad() {
      return Number(this.$route.params.PropId)
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
      this.cargarPropiedad()
    }
  },

  methods: {
    async cargarPropiedad() {
      this.cargando = true
      try {
        const { data } = await propiedadService.getById({
          idEmpresa: this.idEmpresa,
          idPropiedad: this.idPropiedad
        })
        this.nombre = data.data.proNombre
        this.tipoDato = data.data.proTipoDato
        this.estado = data.data.proEstado === 1
        this.usuario = data.data.proUsuario
        this.fechaCreacion = data.data.proFecCreacion
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo cargar la propiedad'
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
          const { data } = await propiedadService.update({
            idEmpresa: this.idEmpresa,
            idPropiedad: this.idPropiedad,
            Nombre: this.nombre,
            TipoDato: this.tipoDato,
            Estado: this.estado
          })
          await Swal.fire('Éxito', data.msg || 'Propiedad actualizada', 'success')
        } else {
          const { data } = await propiedadService.create({
            idEmpresa: this.idEmpresa,
            Nombre: this.nombre,
            TipoDato: this.tipoDato
          })
          await Swal.fire('Éxito', data.msg || 'Propiedad creada', 'success')
        }
        this.$router.back()
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'Ocurrió un error al guardar la propiedad'
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