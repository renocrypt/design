import test from 'node:test';
import assert from 'node:assert/strict';
import { readMetadata, sitemapXml, stampSeo, urlPath } from './vite-plugin-seo.ts';
import { SITE } from '../src/catalog/registry.ts';

const options = { siteUrl: SITE.origin, siteName: SITE.name, description: SITE.description };
const document = (head) => `<!doctype html><html lang="en"><head>${head}</head><body><h1>A real page</h1></body></html>`;

test('standalone HTML retains multiline descriptions, reordered attributes, and entities', () => {
  const html = document(`<title>Coral &amp; the sea</title><meta content='A &quot;quiet&quot; place &amp; a living ocean'\n data-author='yes' NAME='description'>`);
  const built = stampSeo(html, '/curated/bikini-atoll/', options);
  const meta = readMetadata(built);
  assert.equal(meta.title, 'Coral & the sea');
  assert.equal(meta.metas['og:description'], 'A "quiet" place & a living ocean');
  assert.equal(meta.canonical, `${SITE.origin}/curated/bikini-atoll/`);
  assert.doesNotMatch(built, /&amp;amp;/);
});

test('partial authored social cards receive missing tags without overwriting their title', () => {
  const html = document(`<title>Bikini Atoll</title><meta property='og:title' content='A title chosen by the author'>`);
  const built = stampSeo(html, '/curated/bikini-atoll/', options);
  const meta = readMetadata(built);
  assert.equal(meta.metas['og:title'], 'A title chosen by the author');
  assert.equal(meta.metas['og:description'], SITE.description);
  assert.ok(meta.metas['twitter:card']);
  assert.equal(stampSeo(built, '/curated/bikini-atoll/', options), built, 'a second build pass is idempotent');
});

test('an authored social image is reused without invented dimensions', () => {
  const built = stampSeo(document(`<title>Own image</title><meta property="og:image" content="https://example.com/own.jpg">`), '/own/', options);
  const meta = readMetadata(built);
  assert.equal(meta.metas['twitter:image'], 'https://example.com/own.jpg');
  assert.equal(meta.metas['og:image:width'], undefined);
});

test('curated structured data describes the work and actual navigation parents', () => {
  const built = stampSeo(document('<title>Bikini Atoll</title>'), '/curated/bikini-atoll/', options);
  const data = JSON.parse(built.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const crumbs = data['@graph'].find((node) => node['@type'] === 'BreadcrumbList');
  assert.deepEqual(crumbs.itemListElement.map((item) => item.item), [SITE.origin+'/', SITE.origin+'/curated/', SITE.origin+'/curated/bikini-atoll/']);
  assert.equal(data['@graph'].find((node) => node['@type'] === 'CreativeWork').name, 'Bikini Atoll');
});

test('structured text cannot terminate its script element', () => {
  const built = stampSeo(document('<title>&lt;/script&gt;&lt;script&gt;unexpected&lt;/script&gt;</title>'), '/safe/', options);
  const scripts = [...built.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.equal(JSON.parse(scripts[0][1])['@graph'][0].name, '</script><script>unexpected</script>');
  assert.doesNotMatch(scripts[0][1], /<script>/);
});

test('noindex pages preserve their indexing decision and do not gain collection data', () => {
  const built = stampSeo(document('<title>Not here</title><meta content="noindex, follow" name="robots">'), '/404.html', options);
  assert.equal(readMetadata(built).robots, 'noindex, follow');
  assert.doesNotMatch(built, /application\/ld\+json/);
});

test('URL and sitemap output are stable and do not claim content changed at build time', () => {
  assert.equal(urlPath('curated/bikini-atoll/index.html'), '/curated/bikini-atoll/');
  assert.equal(urlPath('worlds\\01-noir\\index.html'), '/worlds/01-noir/');
  assert.equal(urlPath('index.html'), '/');
  const sitemap = sitemapXml([SITE.origin+'/curated/', SITE.origin+'/', SITE.origin+'/curated/']);
  assert.equal([...sitemap.matchAll(/<loc>/g)].length, 2);
  assert.doesNotMatch(sitemap, /lastmod/);
});
