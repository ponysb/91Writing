import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import compression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    vue(),
    // gzip压缩
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // 只压缩大于1kb的文件
      deleteOriginFile: false // 保留原文件
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  publicDir: 'public',
  assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.eot'],
  server: {
    fs: {
      allow: ['..', 'vditorCDN']
    }
  },
  build: {
    // 生产环境移除console.log
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 移除console.log
        drop_debugger: true, // 移除debugger
        pure_funcs: ['console.log', 'console.info', 'console.warn'] // 移除指定的函数调用
      }
    },
    // 打包优化
    rollupOptions: {
      output: {
        // 分包策略
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'element-vendor': ['element-plus', '@element-plus/icons-vue'],
          'utils-vendor': ['axios', 'marked']
        },
        // 文件名优化
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const extType = info[info.length - 1]
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name)) {
            return `media/[name]-[hash].${extType}`
          }
          if (/\.(png|jpe?g|gif|svg)(\?.*)?$/i.test(assetInfo.name)) {
            return `images/[name]-[hash].${extType}`
          }
          if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name)) {
            return `fonts/[name]-[hash].${extType}`
          }
          return `assets/[name]-[hash].${extType}`
        }
      }
    },
    // 启用源码映射（可选，生产环境建议关闭）
    sourcemap: false,
    // 设置打包大小警告阈值
    chunkSizeWarningLimit: 1000
  }
})
