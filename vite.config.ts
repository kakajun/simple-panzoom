/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  base: './',
  test: {
    environment: 'happy-dom' // or 'jsdom', 'node'
  },
  plugins: [vue()]
})
