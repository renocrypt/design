import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { buildLanes } from './src/worlds/registry';
import { headTags } from './tools/vite-plugin-head-tags';

// One app, N static entries: hub + type specimen + one per WORLD lane.
// 'static' lanes (world 00's /lab/ pages) live in public/ and are copied verbatim —
// they are not build inputs today, which is why the CDN-era pages still work
// alongside this bundled app. That is a build fact, not a freeze: any of them
// can become an entry here when it moves onto our stack.
export default defineConfig({
  plugins: [headTags({ gaId: 'G-6TMHBNWWB6' })],
  build: {
    rollupOptions: {
      input: {
        hub: resolve(__dirname, 'index.html'),
        type: resolve(__dirname, 'type/index.html'),
        // World 00's first study to move onto our stack. It keeps its URL —
        // dist/lab/s5-cipher-engine.html — while the other three stay copied
        // from public/, so the two must never both provide that filename.
        cipher: resolve(__dirname, 'lab/s5-cipher-engine.html'),
        ...Object.fromEntries(
          buildLanes().map((l) => [l.id, resolve(__dirname, `worlds/${l.id}/index.html`)]),
        ),
      },
    },
  },
});
