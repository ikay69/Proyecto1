<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 mb-4">Asignar usuario a empresa</h1>
    <v-card class="pa-6" max-width="600" elevation="1">
      <v-form ref="form" @submit.prevent="confirmar">
        <v-row dense>
          <!--fila 1-->
          <v-col cols="12">
            <v-select
                v-model="idUsuario"
                :items="usuarios"
                item-title="usuUsuario"
                item-value="usuId"
                label="Usuario para asignarlo"
                :rules="[reglas.requerido]"
                :loading="cargandoListas"
                :no-data-text="cargandoListas ? 'Cargando...' : 'No hay usuarios disponibles'"
                variant="outlined"
                class="mb-2"
            />
          </v-col>
 
          <!--boton-->
          <v-col cols="12" class="d-flex justify-end ga-2 mt-2">
            <v-btn color="primary" :loading="guardando" type="submit">Confirmar</v-btn>
          </v-col>
 
 
        </v-row>
      </v-form>
    </v-card>
 
    <h1 class="text-h5 mb-4 mt-4">Usuarios en mi empresa</h1>
    <v-card elevation="1">
      <v-table>
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Fecha creación</th>
          </tr>
        </thead>
 
        <tbody>
          <tr v-if="cargando">
            <td colspan="5" class="text-center py-6">
              <v-progress-circular indeterminate color="primary" />
            </td>
          </tr>
 
          <tr v-else-if="!usuariosMios.length">
            <td colspan="5" class="text-center py-6 text-medium-emphasis">
              No hay registros para mostrar
            </td>
          </tr>
 
          <tr v-for="usuMio in usuariosMios" :key="usuMio.usuMioId">
            <td>{{ usuMio.usuMioUsuario }}</td>
            <td>{{ usuMio.usuMioNombre }}</td>
            <td>{{ usuMio.usuMioRol }}</td>
            <td>
              <v-chip :color="usuMio.usuMioEstado === 1 ? 'success' : 'error'" size="small">
                {{ usuMio.usuMioEstado === 1 ? 'Activo' : 'Inactivo' }}
              </v-chip>
            </td>
            <td>{{ formatearFecha(usuMio.usuMioFecCreacion) }}</td>
          </tr>
 
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>


<script>
import Swal from 'sweetalert2'
import { useAuthStore } from '@/stores/auth'
import usuarioEmpresaService from '@/services/Usuarioempresaservice'

 
export default {
  name: 'AsignacionUsuario',
 
  data(){
    return{
      usuarios:[],      // donde carga los usuarios
      idUsuario:null,   //usario seleccionado
      cargandoListas: false,
      guardando: false,
      cargando:false,
 
      usuariosMios : [], //usuarios que estan en mi empresa
 
 
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
      return this.authStore.empresaSeleccionada
    },
  },
 
  async created() {
    this.checkToken();
    if (!this.idEmpresa) {
      Swal.fire('Atención', 'Seleccione una empresa en la barra superior', 'warning')
      return
    }
    await this.cargarLista()
    await this.cargarUsuariosMios()
  },
 
  methods:{
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
    async cargarLista(){
      this.cargandoListas = true
      try {
 
        const { data } = await usuarioEmpresaService.getSinMiEmpresa({
          idEmpresa: this.idEmpresa
        })
 
        this.usuarios = (data.data || []).map(u => ({
          usuId: u.Id,
          usuUsuario: `${u.userName} - ${u.Rol}`
        }))
 
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo consultar los usuarios'
        Swal.fire('Error', mensaje,'error')
      }finally{
        this.cargandoListas = false
      }
 
    },
 
    async cargarUsuariosMios(){
      this.cargando = true
      try {
 
        const { data } = await usuarioEmpresaService.getConMiEmpresa({
          idEmpresa: this.idEmpresa
        })
 
        this.usuariosMios = data.data || []
 
      } catch (error) {
        const mensaje  = error.response?.data?.msg || 'No se pudo consultar los usuarios'
        Swal.fire('Error',mensaje,'error')
      }finally{
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
        const { data } = await usuarioEmpresaService.create({
          idEmpresa: this.idEmpresa,
          idUsuario: this.idUsuario
        })
 
        await Swal.fire('Éxito', data.msg || 'Usuario asignado', 'success')
 
        this.idUsuario = null
        this.$refs.form.resetValidation()
 
        // recargar tabla y combo (el usuario asignado ya no debe salir en el combo)
        await this.cargarUsuariosMios()
        await this.cargarLista()
 
      } catch (error) {
        const mensaje  = error.response?.data?.msg || 'No se pudo asignar el usuario'
        Swal.fire('Error',mensaje,'error')
      }finally{
        this.guardando = false
      }
 
    },
 
    formatearFecha(fecha) {
      if (!fecha) return ''
      return new Date(fecha).toLocaleDateString('es-CO')
    }
  }
 
}
</script>
