import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 在mock模式下不使用代理，让API调用直接失败并切换到Mock服务
  const shouldUseProxy = mode !== 'mock';

  return {
    plugins: [react()],
    server: {
      proxy: shouldUseProxy ? {
        '/api': {
          target: process.env.VITE_API_BASE_URL || 'http://localhost:8788',
          changeOrigin: true,
        },
      } : undefined,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
})
