import path from 'node:path';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

const root = path.resolve(import.meta.dirname, 'src/renderer/picker');

// The pages' content rules allow Vite's hot-reload connection, which only
// dev mode uses; the packaged app doesn't get that exception.
const stripDevCsp = {
  name: 'chatbox-strip-dev-csp',
  apply: 'build' as const,
  transformIndexHtml: (html: string): string =>
    html.replace(' ws://localhost:*', ''),
};

// https://vitejs.dev/config
export default defineConfig({
  root,
  // Each renderer runs its own dev server; a shared dependency cache makes
  // them overwrite each other's optimized deps (blank picker in dev).
  cacheDir: path.resolve(import.meta.dirname, 'node_modules/.vite/picker'),
  plugins: [
    svelte({
      configFile: path.resolve(import.meta.dirname, 'svelte.config.mjs'),
    }),
    tailwindcss(),
    stripDevCsp,
  ],
  build: {
    // Forge expects renderer output here; keep it absolute because `root` moved.
    outDir: path.resolve(import.meta.dirname, '.vite/renderer/picker'),
    emptyOutDir: true,
  },
});
