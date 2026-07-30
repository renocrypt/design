import { defineConfig, type Plugin } from 'vite';
import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { buildLanes } from './src/worlds/registry';
import { headTags } from './tools/vite-plugin-head-tags';

const PUBLIC_DIR = resolve(__dirname, 'public');

/**
 * Dev-only: serve `public/<dir>/index.html` for a request to `<dir>/`.
 *
 * `lab/` exists in the project root too — it holds the one study that has moved
 * onto our stack — but it has no index.html. So Vite's static middleware found
 * the directory, found no index, and the SPA fallback answered `/lab/` with the
 * HUB. The lab picker was never gone; it was unreachable at the only URL that
 * links to it. Pages resolves `/lab/` to `/lab/index.html` and always worked,
 * which is exactly why nobody caught it: the dev server was lying about a live
 * page. This makes dev answer the way the deployed site does.
 */
const publicDirIndex = (): Plugin => ({
  name: 'public-dir-index',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const path = req.url?.split('?')[0];
      if (path?.endsWith('/')) {
        const target = resolve(PUBLIC_DIR, `.${path}`, 'index.html');
        // The path comes off the wire, so it has to be proven to land inside public/.
        if (target.startsWith(PUBLIC_DIR + sep) && existsSync(target)) {
          req.url = `${path}index.html`;
        }
      }
      next();
    });
  },
});

// One app, N static entries: hub + type specimen + one per WORLD lane.
// 'static' lanes (world 00's /lab/ pages) live in public/ and are copied verbatim —
// they are not build inputs today, which is why the CDN-era pages still work
// alongside this bundled app. That is a build fact, not a freeze: any of them
// can become an entry here when it moves onto our stack.
export default defineConfig({
  plugins: [publicDirIndex(), headTags({ gaId: 'G-6TMHBNWWB6' })],
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
