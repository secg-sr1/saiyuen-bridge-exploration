import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import topLevelAwait from 'vite-plugin-top-level-await'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    topLevelAwait(),
  ],
  // Vercel / Netlify / root domains: '/'. GitHub Pages project site: set VITE_BASE=/repo-name/ when building.
  base: process.env.VITE_BASE ?? '/',
  assetsInclude: ['**/*.glb'],
})
