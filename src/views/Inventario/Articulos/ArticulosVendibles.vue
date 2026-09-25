<template>
  <v-dialog v-model="dialogVisible" max-width="960" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Seleccionar artículo a vender</span>
        <v-btn icon="mdi-close" variant="text" @click="cerrar" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-4">
        <v-row dense align="center" class="mb-2">
          <v-col cols="12" sm="3">
            <v-text-field
              v-model="filtros.textoFiltro"
              label="Buscar"
              maxlength="150"
              :disabled="filtros.campoOrdenar === 4"
              :hint="filtros.campoOrdenar === 4 ? 'No aplica al ordenar por fecha de creación' : ''"
              persistent-hint
              clearable
              density="compact"
              variant="outlined"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="6" sm="3">
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
          <v-col cols="6" sm="2">
            <v-select
              v-model="filtros.idBodega"
              :items="bodegas"
              item-title="Nombre"
              item-value="Id"
              label="Bodega"
              :loading="cargandoBodegas"
              density="compact"
              variant="outlined"
              hide-details
            />
          </v-col>
          <v-col cols="6" sm="2">
            <v-btn color="primary" variant="tonal" block @click="consultar">
              Buscar
            </v-btn>
          </v-col>
        </v-row>

        <div style="overflow-x: auto;">
          <v-table density="compact">
            <thead>
              <tr>
                <th class="text-center" style="width: 56px;">Sel.</th>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Bodega</th>
                <th class="text-right">Disponible</th>
                <th class="text-right">Precio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="cargando">
                <td colspan="6" class="text-center py-6">
                  <v-progress-circular indeterminate color="primary" />
                </td>
              </tr>
              <tr v-else-if="!articulos.length">
                <td colspan="6" class="text-center py-6 text-medium-emphasis">
                  No hay registros para mostrar
                </td>
              </tr>
              <!--
                la clave combina articulo y bodega: una fila es un par (articulo, bodega), asi
                que el mismo artId llega repetido cuando hay existencia en varias bodegas. Con
                :key="art.artId" las claves se duplican y Vue reutiliza mal las filas al paginar.
              -->
              <tr v-for="art in articulos" :key="`${art.artId}-${art.artBodegaId}`">
                <td class="text-center">
                  <v-btn
                    icon="mdi-check-circle-outline"
                    color="success"
                    size="small"
                    variant="text"
                    title="Seleccionar este artículo"
                    @click="seleccionar(art)"
                  />
                </td>
                <td>{{ art.artSKU }}</td>
                <td>{{ art.artNombre }}</td>
                <td>{{ art.artBodegaNombre }}</td>
                <td class="text-right">{{ formatearCantidad(art.artCantidadDisponible) }}</td>
                <td class="text-right">{{ formatearMoneda(art.artPrecio) }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>

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
import articuloService from '@/services/articuloService'
import bodegaService from '@/services/bodegaService'

// el v-select de bodega guarda 0 para "Todas", como el de InformesInventario/Existencias.vue,
// pero el contrato del endpoint es null o un entero mayor que cero. La traduccion se hace al
// armar el cuerpo, en buscar().
//
// Un 0 tambien funciona hoy, comprobado por HTTP, pero de rebote: la ruta declara idBodega
// optional({values:'falsy'}) y 0 es falsy, asi que se salta validarId. Depender de eso seria
// depender de un descuido; el dia que la ruta valide de otra forma, 0 empieza a dar 400.
const BODEGA_TODAS = 0

export default {
  name: 'ArticulosVendibles',

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
      articulos: [],
      cantData: 0,
      pagina: 1,
      bodegas: [{ Id: BODEGA_TODAS, Nombre: 'Todas' }],
      cargandoBodegas: false,
      bodegasCargadas: false,
      filtros: {
        textoFiltro: '',
        campoOrdenar: 1, // 1:Nombre
        orden: 'ASC',
        idBodega: BODEGA_TODAS
      },
      opcionesCampoOrdenar: [
        { valor: 1, texto: 'Nombre' },
        { valor: 2, texto: 'SKU' },
        { valor: 3, texto: 'Descripción' },
        { valor: 4, texto: 'Fecha de creación' }
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
        this.cargarBodegas()
        this.consultar()
      }
    }
  },

  methods: {
    // las bodegas se cargan al abrir el dialogo por PRIMERA vez, no en mounted: el componente
    // se monta junto con la pantalla que lo contiene aunque el usuario no lo abra nunca, y esa
    // peticion sobraria. Y una vez cargadas no se repiten en cada apertura.
    //
    // La bandera vive lo que viva este componente, o sea lo que viva la pantalla que lo
    // contiene (la app no usa KeepAlive: al salir de ella se destruye). Consecuencia: una
    // bodega creada mientras la pantalla esta abierta no aparece en el desplegable hasta que
    // se sale y se vuelve. Se acepta; los ARTICULOS de esa bodega si salen, porque el listado
    // no se cachea.
    //
    // Lo que NO seria aceptable -- quedarse con las bodegas de otra empresa -- no puede pasar:
    // cambiar de empresa recarga la pagina entera. Ver el setter de empresaSeleccionada en
    // layouts/MainLayout.vue. Si algun dia se quita ese reload, este cache hay que atarlo a
    // idEmpresa.
    async cargarBodegas() {
      if (this.bodegasCargadas || !this.idEmpresa) return

      this.cargandoBodegas = true
      try {
        const { data } = await bodegaService.getActivas({ idEmpresa: this.idEmpresa })
        this.bodegas = [{ Id: BODEGA_TODAS, Nombre: 'Todas' }, ...(data.data || [])]
        this.bodegasCargadas = true
      } catch (error) {
        // no es fatal: sin la lista se puede seguir buscando en todas las bodegas
        const mensaje = error.response?.data?.msg || 'No se pudo cargar la lista de bodegas'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.cargandoBodegas = false
      }
    },

    consultar() {
      this.buscar(1)
    },

    irPagina(pagina) {
      this.buscar(pagina)
    },

    async buscar(pagina) {
      if (!this.idEmpresa) {
        Swal.fire('Atención', 'No se indicó la empresa para buscar artículos', 'warning')
        return
      }

      this.cargando = true
      try {
        const { data } = await articuloService.getVendibles({
          idEmpresa: this.idEmpresa,
          idBodega: this.filtros.idBodega === BODEGA_TODAS ? null : this.filtros.idBodega,
          campoOrdenar: this.filtros.campoOrdenar,
          orden: this.filtros.orden,
          pagina,
          textoFiltro: this.filtros.textoFiltro || ''
        })
        this.articulos = data.data || []
        this.cantData = data.cantData || 0
        this.pagina = pagina
      } catch (error) {
        const mensaje = error.response?.data?.msg || 'No se pudo consultar los artículos'
        Swal.fire('Error', mensaje, 'error')
      } finally {
        this.cargando = false
      }
    },

    seleccionar(art) {
      // se devuelve el registro completo de la fila, que incluye la bodega: quien lo reciba
      // necesita saber de cual sale el articulo, no solo cual es.
      this.$emit('seleccionar', { ...art })
      this.cerrar()
    },

    cerrar() {
      this.dialogVisible = false
    },

    formatearMoneda(valor) {
      const numero = Number(valor)
      if (Number.isNaN(numero)) return valor
      return `$ ${numero.toLocaleString('es-CO')}`
    },

    // el backend devuelve las cantidades como cadena con dos decimales ("1.00"). Number() las
    // deja en "1" cuando son enteras y conserva los decimales cuando de verdad los hay.
    formatearCantidad(valor) {
      const numero = Number(valor)
      if (Number.isNaN(numero)) return valor
      return numero.toLocaleString('es-CO')
    }
  }
}
</script>
