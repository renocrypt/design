import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { HERO_REVISION } from '../src/hub/lounge/revision.ts';

const dir = 'public/hero';

test('the compressed room has a usable camera, bounded geometry, and its required decoder', () => {
  const bytes = readFileSync(join(dir, 'lounge.glb'));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const primitives = gltf.meshes.flatMap((mesh) => mesh.primitives);
  assert.ok(primitives.length <= 40, 'the hero stays inside its draw-call budget');
  const triangles = primitives.reduce((count, primitive) => count + gltf.accessors[primitive.indices].count / 3, 0);
  assert.ok(triangles < 300000, 'geometry remains suitable for the hero');
  assert.equal(gltf.cameras.length, 1);
  assert.ok(gltf.cameras[0].perspective.yfov > 0 && gltf.cameras[0].perspective.yfov < Math.PI);
  assert.ok(gltf.nodes.some((node) => node.extras?.unbaked), 'fine geometry keeps its own material batches');
  assert.ok(gltf.extensionsUsed.includes('KHR_draco_mesh_compression'));
  for (const file of ['draco_decoder.wasm', 'draco_wasm_wrapper.js', 'LICENSE']) {
    assert.ok(existsSync(join(dir, 'draco', file)));
  }
});

test('day and night retain matching stills, mobile atlases, and a current content fingerprint', () => {
  for (const suffix of ['', '-night']) {
    for (const name of [`lounge-still${suffix}.webp`, `lounge-atlas${suffix}.webp`, `lounge-atlas${suffix}-mobile.webp`]) {
      const bytes = readFileSync(join(dir, name));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      assert.ok(bytes.length > 1000);
    }
  }
  const hash = createHash('sha256');
  for (const name of ['lounge.glb', 'lounge-atlas.webp', 'lounge-atlas-night.webp']) hash.update(readFileSync(join(dir, name)));
  assert.equal(HERO_REVISION, hash.digest('hex').slice(0, 12));
});

test('the inlined illustrations have unique definitions and no active or remote content', () => {
  const ids = [];
  for (const name of readdirSync('src/hub/art').filter((name) => name.endsWith('.svg'))) {
    const svg = readFileSync(join('src/hub/art', name), 'utf8');
    assert.match(svg, /<svg\b[^>]*viewBox=/);
    assert.doesNotMatch(svg, /<script\b|<foreignObject\b|(?:href|src)="https?:/i);
    ids.push(...[...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  }
  assert.equal(new Set(ids).size, ids.length, 'inline SVG definitions cannot collide');
});
