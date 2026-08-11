import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';
import { LANES, laneEntry } from '../src/worlds/registry';

// SEO/GEO stamping — every page leaves the build with a canonical URL, Open
// Graph / Twitter cards, a robots meta and JSON-LD, and the dist gets a
// sitemap.xml, robots.txt and llms.txt derived from what actually shipped.
//
// Same architecture as head-tags (and the same reason): files in public/
// never pass Vite's html pipeline, so template-level tags would miss /lab/
// silently. transformIndexHtml covers the bundled entries; closeBundle walks
// dist and fills whatever is still missing — including the CDN-era lab pages —
// then writes the crawler files. Insertion is idempotent: a page that declares
// its own keeps it.
//
// GEO notes:
//   - JSON-LD gives machines the site graph: hub = WebSite + ItemList of
//     lanes, each world = CreativeWork, anything else = WebPage, all linked by
//     @id back to the site.
//   - robots.txt explicitly ALLOWS the AI crawlers (GPTBot, ClaudeBot,
//     PerplexityBot, …) — the default allow is implicit; stating it documents
//     intent and survives future tightening of the wildcard rule.
//   - llms.txt is the emerging GEO convention: a markdown map of the site for
//     LLM consumers, generated from the same lane registry as the hub itself.

export interface SeoOptions {
  /** Absolute origin, no trailing slash — e.g. 'https://design.renocrypt.com'. */
  siteUrl: string;
  siteName: string;
  /** Site-wide fallback description for pages that don't declare their own. */
  description: string;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** 'index.html' → '/', 'worlds/01-noir/index.html' → '/worlds/01-noir/', else as-is. */
const urlPath = (relFile: string): string => {
  const p = relFile.replaceAll('\\', '/');
  if (p === 'index.html') return '/';
  if (p.endsWith('/index.html')) return `/${p.slice(0, -'index.html'.length)}`;
  return `/${p}`;
};

const crawl = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return crawl(p);
    return e.isFile() && e.name.endsWith('.html') ? [p] : [];
  });

export function seo({ siteUrl, siteName, description }: SeoOptions): Plugin {
  const abs = (path: string): string => `${siteUrl}${path}`;

  const jsonLdFor = (path: string, title: string, desc: string): Record<string, unknown>[] => {
    if (path === '/') {
      return [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': `${siteUrl}/#website`,
          url: siteUrl,
          name: siteName,
          description,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Worlds and lanes',
          itemListElement: LANES.map((lane, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: abs(laneEntry(lane)),
            name: `${lane.num} ${lane.name}`,
            description: lane.kicker,
          })),
        },
      ];
    }
    const lane = LANES.find((l) => laneEntry(l) === path);
    if (lane) {
      return [
        {
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: `${lane.num} — ${lane.name}`,
          abstract: desc,
          url: abs(path),
          isPartOf: { '@id': `${siteUrl}/#website` },
        },
      ];
    }
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description: desc,
        url: abs(path),
        isPartOf: { '@id': `${siteUrl}/#website` },
      },
    ];
  };

  const ogImage = (): { path: string; width: number; height: number } =>
    // Drop a 1200×630 og.png into public/ and every card upgrades on the next
    // build; until then the square icon is the honest fallback.
    existsSync(join(root, 'public', 'og.png'))
      ? { path: '/og.png', width: 1200, height: 630 }
      : { path: '/icon-512.png', width: 512, height: 512 };

  /** The full tag set for one page; each block skipped if already present. */
  const stamp = (html: string, path: string): string => {
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? siteName;
    const desc =
      html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1] ?? description;
    const img = ogImage();
    let block = '';

    if (!html.includes('name="robots"'))
      block += `    <meta name="robots" content="index, follow, max-image-preview:large" />\n`;
    if (!html.includes('rel="canonical"'))
      block += `    <link rel="canonical" href="${abs(path)}" />\n`;
    if (!html.includes('property="og:title"'))
      block +=
        `    <meta property="og:site_name" content="${esc(siteName)}" />\n` +
        `    <meta property="og:type" content="website" />\n` +
        `    <meta property="og:title" content="${esc(title)}" />\n` +
        `    <meta property="og:description" content="${esc(desc)}" />\n` +
        `    <meta property="og:url" content="${abs(path)}" />\n` +
        `    <meta property="og:image" content="${abs(img.path)}" />\n` +
        `    <meta property="og:image:width" content="${img.width}" />\n` +
        `    <meta property="og:image:height" content="${img.height}" />\n` +
        `    <meta property="og:image:alt" content="${esc(siteName)}" />\n`;
    if (!html.includes('name="twitter:card"'))
      block +=
        `    <meta name="twitter:card" content="${img.width > 512 ? 'summary_large_image' : 'summary'}" />\n` +
        `    <meta name="twitter:title" content="${esc(title)}" />\n` +
        `    <meta name="twitter:description" content="${esc(desc)}" />\n` +
        `    <meta name="twitter:image" content="${abs(img.path)}" />\n`;
    if (!html.includes('application/ld+json'))
      block += jsonLdFor(path, title, desc)
        .map(
          (ld) =>
            `    <script type="application/ld+json">${JSON.stringify(ld)}</script>\n`,
        )
        .join('');

    if (!block) return html;
    return html.includes('</head>')
      ? html.replace('</head>', `${block}  </head>`)
      : html.replace('<body>', `<body>\n${block}`);
  };

  const sitemap = (paths: string[]): string =>
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    paths
      .map(
        (p) =>
          `  <url><loc>${abs(p)}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`,
      )
      .join('\n') +
    `\n</urlset>\n`;

  const robots = (): string =>
    `User-agent: *\nAllow: /\n\n` +
    `# GEO: AI crawlers explicitly welcome — every page is static, readable\n` +
    `# without JavaScript by design. See llms.txt for the machine map.\n` +
    ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended']
      .map((bot) => `User-agent: ${bot}\nAllow: /`)
      .join('\n') +
    `\n\nSitemap: ${abs('/sitemap.xml')}\n`;

  const llms = (): string => {
    const worlds = LANES.filter((l) => l.kind === 'world');
    const others = LANES.filter((l) => l.kind !== 'world');
    return (
      `# ${siteName}\n\n` +
      `> ${description}\n\n` +
      `A personal design lab: one entrance, four worlds, each built around one hard\n` +
      `visual idea — its own typeface, palette and physics. All pages are static\n` +
      `HTML and readable without JavaScript.\n\n` +
      `## Worlds\n` +
      worlds
        .map(
          (l) =>
            `- [${l.num} ${l.name}](${abs(laneEntry(l))}): ${l.kicker}. ${l.points.join('; ')}.`,
        )
        .join('\n') +
      `\n\n## Also\n` +
      others
        .map(
          (l) =>
            `- [${l.num} ${l.name}](${abs(laneEntry(l))}): ${l.kicker}. ${l.points.join('; ')}.`,
        )
        .join('\n') +
      `\n- [Type specimen](${abs('/type/')}): the hub's own faces, set live.\n`
    );
  };

  let root = process.cwd();
  let outDir = '';

  return {
    name: 'seo-tags',
    apply: 'build',
    configResolved(cfg) {
      root = cfg.root;
      outDir = join(cfg.root, cfg.build.outDir);
    },
    transformIndexHtml(html, ctx) {
      if (!ctx.filename) return html;
      return stamp(html, urlPath(relative(root, ctx.filename)));
    },
    closeBundle() {
      const files = crawl(outDir);
      for (const file of files) {
        const before = readFileSync(file, 'utf8');
        const after = stamp(before, urlPath(relative(outDir, file)));
        if (after !== before) writeFileSync(file, after);
      }
      const paths = files
        .map((f) => urlPath(relative(outDir, f)))
        .sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
      writeFileSync(join(outDir, 'sitemap.xml'), sitemap(paths));
      writeFileSync(join(outDir, 'robots.txt'), robots());
      writeFileSync(join(outDir, 'llms.txt'), llms());
      console.log(`[seo] stamped ${files.length} pages; sitemap.xml, robots.txt, llms.txt written`);
    },
  };
}
