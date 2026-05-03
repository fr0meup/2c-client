import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/s3-upload': {
        target: 'https://twocents-ugc.s3.us-east-2.amazonaws.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/s3-upload/, ''),
      },
    },
  },
})
