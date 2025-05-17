import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/ors": {
        target: "https://api.openrouteservice.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ors/, ""),
        secure: false,
      },
    },
  },
})