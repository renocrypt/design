import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { buildLanes } from './src/worlds/registry';
import { googleTag } from './tools/vite-plugin-google-tag';

// One app, N static entries: hub + type specimen + one per WORLD lane.
// 'static' lanes (the /lab archive) live in public/ and are copied verbatim —
// they are never build inputs, which is exactly why the old CDN-era pages
// keep working untouched alongside this bundled app.
export default defineConfig({
  plugins: [googleTag('G-6TMHBNWWB6')],
  build: {
    rollupOptions: {
      input: {
        hub: resolve(__dirname, 'index.html'),
        type: resolve(__dirname, 'type/index.html'),
        ...Object.fromEntries(
          buildLanes().map((l) => [l.id, resolve(__dirname, `worlds/${l.id}/index.html`)]),
        ),
      },
    },
  },
});
