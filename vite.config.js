import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import topLevelAwait from 'vite-plugin-top-level-await'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    topLevelAwait(),
  ],
  // Relative asset URLs — works on GitHub Pages project sites and nested paths without guessing repo name.
  base: './',
  assetsInclude: ['**/*.glb'],
})
