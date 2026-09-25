import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: { name: 'Inicio' },
    children: [
      { path: 'inicio', name: 'Inicio', component: () => import('@/views/Inicio/Inicio.vue') },


      // BODEGAS
      {
        path: 'inventario/bodegas',
        name: 'Bodegas',
        component: () => import('@/views/Inventario/Bodegas/BodegasList.vue')
      },
      {
        path: 'inventario/bodegas/nueva',
        name: 'BodegasNueva',
        component: () => import('@/views/Inventario/Bodegas/BodegasForm.vue')
      },
      {
        path: 'inventario/bodegas/:EmpId/:BodId/editar',
        name: 'BodegasEditar',
        component: () => import('@/views/Inventario/Bodegas/BodegasForm.vue'),
        props: true
      },
      
      // Inventario
      {
        path: 'inventario/categorias',
        name: 'CategoriaList',
        component: () => import('@/views/Inventario/Categorias/CategoriaList.vue')
      },
      {
        path: 'inventario/categorias/nueva',
        name: 'CategoriaNueva',
        component: () => import('@/views/Inventario/Categorias/CategoriaForm.vue')
      },
      {
        path: 'inventario/categorias/:EmpId/:CatId/editar',
        name: 'CategoriaEditar',
        component: () => import('@/views/Inventario/Categorias/CategoriaForm.vue'),
        props: true
      },
      // UNIDAEDS MEDIDAS
      {
        path: 'inventario/unidades-medida',
        name: 'UnidadesMedida',
        component: () => import('@/views/Inventario/UnidadesMedida/UnidadesMedidaList.vue')
      },
      {
        path: 'inventario/unidades-medida/nueva',
        name: 'UnidadesMedidaNueva',
        component: () => import('@/views/Inventario/UnidadesMedida/UnidadesMedidaForm.vue')
      },
      {
        path: 'inventario/unidades-medida/:EmpId/:UniMedId/editar',
        name: 'UnidadesMedidaEditar',
        component: () => import('@/views/Inventario/UnidadesMedida/UnidadesMedidaForm.vue'),
        props: true
      },
            // PROPIEDAES
      {
        path: 'inventario/propiedades',
        name: 'Propiedades',
        component: () => import('@/views/Inventario/Propiedades/PropiedadesList.vue')
      },
      {
        path: 'inventario/propiedades/nueva',
        name: 'PropiedadesNueva',
        component: () => import('@/views/Inventario/Propiedades/PropiedadesForm.vue')
      },
      {
        path: 'inventario/propiedades/:EmpId/:PropId/editar',
        name: 'PropiedadesEditar',
        component: () => import('@/views/Inventario/Propiedades/PropiedadesForm.vue'),
        props: true
      },

      
      // TIPO DE PRODUCTO
      {
        path: 'inventario/tipo-productos',
        name: 'TipoProductos',
        component: () => import('@/views/Inventario/TipoProductos/TipoProductosList.vue')
      },
      {
        path: 'inventario/tipo-productos/nuevo',
        name: 'TipoProductosNuevo',
        component: () => import('@/views/Inventario/TipoProductos/TipoProductosFrom.vue')
      },
      {
        path: 'inventario/tipo-productos/:EmpId/:TipProId/editar',
        name: 'TipoProductosEditar',
        component: () => import('@/views/Inventario/TipoProductos/TipoProductosFrom.vue'),
        props: true
      },

      // PRODUCTO ANTERIOR 

      // PRODUCTO
      {
        path: 'inventario/productos',
        name: 'Productos',
        component: () => import('@/views/Inventario/Productos/ProductosList.vue')
      },
      {
        path: 'inventario/productos/nuevo',
        name: 'ProductosNuevo',
        component: () => import('@/views/Inventario/Productos/ProductosForm.vue')
      },
      {
        path: 'inventario/productos/:EmpId/:ProdId/editar',
        name: 'ProductosEditar',
        component: () => import('@/views/Inventario/Productos/ProductosForm.vue'),
        props: true
      },


      // PRODUCTO ANTERIOR
            {
        path: 'inventario/articulos',
        name: 'Articulos',
        component: () => import('@/views/Inventario/Articulos/ArticulosList.vue')
      },
      {
        path: 'inventario/articulos/nuevo',
        name: 'ArticulosNuevo',
        component: () => import('@/views/Inventario/Articulos/ArticulosForm.vue')
      },
      {
        path: 'inventario/articulos/:EmpId/:ArtId/editar',
        name: 'ArticulosEditar',
        component: () => import('@/views/Inventario/Articulos/ArticulosForm.vue'),
        props: true
      },

      {
        path: 'inventario/movimientos',
        name: 'MovimientosInventario',
        component: () =>
          import('@/views/Inventario/MovimientosInventario/MovimientosInventario.vue')
      },

      // Informes de inventario
      {
        path: 'informes-inventario/existencias',
        name: 'Existencias',
        component: () => import('@/views/InformesInventario/Existencias.vue')
      },
      {
        path: 'informes-inventario/kardex',
        name: 'Kardex',
        component: () => import('@/views/InformesInventario/Kardex.vue')
      },
      {
        path: 'informes-inventario/existencia-articulo',
        name: 'ExistenciaArticulo',
        component: () => import('@/views/InformesInventario/ExistenciaArticulo.vue')
      },

      


            // Terceros
      { path: 'terceros', name: 'Terceros', component: () => import('@/views/Terceros/TercerosList.vue') },
      { path: 'terceros/nuevo', name: 'TercerosNuevo', component: () => import('@/views/Terceros/TercerosForm.vue') },
      {
        path: 'terceros/:EmpId/:TerId/editar',
        name: 'TercerosEditar',
        component: () => import('@/views/Terceros/TercerosForm.vue'),
        props: true
      },


      // Ventas 
      
      {
        path: 'ventas/vendedores',
        name: 'Vendedores',
        component: () => import('@/views/Ventas/VendedoresList.vue')
      },
      {
        path: 'ventas/vendedores/nuevo',
        name: 'VendedoresNuevo',
        component: () => import('@/views/Ventas/VendedoresForm.vue')
      },
      {
        path: 'ventas/vendedores/:EmpId/:VdrId/editar',
        name: 'VendedoresEditar',
        component: () => import('@/views/Ventas/VendedoresForm.vue'),
        props: true
      },


      { path: 'ventas', name: 'Ventas', component: () => import('@/views/Ventas/Ventas.vue') },

      
      // Compras 
      { path: 'compras', name: 'Compras', component: () => import('@/views/Compras/Compras.vue') },




      // Prestamos / Empenos / Abonos / Gastos
      { path: 'prestamos', name: 'Prestamos', component: () => import('@/views/Prestamos/Prestamos.vue') },
      { path: 'empenos', name: 'Empenos', component: () => import('@/views/Empenos/Empenos.vue') },
      { path: 'abonos', name: 'Abonos', component: () => import('@/views/Abonos/Abonos.vue') },
      { path: 'gastos', name: 'Gastos', component: () => import('@/views/Gastos/Gastos.vue') },

      // Contabilidad
      {
        path: 'contabilidad/movimiento-caja',
        name: 'MovimientoCaja',
        component: () => import('@/views/Contabilidad/MovimientoCaja/MovimientoCaja.vue')
      },
      {
        path: 'contabilidad/estado-cuenta-tercero',
        name: 'EstadoCuentaTercero',
        component: () =>
          import('@/views/Contabilidad/EstadoCuentaTercero/EstadoCuentaTercero.vue')
      },

      // Administracion
      //usuarios
      { 
        path: 'administracion/usuarios', 
        name: 'Usuarios', 
        component: () => import('@/views/Administracion/Usuarios/UsuarioList.vue')
      },

      { 
        path: 'administracion/usuarios/nuevo', 
        name: 'UsuarioNuevo', 
        component: () => import('@/views/Administracion/Usuarios/UsuarioForm.vue')
      },
      { 
        path: 'administracion/usuarios/:UsuId/editar', 
        name: 'UsuarioEditar', 
        component:  () => import('@/views/Administracion/Usuarios/UsuarioForm.vue')
      },  
      //empresas
      {
        path: 'administracion/empresas',
        name: 'Empresas',
        component: () => import('@/views/Administracion/Empresas/Empresas.vue')
      },
      //asingar usuario empresa
      {
        path: 'administracion/asignacion-usuario',
        name: 'AsignacionUsuario',
        component: () =>
          import('@/views/Administracion/AsignacionUsuario/AsignacionUsuario.vue')
      },
      //tipo documento
      {
        path: 'administracion/tipos-documento',
        name: 'TiposDocumento',
        component: () => import('@/views/Administracion/TiposDocumento/TiposDocumentoList.vue')
      },
      {
        path: 'administracion/tipos-documento/nuevo',
        name: 'TiposDocumentoNuevo',
        component: () => import('@/views/Administracion/TiposDocumento/TiposDocumentoForm.vue')
      },
      {
        path: 'administracion/tipos-documento/:EmpId/:TipDocId/editar',
        name: 'TiposDocumentoEditar',
        component: () => import('@/views/Administracion/TiposDocumento/TiposDocumentoForm.vue'),
        props: true
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (!to.meta.public && !authStore.isAuthenticated) {
    return { name: 'Login' }
  }

  if (to.name === 'Login' && authStore.isAuthenticated) {
    return { name: 'Inicio' }
  }

  return true
})

export default router