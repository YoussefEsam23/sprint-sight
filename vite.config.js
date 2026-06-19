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
        /* target: 'https://sprintsight-back.onrender.com' */
        target: 'http://localhost:8080/',
        /* target: 'http://127.0.0.1:8080' */
        changeOrigin: true,
        secure: false, 
      }
    }
  }
})