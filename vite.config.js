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
      output: {
        manualChunks: {
          'sql-js': ['sql.js']
        }
      }
    }
  },
  server: {
    https: false, // для Telegram Mini Apps нужен HTTPS в продакшене
    port: 5173
  },
  define: {
    global: 'globalThis',
    'import.meta.env.VITE_MAPBOX_ACCESS_TOKEN': JSON.stringify(process.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiY3JlbyIsImEiOiJjbXZ6Z2V6Z2V6Z2V6In0.example'),
    'import.meta.env.VITE_TELEGRAM_BOT_TOKEN': JSON.stringify(process.env.VITE_TELEGRAM_BOT_TOKEN || ''),
  }
})
