import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base is './' so the build works both on GitHub Pages (/PackingHelper/) and any static host
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
