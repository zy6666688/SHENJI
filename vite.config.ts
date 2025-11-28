import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import { resolve } from 'path';

export default defineConfig({
  plugins: [uni()],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: false,
    cors: true
  },
  
  build: {
    target: 'es2015',
    outDir: 'dist/build/h5',
    assetsDir: 'static',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1500
  },
  
  define: {
    'process.env': {}
  },
  
  optimizeDeps: {
    include: [
      'vue',
      'pinia',
      '@dcloudio/uni-app',
      '@dcloudio/uni-h5'
    ]
  }
});
