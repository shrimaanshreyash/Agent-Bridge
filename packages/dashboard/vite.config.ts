import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const registryUrl = process.env.VITE_REGISTRY_URL ?? 'http://localhost:6100';
  const wsUrl = registryUrl.replace(/^https?/, (p) => (p === 'https' ? 'wss' : 'ws'));

  // Proxy all registry API routes to the registry server in dev mode.
  // In production the dashboard is served directly from the registry (same origin).
  const apiRoutes = ['/agents', '/metrics', '/workflows', '/discover', '/health'];
  const proxy = Object.fromEntries([
    ...apiRoutes.map((route) => [route, { target: registryUrl, changeOrigin: true }]),
    ['/ws', { target: wsUrl, ws: true }],
  ]);

  return {
    plugins: [react()],
    server: { port: 6140, proxy },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            flow: ['@xyflow/react'],
            motion: ['framer-motion'],
          },
        },
      },
    },
  };
});
