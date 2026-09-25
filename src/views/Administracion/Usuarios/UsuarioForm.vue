<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 mb-4">{{ esEdicion ? 'Editar usuario' : 'Nuevo usuario' }}</h1>

    <v-card class="pa-6" max-width="560" elevation="1">
      <v-form ref="form" @submit.prevent="confirmar">
        <v-text-field
          v-model="nombres"
          label="Nombres"
          maxlength="150"
          counter="150"
          :rules="[reglas.requerido, reglas.maxNombre]"
          variant="outlined"
          class="mb-2"
        />

        <v-text-field
          v-model="apellidos"
          label="Apellidos"
          maxlength="150"
          counter="150"
          :rules="[reglas.requerido, reglas.maxNombre]"
          variant="outlined"
          class="mb-2"
        />

        <v-text-field
          v-model="usuario"
          label="Usuario"
          maxlength="50"
          counter="50"
          hint="Solo letras y números, sin espacios ni acentos"
          persistent-hint
          :rules="[reglas.requerido, reglas.maxUsuario, reglas.soloAlfanumerico]"
          variant="outlined"
          class="mb-2 mt-2"
        />

        <v-text-field
          v-if="!esEdicion"
          v-model="password"
          label="Contraseña"
          :type="mostrarPassword ? 'text' : 'password'"
          :append-inner-icon="mostrarPassword ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="mostrarPassword = !mostrarPassword"
          maxlength="10"
          counter="10"
          hint="Solo letras y números, sin espacios ni acentos"
          persistent-hint
          :rules="[reglas.requerido, reglas.maxPassword, reglas.soloAlfanumerico]"
          variant="outlined"
          class="mb-2 mt-2"
        />

        <v-select
          v-model="rol"
          :items="opcionesRol"
          item-title="texto"
          item-value="valor"
          label="Rol"
          :rules="[reglas.requerido]"
          variant="outlined"
          class="mb-2"
        />

        <v-select
          v-if="esEdicion"
          v-model="estado"
          :items="opcionesEstado"
          item-title="texto"
          item-value="valor"
          label="Estado"
          variant="outlined"
          class="mb-2"
        />

        <div v-if="esEdicion && fechaCreacion" class="mb-4">
          <div class="text-caption text-medium-emphasis" style="font-size: 11px;">
            Fecha creación: {{ fechaCreacionFormateada }}
          </div>
        </div>

        <div v-if="esEdicion && empresas.length" class="mb-4">
          <div class="text-caption text-medium-emphasis mb-1">Empresas asignadas</div>
          <v-table density="compact">
            <thead>
              <tr><th>Empresa</th></tr>
            </thead>
            <tbody>
              <tr v-for="emp in empresas" :key="emp.empId">
                <td>{{ emp.empNombre }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <div class="d-flex justify-end ga-2 mt-4">
          <v-btn variant="outlined" @click="cancelar">Cancelar</v-btn>
          <v-btn color="primary" :loading="guardando" type="submit">Confirmar</v-btn>
        </div>
      </v-form>
    </v-card>

    <v-card v-if="esEdicion" class="pa-6 mt-4" max-width="560" elevation="1">
      <h2 class="text-subtitle-1 mb-4">Cambiar contraseña</h2>
      <v-form ref="passForm" @submit.prevent="cambiarPassword">
        <v-row dense align="center">
          <v-col cols="12" sm="5">
            <v-text-field
              v-model="passwordActual"
              label="Contraseña actual"
              :type="mostrarPasswordActual ? 'text' : 'password'"
              :append-inner-icon="mostrarPasswordActual ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="mostrarPasswordActual = !mostrarPasswordActual"
              maxlength="10"
              :rules="[reglas.requerido, reglas.maxPassword, reglas.soloAlfanumerico]"
              variant="outlined"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" sm="5">
            <v-text-field
              v-model="passwordNueva"
              label="Contraseña nueva"
              :type="mostrarPasswordNueva ? 'text' : 'password'"
              :append-inner-icon="mostrarPasswordNueva ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="mostrarPasswordNueva = !mostrarPasswordNueva"
              maxlength="10"
              :rules="[reglas.requerido, reglas.maxPassword, reglas.soloAlfanumerico]"
              variant="outlined"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" sm="2" class="d-flex justify-end">
            <v-btn
              icon="mdi-lock-reset"
              color="primary"
              :loading="cambiandoPassword"
              type="submit"
              title="Cambiar contraseña"
            />
          </v-col>
        </v-row>
      </v-form>
    </v-card>
  </v-container>
</template>

<script>
import Swal from 'sweetalert2'
import usuarioService from '@/services/usuarioService'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'UsuarioForm',

  data() {
    return {
      nombres: '',
      apellidos: '',
      usuario: '',
      rol: null,
      estado: true,
      password: '',
      mostrarPassword: false,
      fechaCreacion: '',
      empresas: [],

      // cambio de contraseña (solo en edición)
      passwordActual: '',
      passwordNueva: '',
      mostrarPasswordActual: false,
      mostrarPasswordNueva: false,
      cambiandoPassword: false,

      cargando: false,
      guardando: false,

      opcionesRol: [
        { valor: 'ADMINISTRADOR', texto: 'Administrador' },
        { valor: 'VENDEDOR', texto: 'Vendedor' }
      ],
      opcionesEstado: [
        { valor: true, texto: 'Activo' },
        { valor: false, texto: 'Inactivo' }
      ],
      reglas: {
        requerido: (v) => !!v || 'Campo obligatorio',
        maxNombre: (v) => (v ? v.length <= 150 : true) || 'Máximo 150 caracteres',
        maxUsuario: (v) => (v ? v.length <= 50 : true) || 'Máximo 50 caracteres',
        maxPassword: (v) => (v ? v.length <= 10 : true) || 'Máximo 10 caracteres',
        soloAlfanumerico: (v) => /^[a-zA-Z0-9]+$/.test(v || '') || 'Solo letras y números, sin espacios ni acentos'
      }
    }
  },

  computed: {
    authStore() {
      return useAuthStore()
    },

    idEmpresa() {

      return this.authStore.empresaSeleccionada
      
    },

    esEdicion() {
      return this.$route.name === 'UsuarioEditar'
    },

    idUsuario() {
      return Number(this.$route.params.UsuId)
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
      this.cargarUsuario()
    }
  },

  methods: {
    async cargarUsuario() {
      this.cargando = true
      try {
        const { data } = await usuarioService.getById({
          idEmpresa: this.idEmpresa,
          idUsuario: this.idUsuario
        })

        const u = data.data.usuarioId
        this.nombres = u.usuNombre
        this.apellidos = u.usuApellido
        this.usuario = u.usuUsuario
        this.rol = u.usuRol
        this.estado = u.usuEstado === 1
        this.fechaCreacion = u.usuFecCreacion
        this.empresas = data.data.empresas || []
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo cargar el usuario'
        await Swal.fire('Error', mensaje, 'error')
        this.cancelar()
      } finally {
        this.cargando = false
      }
    },

    async confirmar() {
      const { valid } = await this.$refs.form.validate()
      if (!valid) return

      this.guardando = true
      try {
        if (this.esEdicion) {
          const { data } = await usuarioService.update({
            idEmpresa:this.idEmpresa,
            idUsuario: this.idUsuario,
            nombres: this.nombres,
            apellidos: this.apellidos,
            user: this.usuario,
            rol: this.rol,
            estado: this.estado
          })
          await Swal.fire('Éxito', data.msg || 'Datos actualizados', 'success')
        } else {
          const { data } = await usuarioService.create({
            nombres: this.nombres,
            apellidos: this.apellidos,
            user: this.usuario,
            password: this.password,
            rol: this.rol
          })
          await Swal.fire('Éxito', data.msg || 'Usuario creado', 'success')
        }
        this.$router.back()
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'Ocurrió un error al guardar el usuario'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.guardando = false
      }
    },

    async cambiarPassword() {
      const { valid } = await this.$refs.passForm.validate()
      if (!valid) return

      this.cambiandoPassword = true
      try {
        const { data } = await usuarioService.changePassword({
          idUsuario: this.idUsuario,
          pass: this.passwordActual,
          passNew: this.passwordNueva
        })
        await Swal.fire('Éxito', data.msg || 'Contraseña actualizada', 'success')
        this.passwordActual = ''
        this.passwordNueva = ''
        this.$refs.passForm.resetValidation()
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo cambiar la contraseña'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.cambiandoPassword = false
      }
    },

    cancelar() {
      this.$router.back()
    }
  }
}
</script>
