import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 6140,
    proxy: {
      '/api': { target: 'http://localhost:6100', changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
      '/ws': { target: 'ws://localhost:6100', ws: true },
    },
  },
});
