import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

// Google tag, injected once at the end of the build into EVERY html file in
// dist — the bundled entries (hub, type, worlds) and the verbatim-copied
// archive under /lab alike. Doing it here rather than in transformIndexHtml
// is the whole point: files in public/ never pass through Vite's html
// pipeline, so a template-level tag would silently miss the lab pages.
//
// Build-only: `vite dev` stays analytics-free.
export function googleTag(id: string): Plugin {
  const snippet = `    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', '${id}');
    </script>
`;

  const htmlFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return htmlFiles(p);
      return e.isFile() && e.name.endsWith('.html') ? [p] : [];
    });

  let outDir = 'dist';

  return {
    name: 'google-tag',
    apply: 'build',
    configResolved(cfg) {
      outDir = join(cfg.root, cfg.build.outDir);
    },
    closeBundle() {
      let n = 0;
      for (const file of htmlFiles(outDir)) {
        const html = readFileSync(file, 'utf8');
        if (html.includes(id)) continue; // idempotent across repeat builds
        // </head> is present in every page here; fall back to <body> only if a
        // future hand-authored page omits it.
        const anchor = html.includes('</head>') ? '</head>' : '<body>';
        const next =
          anchor === '</head>'
            ? html.replace('</head>', `${snippet}  </head>`)
            : html.replace('<body>', `<body>\n${snippet}`);
        if (next === html) continue;
        writeFileSync(file, next);
        n++;
      }
      this.info(`google-tag: ${id} injected into ${n} page(s)`);
    },
  };
}
