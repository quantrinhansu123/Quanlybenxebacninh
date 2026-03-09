import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
        },
      },
    },
  },
})

