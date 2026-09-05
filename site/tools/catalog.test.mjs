import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { CURATED, LANES, curatedEntry, laneEntry } from '../src/catalog/registry.ts';
import { curatedMarkup, roomsMarkup, gatesMarkup } from '../src/catalog/markup.ts';

test('every registered destination has one unique, intentional URL', () => {
  const routes = [...LANES.map(laneEntry), ...CURATED.map(curatedEntry)];
  assert.equal(new Set(routes).size, routes.length);
  for (const route of routes) assert.match(route, /^\/[\w/-]+\/$|^https:\/\//);
});

test('curated entries retain one HTML, CSS, and JavaScript file', () => {
  for (const entry of CURATED) {
    const dir = resolve('public', `.${curatedEntry(entry)}`);
    assert.deepEqual(readdirSync(dir).sort(), ['index.html', 'scene.js', 'style.css']);
    assert.ok(existsSync(resolve('public', `.${entry.image}`)), 'the authored preview exists');
  }
});

test('the hub and collection contain working links and editorial content without JavaScript', () => {
  const hub = roomsMarkup(),
    gallery = curatedMarkup();
  assert.match(hub, /href="\/curated\/"/);
  assert.match(hub, /Explore the collection/);
  assert.match(hub, /In progress/);
  assert.match(gatesMarkup(), /Curated/);
  for (const entry of CURATED) {
    assert.ok(gallery.includes(`href="${curatedEntry(entry)}"`));
    assert.ok(gallery.includes(entry.name));
    assert.ok(gallery.includes('A little context.'));
    assert.ok(gallery.includes(entry.sources[0].url));
  }
});
