import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: '.',
  plugins: [react(), tailwindcss()],
  resolve: {
    preserveSymlinks: true,
  },

  // Dev server: proxy all backend routes so VITE_API_URL can be empty locally
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:5001', changeOrigin: true },
      '/Inventory': { target: 'http://localhost:5001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5001', changeOrigin: true },
      '/health': { target: 'http://localhost:5001', changeOrigin: true },
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts')) return 'charts'
          if (id.includes('date-fns')) return 'dates'
          if (id.includes('lucide-react')) return 'icons'
        },
      },
    },
  },
})
