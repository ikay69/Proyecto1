import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// El backend (Node 24 + Express, arquitectura MVC) sirve el build de este
// frontend desde su carpeta "Public". Ajusta build.outDir para que apunte
// directamente a esa carpeta del backend cuando integres ambos proyectos,
// por ejemplo: outDir: '../backend/Public'
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
