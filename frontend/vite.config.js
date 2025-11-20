import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        // During development proxy API calls to the deployed backend (or change to your local URL)
        target: 'https://mern-hydrofarm.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
