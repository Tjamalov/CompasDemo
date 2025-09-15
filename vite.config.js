import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения
  const env = loadEnv(mode, process.cwd(), '')
  
  
  return {
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
    'import.meta.env.VITE_MAPBOX_ACCESS_TOKEN': JSON.stringify(env.VITE_MAPBOX_ACCESS_TOKEN),
    'import.meta.env.VITE_TELEGRAM_BOT_TOKEN': JSON.stringify(env.VITE_TELEGRAM_BOT_TOKEN || ''),
  },
  // Загружаем переменные окружения из .env файла
  envPrefix: 'VITE_'
  }
})
