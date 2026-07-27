import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

// Head tags every page must carry — analytics and the icon set — stamped into
// EVERY html file in dist at the end of the build: the bundled entries (hub,
// type, worlds) and the verbatim-copied archive under /lab alike.
//
// Doing it here rather than in transformIndexHtml is the whole point: files in
// public/ never pass through Vite's html pipeline, so template-level tags miss
// them silently. That is exactly how the archive shipped with no favicon —
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
}

export function headTags({ gaId, icons = true }: HeadTagOptions): Plugin {
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

  // Absolute paths: the archive lives at /lab/, so relative hrefs would miss.
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
      for (const file of htmlFiles(outDir)) {
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

        if (html !== before) writeFileSync(file, html);
      }
      this.info(`head-tags: analytics → ${ga} page(s), icons → ${ico} page(s)`);
    },
  };
}
