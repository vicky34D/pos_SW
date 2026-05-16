import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  },
  build: {
    // Smaller chunks for faster initial load
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        }
      }
    },
    // Strip console logs in production for lighter build
    minify: 'esbuild',
    target: 'es2020',
  }
})
