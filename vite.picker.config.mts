import path from 'node:path';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

const root = path.resolve(import.meta.dirname, 'src/renderer/picker');

// https://vitejs.dev/config
export default defineConfig({
  root,
  plugins: [
    svelte({
      configFile: path.resolve(import.meta.dirname, 'svelte.config.mjs'),
    }),
    tailwindcss(),
  ],
  build: {
    // Forge expects renderer output here; keep it absolute because `root` moved.
    outDir: path.resolve(import.meta.dirname, '.vite/renderer/picker'),
    emptyOutDir: true,
  },
});
