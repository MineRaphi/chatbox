import path from 'node:path';
import { defineConfig } from 'vite';

const root = path.resolve(import.meta.dirname, 'src/renderer/overlay');

// https://vitejs.dev/config
export default defineConfig({
  root,
  build: {
    // Forge expects renderer output here; keep it absolute because `root` moved.
    outDir: path.resolve(import.meta.dirname, '.vite/renderer/overlay'),
    emptyOutDir: true,
  },
});
