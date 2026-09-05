import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';
import { CURATED, LANES, curatedEntry, laneEntry } from '../src/catalog/registry';

// Bundled and standalone pages use the same metadata path.
// llms.txt stays authored; a build date is never presented as a content date.
export interface SeoOptions { siteUrl: string; siteName: string; description: string }
interface SocialImage { path: string; width: number; height: number; alt: string }
type StructuredItem = Record<string, unknown>;
const esc = (value: string): string => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const decode = (value: string): string => value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (entity, key: string) => {
  if (key[0] === '#') {
    const code = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  }
  return ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' } as Record<string, string>)[key.toLowerCase()] ?? entity;
});

/** Authored HTML can use either quote style and any attribute order. */
const attributes = (tag: string): Record<string, string> => Object.fromEntries(
  Array.from(tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g),
    (m) => [m[1].toLowerCase(), decode(m[2] ?? m[3] ?? m[4])]),
);
const tags = (html: string, name: string): Record<string, string>[] =>
  Array.from(html.matchAll(new RegExp(`<${name}\\b(?:[^>"']|"[^"]*"|'[^']*')*>`, 'gi')), (m) => attributes(m[0]));

export function readMetadata(html: string): { title: string; description?: string; robots?: string; canonical?: string; metas: Record<string, string> } {
  const metas = Object.fromEntries(tags(html, 'meta').filter((a) => a.name || a.property).map((a) => [(a.name ?? a.property).toLowerCase(), a.content ?? '']));
  const title = decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '');
  return { title, description: metas.description, robots: metas.robots,
    canonical: tags(html, 'link').find((a) => a.rel?.toLowerCase().split(/\s+/).includes('canonical'))?.href,
    metas };
}

export function urlPath(file: string): string {
  const path = file.replaceAll('\\', '/');
  return path === 'index.html' ? '/' : path.endsWith('/index.html') ? `/${path.slice(0, -10)}` : `/${path}`;
}

function structuredData(path: string, title: string, description: string, options: SeoOptions): StructuredItem[] {
  const abs = (value: string): string => new URL(value, `${options.siteUrl}/`).href;
  const url = abs(path), website = abs('/#website');
  const lane = LANES.find((item) => laneEntry(item) === path);
  const experience = CURATED.find((item) => curatedEntry(item) === path);
  const graph: StructuredItem[] = [];
  if (path === '/') graph.push({ '@type': 'WebSite', '@id': website, url, name: options.siteName, description: options.description, inLanguage: 'en' });
  const collection = path === '/' || path === '/curated/';
  const page: StructuredItem = {
    '@type': collection ? 'CollectionPage' : 'WebPage', '@id': `${url}#page`, url,
    name: title, description, inLanguage: 'en', isPartOf: { '@id': website },
  };
  if (collection) {
    const entries = path === '/' ? LANES.map((item) => ({ url: abs(laneEntry(item)), name: item.name, description: item.kicker }))
      : CURATED.map((item) => ({ url: abs(curatedEntry(item)), name: item.name, description: item.description }));
    page.mainEntity = { '@id': `${url}#collection` };
    graph.push({ '@type': 'ItemList', '@id': `${url}#collection`, name: path === '/' ? 'Worlds and collections' : 'Curated explorations',
      itemListElement: entries.map((item, i) => ({ '@type': 'ListItem', position: i + 1, ...item })) });
  } else if (experience || lane?.kind === 'world') {
    page.mainEntity = { '@id': `${url}#experience` };
    graph.push({ '@type': 'CreativeWork', '@id': `${url}#experience`, url,
      name: experience?.name ?? lane?.name ?? title, description,
      isPartOf: { '@id': experience ? abs('/curated/#collection') : website },
      ...(experience ? { citation: experience.sources.map((source) => source.url), image: abs(experience.image) } : {}),
    });
  }
  if (path !== '/') {
    const crumbs = [{ name: 'Worlds', item: abs('/') }];
    if (experience) crumbs.push({ name: 'Curated', item: abs('/curated/') });
    else if (path.startsWith('/lab/') && path !== '/lab/') crumbs.push({ name: 'Lab', item: abs('/lab/') });
    crumbs.push({ name: experience?.name ?? lane?.name ?? title, item: url });
    page.breadcrumb = { '@id': `${url}#breadcrumbs` };
    graph.push({ '@type': 'BreadcrumbList', '@id': `${url}#breadcrumbs`, itemListElement: crumbs.map((item, i) => ({ '@type': 'ListItem', position: i + 1, ...item })) });
  }
  return [page, ...graph];
}

/** Fill missing tags individually, preserving deliberate author overrides. */
export function stampSeo(html: string, path: string, options: SeoOptions, image: SocialImage = { path: '/og.png', width: 1200, height: 630, alt: options.siteName }): string {
  const current = readMetadata(html), title = current.title || options.siteName, description = current.description || options.description;
  const abs = (value: string): string => new URL(value, `${options.siteUrl}/`).href;
  const canonical = current.canonical || abs(path), imageUrl = current.metas['og:image'] || abs(image.path);
  const lines: string[] = [];
  const addMeta = (kind: 'name' | 'property', key: string, value: string): void => {
    if (!(key in current.metas)) lines.push(`    <meta ${kind}="${key}" content="${esc(value)}" />`);
  };
  if (!current.canonical) lines.push(`    <link rel="canonical" href="${esc(canonical)}" />`);
  if (!current.description) addMeta('name', 'description', description);
  addMeta('name', 'robots', 'index, follow, max-image-preview:large');
  addMeta('property', 'og:site_name', options.siteName);
  addMeta('property', 'og:type', 'website');
  addMeta('property', 'og:title', title);
  addMeta('property', 'og:description', description);
  addMeta('property', 'og:url', canonical);
  addMeta('property', 'og:image', imageUrl);
  if (!current.metas['og:image']) {
    addMeta('property', 'og:image:width', String(image.width));
    addMeta('property', 'og:image:height', String(image.height));
  }
  addMeta('property', 'og:image:alt', current.metas['og:image'] ? title : image.alt);
  addMeta('name', 'twitter:card', 'summary_large_image');
  addMeta('name', 'twitter:title', title);
  addMeta('name', 'twitter:description', description);
  addMeta('name', 'twitter:image', imageUrl);
  addMeta('name', 'twitter:image:alt', current.metas['og:image'] ? title : image.alt);
  if (!/application\/ld\+json/i.test(html) && !/\bnoindex\b/i.test(current.robots ?? '')) {
    const data = JSON.stringify({ '@context': 'https://schema.org', '@graph': structuredData(path, title, description, options) }).replaceAll('<', '\\u003c');
    lines.push(`    <script type="application/ld+json">${data}</script>`);
  }
  if (!lines.length) return html;
  return html.replace(/<\/head>/i, `${lines.join('\n')}\n  </head>`);
}

const crawl = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? crawl(path) : entry.isFile() && entry.name.endsWith('.html') ? [path] : [];
});

export function sitemapXml(urls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(urls)].sort().map((url) => `  <url><loc>${esc(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
}

export function seo(options: SeoOptions): Plugin {
  let root = process.cwd(), outDir = '';
  const imageFor = (path: string): SocialImage => {
    const experience = CURATED.find((item) => curatedEntry(item) === path) ?? (path === '/curated/' ? CURATED[0] : undefined);
    if (experience) return { path: experience.image, width: 1200, height: 630, alt: experience.imageAlt };
    return existsSync(join(root, 'public', 'og.png')) ? { path: '/og.png', width: 1200, height: 630, alt: options.siteName }
      : { path: '/icon-512.png', width: 512, height: 512, alt: options.siteName };
  };
  return {
    name: 'seo-tags', apply: 'build',
    configResolved(config) { root = config.root; outDir = join(root, config.build.outDir); },
    transformIndexHtml(html, context) {
      if (!context.filename) return html;
      const path = urlPath(relative(root, context.filename));
      return stampSeo(html, path, options, imageFor(path));
    },
    closeBundle() {
      const files = crawl(outDir), urls: string[] = [];
      for (const file of files) {
        const before = readFileSync(file, 'utf8'), path = urlPath(relative(outDir, file));
        const after = stampSeo(before, path, options, imageFor(path));
        if (after !== before) writeFileSync(file, after);
        const metadata = readMetadata(after), url = new URL(path, `${options.siteUrl}/`).href;
        if (!/\bnoindex\b/i.test(metadata.robots ?? '') && metadata.canonical === url) urls.push(url);
      }
      writeFileSync(join(outDir, 'sitemap.xml'), sitemapXml(urls));
      this.info(`seo: ${files.length} pages, ${urls.length} canonical URLs in sitemap.xml`);
    },
  };
}
