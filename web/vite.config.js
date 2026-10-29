import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE || '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (/[\\/]node_modules[\\/](antd|@ant-design|rc-)[\\/]/.test(id)) return 'antd-vendor'
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|scheduler|zustand)[\\/]/.test(id))
              return 'react-vendor'
            if (/[\\/]node_modules[\\/](markdown-it|highlight|dompurify)[\\/]/.test(id))
              return 'markdown-vendor'
          },
        },
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://124.222.156.44:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
      host: '0.0.0.0',
    },
  }
})
