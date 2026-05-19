import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // vendor 라이브러리를 안정적인 별도 청크로 — 페이지 코드 갱신 시 캐시 유지
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/react-router/.test(id)) return 'vendor-react'
          if (/\/react(-dom)?\//.test(id) || /\/scheduler\//.test(id)) return 'vendor-react'
          if (/@tanstack\/react-query/.test(id)) return 'vendor-data'
          if (/\/zustand\//.test(id)) return 'vendor-data'
          if (/\/axios\//.test(id)) return 'vendor-data'
        },
      },
    },
  },
})
