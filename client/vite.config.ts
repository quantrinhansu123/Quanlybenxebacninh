import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname), '')
  const devApiPort = env.VITE_DEV_API_PORT || '3000'
  const devApiTarget = `http://127.0.0.1:${devApiPort}`

  return {
  plugins: [react()],
  server: {
    proxy: {
      // Tránh ERR_CONNECTION_REFUSED khi VITE_API_URL nhầm cổng: dev dùng base /api → proxy tới backend
      '/api': {
        target: devApiTarget,
        changeOrigin: true,
      },
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        // SharedWorker URL must be stable across builds for shared identity
        entryFileNames: 'assets/worker-[name].js',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI library - Radix UI (only installed packages)
          'vendor-radix': [
            '@radix-ui/react-popover',
            '@radix-ui/react-radio-group',
          ],
          // Utilities
          'vendor-utils': [
            'date-fns',
            'axios',
            'zustand',
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
          ],
          // Icons
          'vendor-icons': ['lucide-react'],
          // Charts
          'vendor-charts': ['recharts'],
          // Toast
          'vendor-toast': ['react-toastify'],
          // PDF viewer
          'vendor-pdf': ['react-pdf', 'pdfjs-dist'],
          // Excel export
          'vendor-xlsx': ['xlsx'],
          // QR code scanner
          'vendor-qrcode': ['html5-qrcode'],
        },
      },
    },
  },
  }
})

