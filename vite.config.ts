import { defineConfig } from 'vite'

export default defineConfig({
  // La app es 100% estática: el build genera dist/ listo para nginx.
  base: './',
})
