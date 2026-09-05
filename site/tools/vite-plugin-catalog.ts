import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { bigCtaMarkup, curatedMarkup, gatesMarkup, roomsMarkup, tickerMarkup } from '../src/catalog/markup';
import { CURATED } from '../src/catalog/registry';

// Static hub content — stamping the lane-derived markup into index.html at
// transform time (dev server AND build), so the served HTML carries the gates,
// room cards, marquee and closing CTA with no client JS involved.
//
// Why: AI crawlers (GPTBot, ClaudeBot, PerplexityBot, …) do not execute
// JavaScript. When these sections were rendered by main.ts at runtime, the
// site's actual substance — what the worlds are called, what they promise,
// where they link — was invisible to every crawler but Google's renderer.
// That is a GEO failure mode no amount of meta tags fixes. Now the HTML is the
// content; main.ts only enhances (glyph stamping, hover, scroll motion).
//
// The plugin replaces EXACT empty shells. If index.html is edited and a shell
// no longer matches, the build throws — shipping an empty hub silently is how
// the /lab/ favicon incident happened; loud beats silent.

interface Shell {
  /** The exact string in index.html that gets replaced. */
  find: string;
  /** What replaces it. */
  fill: () => string;
}

const SHELLS: Shell[] = [
  {
    // Rail doors (desktop) and menu doors (mobile) share the same markup.
    find: '<nav class="gates" aria-label="Worlds"></nav>',
    fill: () => `<nav class="gates" aria-label="Worlds">${gatesMarkup()}</nav>`,
  },
  {
    find: '<nav class="menu-gates" aria-label="Worlds"></nav>',
    fill: () => `<nav class="menu-gates" aria-label="Worlds">${gatesMarkup()}</nav>`,
  },
  {
    // The grid gets a visually-hidden h2 as well: aria-label names the region
    // for AT, but crawlers and the document outline want a real heading.
    find: '<section class="rooms" id="worlds" aria-label="World previews"></section>',
    fill: () =>
      `<section class="rooms" id="worlds" aria-label="World previews">` +
      `<h2 class="visually-hidden">World previews</h2>${roomsMarkup()}</section>`,
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
        const shells = file === resolve(root, 'index.html') ? SHELLS
          : file === resolve(root, 'curated/index.html') ? [
            { find: '<!-- curated:entries -->', fill: curatedMarkup },
            { find: '<!-- curated:count -->', fill: () => `${String(CURATED.length).padStart(2, '0')} ${CURATED.length === 1 ? 'EXPERIENCE' : 'EXPERIENCES'}` },
          ] : [];
        for (const shell of shells) {
          if (!html.includes(shell.find)) {
            throw new Error(
              `[static-hub] shell not found in index.html: ${shell.find}\n` +
                `The page would ship without this content — fix the shell or the template.`,
            );
          }
          html = html.replace(shell.find, shell.fill());
        }
        return html;
      },
    },
  };
}
