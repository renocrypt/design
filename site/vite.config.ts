import { defineConfig, type Plugin } from 'vite';
import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { buildLanes } from './src/worlds/registry';
import { headTags } from './tools/vite-plugin-head-tags';
import { staticHub } from './tools/vite-plugin-static-hub';
import { seo } from './tools/vite-plugin-seo';

const PUBLIC_DIR = resolve(__dirname, 'public');

/**
 * Dev-only: serve `public/<dir>/index.html` for a request to `<dir>/`.
 *
 * When only the studies lived under `public/lab/`, the project-root `lab/`
 * (the stack-native pages) had no index.html, so Vite's static middleware
 * found the directory, found no index, and the SPA fallback answered `/lab/`
 * with the HUB. Pages resolves `/lab/` to `/lab/index.html` and always
 * worked, which is exactly why nobody caught it: the dev server was lying
 * about a live page. This makes dev answer the way the deployed site does.
 * The entrance has since moved onto the stack too, so for `/lab/` this no
 * longer fires — it guards any future public/ dir without a root twin.
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
  plugins: [
    publicDirIndex(),
    // Stamps gates/rooms/ticker/CTA into index.html at transform time (dev too) —
    // the hub's content must exist without client JS, or AI crawlers see nothing.
    staticHub(),
    // Build-only: canonical/OG/JSON-LD per page + generated sitemap.xml.
    // (robots.txt and llms.txt are hand-authored in public/ — see tools/vite-plugin-seo.ts.)
    seo({
      siteUrl: 'https://design.renocrypt.com',
      siteName: 'Worlds — a design sketchbook',
      description:
        'One entrance, four worlds and the lab they grew from. Each its own vibe, all the same bar.',
    }),
    headTags({ gaId: 'G-6TMHBNWWB6' }),
  ],
  build: {
    rollupOptions: {
      input: {
        hub: resolve(__dirname, 'index.html'),
        type: resolve(__dirname, 'type/index.html'),
        // World 00's stack-native pages. They keep their URLs — dist/lab/index.html,
        // dist/lab/s5-cipher-engine.html — while s1/s2/s4 stay copied from
        // public/, so public/ and lab/ must never both provide the same filename.
        lab: resolve(__dirname, 'lab/index.html'),
        cipher: resolve(__dirname, 'lab/s5-cipher-engine.html'),
        ...Object.fromEntries(
          buildLanes().map((l) => [l.id, resolve(__dirname, `worlds/${l.id}/index.html`)]),
        ),
      },
    },
  },
});
