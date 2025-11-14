// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico', 
        'src/assets/cancelled.svg', 
        'src/assets/done.svg', 
        'src/assets/inprogress.svg', 
        'src/assets/todo.svg', 
        'src/assets/logo.ico', 
        'src/assets/todo_logo.png'
      ],
      manifest: {
        name: 'ToDo++ Task Tracker',
        short_name: 'ToDo++',
        start_url: '.',
        display: 'standalone',
        theme_color: '#AE3232',
        background_color: '#AE3232',
        icons: [
          {
            src: './src/assets/logo.ico',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
    },
      strategies: 'injectManifest',
      srcDir: 'src/js/sw',
      filename: 'service-worker.js', 
      // base: '/', // optional base path
    })
  ],
  server: {
    headers: {
      'Content-Type': 'application/javascript'
    }
  },
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const originalName = (assetInfo as any).name ?? (assetInfo as any).fileName ?? ''
          if (typeof originalName === 'string' && originalName.endsWith('.css')) {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  }
})