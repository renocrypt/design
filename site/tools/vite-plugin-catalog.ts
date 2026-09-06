import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import {
  bigCtaMarkup,
  curatedMarkup,
  gatesMarkup,
  roomsMarkup,
  tickerMarkup,
  utilitiesMarkup,
} from '../src/catalog/markup';
import { CURATED } from '../src/catalog/registry';
import { HERO_REVISION } from '../src/hub/lounge/revision';

// Stamp catalog content into the hub and collection in development and builds.
// Missing template markers fail the build so navigation cannot silently vanish.

interface Shell {
  /** The exact string in index.html that gets replaced. */
  find: string;
  /** What replaces it. */
  fill: () => string;
}

const SHELLS: Shell[] = [
  { find: '<!-- hub:sidebar-utilities -->', fill: () => utilitiesMarkup('sidebar') },
  { find: '<!-- hub:menu-utilities -->', fill: () => utilitiesMarkup('menu') },
  {
    // Rail doors (desktop) and menu doors (mobile) share the same markup.
    find: '<nav class="gates" aria-label="Worlds"></nav>',
    fill: () => `<nav class="gates" aria-label="Worlds" data-lenis-prevent>${gatesMarkup()}</nav>`,
  },
  {
    find: '<nav class="menu-gates" aria-label="Worlds"></nav>',
    fill: () => `<nav class="menu-gates" aria-label="Worlds">${gatesMarkup()}</nav>`,
  },
  {
    // The illustrated collection includes a visible heading and native links.
    find: '<section class="rooms" id="worlds" aria-label="World previews"></section>',
    fill: () =>
      `<section class="rooms" id="worlds" aria-label="World previews">` +
      `${roomsMarkup()}</section>`,
  },
  {
    find: '<div class="ticker-track"></div>',
    fill: () => `<div class="ticker-track">${tickerMarkup()}</div>`,
  },
  {
    // Reveal classes live on the static shell; filling must preserve them.
    find: '<a class="big-cta rv rv--scale"></a>',
    fill: () => bigCtaMarkup(' rv rv--scale'),
  },
];

export function staticCatalog(): Plugin {
  let root = process.cwd();
  return {
    name: 'static-catalog',
    configResolved(cfg) {
      root = cfg.root;
    },
    transformIndexHtml: {
      // Run before other html transforms (seo tags) so they see final markup.
      order: 'pre',
      handler(html, ctx) {
        const file = ctx.filename ? resolve(ctx.filename) : '';
        const shells =
          file === resolve(root, 'index.html')
            ? SHELLS
            : file === resolve(root, 'curated/index.html')
              ? [
                  { find: '<!-- curated:entries -->', fill: curatedMarkup },
                  {
                    find: '<!-- curated:count -->',
                    fill: () =>
                      `${String(CURATED.length).padStart(2, '0')} ${CURATED.length === 1 ? 'EXPERIENCE' : 'EXPERIENCES'}`,
                  },
                ]
              : [];
        for (const shell of shells) {
          if (!html.includes(shell.find)) {
            throw new Error(
              `[static-catalog] shell not found in ${file}: ${shell.find}\n` +
                `The page would ship without this content — fix the shell or the template.`,
            );
          }
          html = html.replace(shell.find, shell.fill());
        }
        if (file === resolve(root, 'index.html')) {
          html = html.replace(/<!-- hub:art=([a-z-]+) -->/g, (_marker, name: string) =>
            readFileSync(resolve(root, 'src/hub/art', `${name}.svg`), 'utf8'),
          );
        }
        html = html.replace(/(src="\/hero\/lounge-still(?:-night)?\.webp)(")/g, `$1?v=${HERO_REVISION}$2`);
        return html;
      },
    },
  };
}
