import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: true
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  // 本地化 PDF/Word 处理依赖：jspdf + html2canvas 均为本地 npm 包，无 CDN
  // html2canvas 内部使用 Web Worker 进行图像处理，Vite 默认支持
  optimizeDeps: {
    include: ['jspdf', 'html2canvas', 'file-saver']
  },
  worker: {
    // 允许 html2canvas 等库使用本地 Web Worker，不走 CDN
    format: 'es'
  },
  build: {
    // 把大依赖单独拆分，避免主包过大
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-vendor': ['jspdf', 'html2canvas'],
          'editor-vendor': ['@wangeditor/editor', '@wangeditor/editor-for-vue']
        }
      }
    },
    // jspdf 体积较大，适当放宽 chunk 大小警告阈值
    chunkSizeWarningLimit: 1500
  },
  server: {
    port: 7520,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
