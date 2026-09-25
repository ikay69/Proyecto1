<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 mb-4">{{ esEdicion ? 'Editar tercero' : 'Nuevo tercero' }}</h1>

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

        <v-text-field
          v-model="apellidos"
          label="Apellidos"
          maxlength="150"
          counter="150"
          :rules="[reglas.requerido]"
          variant="outlined"
          class="mb-2"
        />

        <v-select
          v-model="idTipoDocumento"
          :items="tiposDocumento"
          item-title="tipDocNombre"
          item-value="tipDocId"
          label="Tipo de documento"
          :rules="[reglas.requerido]"
          :loading="cargandoListas"
          variant="outlined"
          class="mb-2"
        />

        <v-text-field
          v-model="numeroDocumento"
          label="Número de documento"
          maxlength="50"
          counter="50"
          :rules="[reglas.requerido]"
          variant="outlined"
          class="mb-2"
        />

        <v-text-field
          v-model="celular"
          label="Celular"
          maxlength="10"
          counter="10"
          :rules="[reglas.celular]"
          variant="outlined"
          class="mb-2"
        />

        <v-text-field
          v-model="email"
          label="Email"
          maxlength="150"
          type="email"
          variant="outlined"
          class="mb-2"
        />

        <v-text-field
          v-model="direccion"
          label="Dirección"
          maxlength="20"
          counter="20"
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
import terceroService from '@/services/terceroService'
import tipoDocumentoService from '@/services/tipoDocumentoService'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'TercerosForm',

  data() {
    return {
      nombre: '',
      apellidos: '',
      idTipoDocumento: null,
      numeroDocumento: '',
      celular: '',
      email: '',
      direccion: '',
      estado: true,
      usuario: '',
      fechaCreacion: '',

      tiposDocumento: [],

      cargando: false,
      cargandoListas: false,
      guardando: false,
      opcionesEstado: [
        { valor: true, texto: 'Activo' },
        { valor: false, texto: 'Inactivo' }
      ],
      reglas: {
        requerido: (v) => !!v || 'Campo obligatorio',
        celular: (v) => !v || v.length === 10 || 'Debe tener exactamente 10 caracteres'
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
      return this.$route.name === 'TercerosEditar'
    },

    idTercero() {
      return Number(this.$route.params.TerId)
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
    await this.cargarTiposDocumento()
    if (this.esEdicion) {
      this.cargarTercero()
    }
  },

  methods: {
    async cargarTiposDocumento() {
      this.cargandoListas = true
      try {
        const { data } = await tipoDocumentoService.getActivas({ idEmpresa: this.idEmpresa })
        this.tiposDocumento = data.data || []
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo cargar la lista de tipos de documento'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.cargandoListas = false
      }
    },

    async cargarTercero() {
      this.cargando = true
      try {
        const { data } = await terceroService.getById({
          idEmpresa: this.idEmpresa,
          idTercero: this.idTercero
        })
        this.nombre = data.data.terNombres
        this.apellidos = data.data.terApellidos
        this.idTipoDocumento = data.data.terTipDocId
        this.numeroDocumento = data.data.terNumDoc
        this.celular = data.data.terCelular
        this.email = data.data.terEmail
        this.direccion = data.data.terDireccion
        this.estado = data.data.terEstado === 1
        this.usuario = data.data.terUsuario
        this.fechaCreacion = data.data.terFecCreacion

        // Si el tipo de documento del tercero ya no está activo (no vino
        // en la lista de getActivas), lo agregamos igual para que el
        // combo lo muestre seleccionado correctamente.
        const existe = this.tiposDocumento.some((td) => td.tipDocId === data.data.terTipDocId)
        if (!existe) {
          this.tiposDocumento.push({
            tipDocId: data.data.terTipDocId,
            tipDocNombre: data.data.terTipDocNombre
          })
        }
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo cargar el tercero'
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
          const { data } = await terceroService.update({
            idEmpresa: this.idEmpresa,
            idTercero: this.idTercero,
            Nombre: this.nombre,
            Apellidos: this.apellidos,
            idTipoDocumento: this.idTipoDocumento,
            NumeroDocumento: this.numeroDocumento,
            Estado: this.estado,
            Celular: this.celular,
            Email: this.email,
            Direccion: this.direccion
          })
          await Swal.fire('Éxito', data.msg || 'Tercero actualizado', 'success')
        } else {
          const { data } = await terceroService.create({
            idEmpresa: this.idEmpresa,
            Nombre: this.nombre,
            Apellidos: this.apellidos,
            idTipoDocumento: this.idTipoDocumento,
            NumeroDocumento: this.numeroDocumento,
            Celular: this.celular,
            Email: this.email,
            Direccion: this.direccion
          })
          await Swal.fire('Éxito', data.msg || 'Tercero creado', 'success')
        }
        this.$router.back()
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'Ocurrió un error al guardar el tercero'
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