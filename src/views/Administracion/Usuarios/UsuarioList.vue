<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <h1 class="text-h5">Usuarios</h1>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="irANuevo">
        Agregar
      </v-btn>
    </div>

    <v-card elevation="1">
      <v-table>
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Nombres</th>
            <th>Apellidos</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Fecha de creación</th>
            <th class="text-center">Editar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando">
            <td colspan="7" class="text-center py-6">
              <v-progress-circular indeterminate color="primary" />
            </td>
          </tr>
          <tr v-else-if="!usuarios.length">
            <td colspan="7" class="text-center py-6 text-medium-emphasis">
              No hay registros para mostrar
            </td>
          </tr>
          <tr v-for="usu in usuarios" :key="usu.usuid">
            <td>{{ usu.usuUsuario }}</td>
            <td>{{ usu.usuNombres }}</td>
            <td>{{ usu.usuApellidos }}</td>
            <td>{{ usu.usuRol }}</td>
            <td>
              <v-chip :color="usu.usuEstado === 1 ? 'success' : 'error'" size="small">
                {{ usu.usuEstado === 1 ? 'Activo' : 'Inactivo' }}
              </v-chip>
            </td>
            <td>{{ formatearFecha(usu.usuFecCreacion) }}</td>
            <td class="text-center">
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="irAEditar(usu.usuid)" />
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
import usuarioService from '@/services/usuarioService'

export default {
  name: 'UsuarioList',

  data() {
    return {
      cargando: false,
      usuarios: [],
      cantData: 0,
      pagina: 1
    }
  },

  computed: {
    totalPaginas() {
      return Math.max(1, Math.ceil(this.cantData / 50))
    }
  },

  created() {
    this.checkToken();
    this.buscar(1)
  },

  methods: {
    checkToken(){
      if(!this.authStore.token){
        this.authStore.logout();
        this.$router.push({ name: 'Login' })
      }
      console.log(this.authStore.rol)
      if(this.authStore.rol !=='ADMINISTRADOR'){
        this.$router.push({ name: 'Inicio' })
      }
    },
    irPagina(pagina) {
      this.buscar(pagina)
    },

    async buscar(pagina) {
      this.cargando = true
      try {
        const { data } = await usuarioService.getAll({ pagina })
        this.usuarios = data.data || []
        this.cantData = data.cantData || 0
        this.pagina = pagina
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo consultar los usuarios'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.cargando = false
      }
    },

    irANuevo() {
      this.$router.push({ name: 'UsuarioNuevo' })
    },

    irAEditar(UsuId) {
      this.$router.push({ name: 'UsuarioEditar', params: { UsuId } })
    },

    formatearFecha(fecha) {
      if (!fecha) return ''
      return new Date(fecha).toLocaleDateString('es-CO')
    }
  }
}
</script>
