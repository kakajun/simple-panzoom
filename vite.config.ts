/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  base: './',
  test: {
    environment: 'jsdom' // or 'jsdom', 'node'
  },
  plugins: [vue()]
})
