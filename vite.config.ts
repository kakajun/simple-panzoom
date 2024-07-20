/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'

import pkg from './package.json'
import dts from 'vite-plugin-dts'
const banner = `/*!${pkg.name} v${pkg.version}${new Date().getFullYear()}年${
  new Date().getMonth() + 1
}月${new Date()}制作*/`
export default defineConfig({
  base: './',
  test: {
    environment: 'happy-dom' // or 'jsdom', 'node'
  },
  plugins: [vue(), dts({ rollupTypes: true })],
  build: {
    outDir: 'dist',
    // minify: true, // 不压缩代码,方便开发调试
    lib: {
      entry: resolve(__dirname, 'src/panzoom.ts'),
      name: 'panzoom',
      fileName: 'panzoom',
      formats: ['es', 'cjs', 'umd']
    },
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: ['vue'],
      output: {
        banner,
        exports: 'auto'
      }
    }
  }
})
