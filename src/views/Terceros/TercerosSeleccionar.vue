<template>
  <v-dialog v-model="dialogVisible" max-width="900" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Seleccionar tercero</span>
        <v-btn icon="mdi-close" variant="text" @click="cerrar" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-4">
        <v-row dense align="center" class="mb-2">
          <v-col cols="12" sm="4">
            <v-text-field
              v-model="filtros.textoFiltro"
              label="Buscar"
              maxlength="10"
              :disabled="filtros.campoOrdenar === 5"
              :hint="filtros.campoOrdenar === 5 ? 'No aplica al ordenar por fecha de creación' : ''"
              persistent-hint
              clearable
              density="compact"
              variant="outlined"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="6" sm="4">
            <v-select
              v-model="filtros.campoOrdenar"
              :items="opcionesCampoOrdenar"
              item-title="texto"
              item-value="valor"
              label="Ordenar por"
              density="compact"
              variant="outlined"
              hide-details
            />
          </v-col>
          <v-col cols="6" sm="2">
            <v-select
              v-model="filtros.orden"
              :items="opcionesOrden"
              item-title="texto"
              item-value="valor"
              label="Orden"
              density="compact"
              variant="outlined"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="2">
            <v-btn color="primary" variant="tonal" block @click="consultar">
              Buscar
            </v-btn>
          </v-col>
        </v-row>

        <v-table density="compact">
          <thead>
            <tr>
              <th class="text-center" style="width: 56px;">Sel.</th>
              <th>Identificación</th>
              <th>Nombre</th>
              <th>Celular</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando">
              <td colspan="4" class="text-center py-6">
                <v-progress-circular indeterminate color="primary" />
              </td>
            </tr>
            <tr v-else-if="!terceros.length">
              <td colspan="4" class="text-center py-6 text-medium-emphasis">
                No hay registros para mostrar
              </td>
            </tr>
            <tr v-for="ter in terceros" :key="ter.Id">
              <td class="text-center">
                <v-btn
                  icon="mdi-check-circle-outline"
                  color="success"
                  size="small"
                  variant="text"
                  title="Seleccionar este tercero"
                  @click="seleccionar(ter)"
                />
              </td>
              <td>{{ ter.identificacion }}</td>
              <td>{{ ter.Nombre }}</td>
              <td>{{ ter.Celular || '-' }}</td>
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
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import Swal from 'sweetalert2'
import terceroService from '@/services/terceroService'

export default {
  name: 'TercerosSeleccionar',

  props: {
    // v-model: controla si el dialogo esta visible
    modelValue: {
      type: Boolean,
      default: false
    },
    // la pantalla que lo invoca SIEMPRE debe pasar la empresa
    idEmpresa: {
      type: [Number, String],
      required: true
    }
  },

  emits: ['update:modelValue', 'seleccionar'],

  data() {
    return {
      cargando: false,
      terceros: [],
      cantData: 0,
      pagina: 1,
      filtros: {
        textoFiltro: '',
        campoOrdenar: 1, // 1:Nombre
        orden: 'ASC'
      },
      opcionesCampoOrdenar: [
        { valor: 1, texto: 'Nombre' },
        { valor: 2, texto: 'Apellidos' },
        { valor: 3, texto: 'N° Documento' },
        { valor: 4, texto: 'Email' },
        { valor: 5, texto: 'Fecha de creación' }
      ],
      opcionesOrden: [
        { valor: 'ASC', texto: 'Ascendente' },
        { valor: 'DESC', texto: 'Descendente' }
      ]
    }
  },

  computed: {
    dialogVisible: {
      get() {
        return this.modelValue
      },
      set(valor) {
        this.$emit('update:modelValue', valor)
      }
    },
    totalPaginas() {
      return Math.max(1, Math.ceil(this.cantData / 50))
    }
  },

  watch: {
    // cada vez que se abre el dialogo, consulta (por si cambio la empresa o es la primera vez)
    modelValue(visible) {
      if (visible) {
        this.consultar()
      }
    }
  },

  methods: {
    consultar() {
      this.buscar(1)
    },

    irPagina(pagina) {
      this.buscar(pagina)
    },

    async buscar(pagina) {
      if (!this.idEmpresa) {
        Swal.fire('Atención', 'No se indicó la empresa para buscar terceros', 'warning')
        return
      }

      this.cargando = true
      try {
        const { data } = await terceroService.getActivas({
          idEmpresa: this.idEmpresa,
          campoOrdenar: this.filtros.campoOrdenar,
          orden: this.filtros.orden,
          pagina,
          textoFiltro: this.filtros.textoFiltro || ''
        })
        this.terceros = data.data || []
        this.cantData = data.cantData || 0
        this.pagina = pagina
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo consultar los terceros'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.cargando = false
      }
    },

    seleccionar(ter) {
      this.$emit('seleccionar', {
        Id: ter.Id,
        identificacion: ter.identificacion,
        Nombre: ter.Nombre,
        Celular: ter.Celular
      })
      this.cerrar()
    },

    cerrar() {
      this.dialogVisible = false
    }
  }
}
</script>
