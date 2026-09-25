<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 mb-4">{{ esEdicion ? 'Editar unidad de medida' : 'Nueva unidad de medida' }}</h1>

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

        <v-text-field
          v-model="simbolo"
          label="Símbolo"
          maxlength="10"
          counter="10"
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
import unidadMedidaService from '@/services/unidadMedidaService'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'UnidadesMedidaForm',

  data() {
    return {
      nombre: '',
      simbolo: '',
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
      return this.$route.name === 'UnidadesMedidaEditar'
    },

    idUnidadMedida() {
      return Number(this.$route.params.UniMedId)
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
      this.cargarUnidadMedida()
    }
  },

  methods: {
    async cargarUnidadMedida() {
      this.cargando = true
      try {
        const { data } = await unidadMedidaService.getById({
          idEmpresa: this.idEmpresa,
          idUnidadMedida: this.idUnidadMedida
        })
        this.nombre = data.data.uniMedNombre
        this.simbolo = data.data.uniMedSimbolo
        this.estado = data.data.uniMedEstado === 1
        this.usuario = data.data.uniMedUsuario
        this.fechaCreacion = data.data.uniMedFecCreacion
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo cargar la unidad de medida'
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
          const { data } = await unidadMedidaService.update({
            idEmpresa: this.idEmpresa,
            idUnidadMedida: this.idUnidadMedida,
            Nombre: this.nombre,
            Simbolo: this.simbolo,
            Estado: this.estado
          })
          await Swal.fire('Éxito', data.msg || 'Unidad de medida actualizada', 'success')
        } else {
            console.log("nombre ",this.nombre," simbolo ", this.simbolo)
          const { data } = await unidadMedidaService.create({
            idEmpresa: this.idEmpresa,
            Nombre: this.nombre,
            Simbolo: this.simbolo
          })
          await Swal.fire('Éxito', data.msg || 'Unidad de medida creada', 'success')
        }
        this.$router.back()
      } catch (error) {
        console.log(error)
        const mensaje = error.response?.data?.msg || 'Ocurrió un error al guardar la unidad de medida'
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