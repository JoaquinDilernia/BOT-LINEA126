import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// El repo vive en Dropbox: el sync bloquea node_modules/.vite cuando Vite
// renombra el pre-bundle (EBUSY). La caché va afuera.
const cacheDir = join(tmpdir(), 'vite-linea126-web');

export default defineConfig({
  plugins: [react()],
  cacheDir,
  base: './',
  server: { port: 5176 },
});
