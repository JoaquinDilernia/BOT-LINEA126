import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// El repo vive en Dropbox: el sync bloquea node_modules/.vite cuando Vite
// renombra el pre-bundle (EBUSY). La caché va afuera.
const cacheDir = join(tmpdir(), 'vite-linea126-client');

export default defineConfig({
  plugins: [react()],
  cacheDir,
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3126',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: () => 'index',
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
