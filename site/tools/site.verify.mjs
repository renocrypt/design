import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { CURATED, LANES, SITE, curatedEntry, laneEntry } from '../src/catalog/registry.ts';
import { readMetadata, urlPath } from './vite-plugin-seo.ts';

const root = resolve('dist');
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(join(dir, entry.name))
      : entry.name.endsWith('.html')
        ? [join(dir, entry.name)]
        : [],
  );
assert.ok(existsSync(root), 'build the site before verifying its output');
assert.equal(readFileSync(join(root, 'CNAME'), 'utf8').trim(), new URL(SITE.origin).hostname);
const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
const files = walk(root);
for (const file of files) {
  const html = readFileSync(file, 'utf8'),
    meta = readMetadata(html),
    path = urlPath(relative(root, file)),
    canonical = SITE.origin + path;
  assert.equal(meta.canonical, canonical, `${path}: canonical`);
  assert.ok(meta.description, `${path}: description`);
  assert.ok(
    meta.metas['og:title'] && meta.metas['og:image'] && meta.metas['twitter:card'],
    `${path}: share card`,
  );
  const noindex = /\bnoindex\b/i.test(meta.robots ?? '');
  assert.equal(
    sitemap.includes(`<loc>${canonical}</loc>`),
    !noindex,
    `${path}: sitemap eligibility`,
  );
  if (!noindex) {
    const scripts = [
      ...html.matchAll(
        /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
      ),
    ];
    assert.ok(scripts.length, `${path}: structured data`);
    scripts.forEach((script) => JSON.parse(script[1]));
  }
  for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    const value = match[1];
    if (/^(?:https?:|data:|mailto:|tel:|javascript:)/.test(value)) continue;
    const url = new URL(value, canonical),
      target = resolve(root, '.' + decodeURIComponent(url.pathname));
    assert.ok(
      target.startsWith(root + '/') || target === root,
      `${path}: asset stays inside the site`,
    );
    assert.ok(existsSync(target), `${path}: missing ${url.pathname}`);
  }
}
for (const path of [...LANES.map(laneEntry), ...CURATED.map(curatedEntry)]) {
  if (path.startsWith('https:')) continue;
  assert.ok(
    existsSync(join(root, path, 'index.html')),
    `registered destination ${path} is published`,
  );
}
const hub = readFileSync(join(root, 'index.html'), 'utf8');
assert.ok(hub.includes('href="/curated/"'), 'the built hub links to the collection');
const gallery = readFileSync(join(root, 'curated/index.html'), 'utf8');
for (const entry of CURATED)
  assert.ok(
    gallery.includes(`href="${curatedEntry(entry)}"`),
    'the gallery links to its experience without client scripting',
  );
assert.ok(
  readFileSync(join(root, 'llms.txt'), 'utf8').includes('/curated/bikini-atoll/'),
  'the authored discovery guide includes the new route',
);
assert.doesNotMatch(sitemap, /<lastmod>/, 'do not publish build dates as content changes');
console.log(
  `Verified ${files.length} HTML pages: routes, assets, canonical URLs, social metadata, structured data, sitemap, and static navigation.`,
);
