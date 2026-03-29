import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert' // 1. Import mkcert

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    mkcert() // 2. Add mkcert to your plugins
  ],
  server: {
    // Keep your proxy so Sprint Sight can still talk to the Render backend
    proxy: {
      '/api': {
        target: 'https://sprintsight-back.onrender.com',
        changeOrigin: true,
        secure: false, 
      }
    }
  }
})