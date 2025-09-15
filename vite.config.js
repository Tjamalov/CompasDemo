import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  optimizeDeps: {
    include: ['sql.js']
  },
  build: {
    rollupOptions: {
      external: ['sql.js'],
      output: {
        globals: {
          'sql.js': 'initSqlJs'
        }
      }
    }
  },
  server: {
    https: false, // для Telegram Mini Apps нужен HTTPS в продакшене
    port: 5173
  }
})
