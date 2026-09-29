
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Backend (FastAPI) server address used for local development proxying.
const BACKEND_URL =
  process.env.VITE_DEV_BACKEND_URL || 'http://127.0.0.1:8000'

// Proxy all "/api" requests to the FastAPI backend and strip the prefix.
const apiProxy = {
  '/api': {
    target: BACKEND_URL,
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
}

export default defineConfig({
  // GitHub Pages repository path
  base: '/AI-Powered-Emergency-Response-Intelligence-Platform/',

  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    host: true,
    proxy: apiProxy,
  },

  preview: {
    host: true,
    proxy: apiProxy,
  },
})
