import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

// Head tags every page must carry — analytics, the icon set, and the SEO block
// (canonical + Open Graph + Twitter, derived from each page's own <title> and
// meta description; absolute URLs come from dist/CNAME) — stamped into
// EVERY html file in dist at the end of the build: the bundled entries (hub,
// type, worlds) and the verbatim-copied pages under /lab alike. sitemap.xml is
// generated from the same file list.
//
// Doing it here rather than in transformIndexHtml is the whole point: files in
// public/ never pass through Vite's html pipeline, so template-level tags miss
// them silently. That is exactly how the /lab/ pages shipped with no favicon —
// browsers fell back to /favicon.ico, which did not exist, and showed nothing.
//
// Each tag is inserted only if that page lacks it, so hand-authored pages keep
// any icon they declare for themselves and repeat builds stay idempotent.
//
// Build-only: `vite dev` stays analytics-free.

export interface HeadTagOptions {
  gaId?: string;
  /** Emit icon links (favicon.svg / favicon.ico / apple-touch-icon.png). */
  icons?: boolean;
  /** Emit canonical + Open Graph + Twitter tags and dist/sitemap.xml. */
  seo?: boolean;
}

export function headTags({ gaId, icons = true, seo = true }: HeadTagOptions): Plugin {
  const analytics = gaId
    ? `    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', '${gaId}');
    </script>
`
    : '';

  // Absolute paths: those pages live at /lab/, so relative hrefs would miss.
  // .ico last as the legacy fallback; Safari wants the apple-touch-icon named.
  const iconTags = `    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="shortcut icon" href="/favicon.ico" sizes="any" />
`;

  const htmlFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return htmlFiles(p);
      return e.isFile() && e.name.endsWith('.html') ? [p] : [];
    });

  /** Insert before </head>, or after <body> for a page that somehow lacks one. */
  const insert = (html: string, block: string): string =>
    html.includes('</head>')
      ? html.replace('</head>', `${block}  </head>`)
      : html.replace('<body>', `<body>\n${block}`);

  /** Site path for a dist html file: index.html → /, dir/index.html → /dir/. */
  const pagePath = (file: string): string =>
    `/${file.slice(outDir.length + 1).replace(/index\.html$/, '').replace(/\.html$/, '.html')}`.replace(/\\/g, '/');

  /** Per-page SEO block, derived from what the page already says about itself. */
  const seoTags = (html: string, origin: string, path: string): string | null => {
    const title = /<title>([^<]*)<\/title>/.exec(html)?.[1];
    if (!title) return null;
    const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1];
    const url = `${origin}${path}`;
    const image = `${origin}/og-image.png`;
    const lines = [
      `    <link rel="canonical" href="${url}" />`,
      `    <meta property="og:type" content="website" />`,
      `    <meta property="og:site_name" content="worlds." />`,
      `    <meta property="og:title" content="${title}" />`,
      `    <meta property="og:url" content="${url}" />`,
      `    <meta property="og:image" content="${image}" />`,
      `    <meta name="twitter:card" content="summary_large_image" />`,
      `    <meta name="twitter:title" content="${title}" />`,
      `    <meta name="twitter:image" content="${image}" />`,
    ];
    if (description) {
      lines.splice(5, 0,
        `    <meta property="og:description" content="${description}" />`,
      );
      lines.push(`    <meta name="twitter:description" content="${description}" />`);
    }
    return `${lines.join('\n')}\n`;
  };

  let outDir = 'dist';

  return {
    name: 'head-tags',
    apply: 'build',
    configResolved(cfg) {
      outDir = join(cfg.root, cfg.build.outDir);
    },
    closeBundle() {
      let ga = 0;
      let ico = 0;
      let seoCount = 0;
      // The custom domain travels in public/CNAME → dist/CNAME; without it we
      // can't build absolute URLs and skip SEO silently rather than guess.
      const cname = join(outDir, 'CNAME');
      const origin = seo && existsSync(cname)
        ? `https://${readFileSync(cname, 'utf8').trim()}`
        : null;
      const files = htmlFiles(outDir);
      for (const file of files) {
        const before = readFileSync(file, 'utf8');
        let html = before;

        if (analytics && !html.includes(gaId!)) {
          html = insert(html, analytics);
          ga++;
        }
        // A page that already declares any icon keeps its own — we only fill
        // the gap, and we fill it completely.
        if (icons && !/rel="(?:shortcut )?icon"/.test(html)) {
          html = insert(html, iconTags);
          ico++;
        } else if (icons && !html.includes('apple-touch-icon')) {
          // Declared an icon but no Safari/home-screen set: top it up.
          html = insert(html, iconTags.split('\n').slice(1).join('\n'));
          ico++;
        }

        if (origin && !html.includes('rel="canonical"')) {
          const tags = seoTags(html, origin, pagePath(file));
          if (tags) {
            html = insert(html, tags);
            seoCount++;
          }
        }

        if (html !== before) writeFileSync(file, html);
      }
      if (origin) {
        const urls = files
          .map((f) => `  <url><loc>${origin}${pagePath(f)}</loc></url>`)
          .join('\n');
        writeFileSync(
          join(outDir, 'sitemap.xml'),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        );
      }
      this.info(`head-tags: analytics → ${ga} page(s), icons → ${ico} page(s), seo → ${seoCount} page(s)${origin ? ', sitemap.xml written' : ' (skipped: no CNAME)'}`);
    },
  };
}
