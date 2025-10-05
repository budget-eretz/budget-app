import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3456,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://backend:4567',
        changeOrigin: true,
      },
    },
  },
})
