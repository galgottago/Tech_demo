import { defineConfig } from 'vite'

// GitHub Pages project site: https://<owner>.github.io/<repo>/scroll-3d-building/
// CI sets VITE_BASE to /<repo>/scroll-3d-building/. Local dev leaves it unset so the app stays at /.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
})
