// The lane registry — single source of truth for everything the hub opens into.
//
// A lane is any destination the entrance can hand you: a world we build here
// ('world'), a static archive Vite copies verbatim ('static'), or something
// living at another URL entirely ('external'). Only 'world' lanes become build
// entries; the rest are doors the hub renders identically and links elsewhere.
//
// ADDING A LANE (the whole checklist lives in docs/CONCEPT.md § Adding a lane):
// 1. Add a row here. `hue` accepts a token reference ('var(--cobalt)') or a hex.
// 2. kind 'world'    → create worlds/<id>/index.html + src/worlds/<id>/…
//    kind 'static'   → drop the files in site/public/<path>/ and set `href`
//    kind 'external' → set `href` to the absolute URL
// 3. Add the lane's token(s) to src/hub/tokens.css if you referenced new ones.
// 4. Draw the pixel `glyph` in src/hub/main.ts GLYPHS if it isn't there yet.
// The vite build inputs, the rail gates, the mobile menu, the room cards, the
// marquee band and the closing call to action all generate from this array — no
// other file needs touching for a lane to exist. Two of those consumers filter:
// the band and the CTA speak for `kind: 'world'` only.

export interface Lane {
  id: string; // directory name / slug, e.g. '01-noir'
  num: string; // display numeral — '00' reads as origin, before the worlds
  name: string; // display name, e.g. 'Noir'
  hue: string; // door background: 'var(--cobalt)' or '#62e6c8'
  kind: 'world' | 'static' | 'external';
  status: 'live' | 'building' | 'archive';
  href?: string; // required for 'static' and 'external'; ignored for 'world'
  glyph: string; // pixel-glyph key (GLYPHS in src/hub/main.ts)
  kicker: string; // room-card kicker line
  points: [string, string]; // the two room-card bullets
}

export const LANES: Lane[] = [
  {
    id: '00-lab',
    num: '00',
    name: 'Lab',
    hue: 'var(--mint)', // quotes the lab's own accent — see tokens.css --mint
    kind: 'static',
    status: 'archive',
    href: '/lab/',
    glyph: 'stack',
    kicker: 'The archive',
    points: ['Four single-file WebGL studies', 'Where this all started, kept intact'],
  },
  {
    id: '01-noir',
    num: '01',
    name: 'Noir',
    hue: 'var(--cobalt)',
    kind: 'world',
    status: 'live',
    glyph: 'crescent',
    kicker: 'Dark cinema',
    points: ['Charcoal & bone, nothing else', 'Light as the only color'],
  },
  {
    id: '02-chrome',
    num: '02',
    name: 'Chrome',
    hue: 'var(--vermilion)',
    kind: 'world',
    status: 'live',
    glyph: 'droplet',
    kicker: 'Liquid editorial',
    points: ['Chrome rendered live, not baked', 'Warm stone, scalpel accents'],
  },
  {
    id: '03-monument',
    num: '03',
    name: 'Monument',
    hue: 'var(--violet)',
    kind: 'world',
    status: 'live',
    glyph: 'monolith',
    kicker: 'White room',
    points: ['One colossal condensed face', 'Type is the architecture'],
  },
  {
    id: '04-pulse',
    num: '04',
    name: 'Pulse',
    hue: 'var(--red)',
    kind: 'world',
    status: 'live',
    glyph: 'heart',
    kicker: 'Guided journey',
    points: ['One red, weight does the talking', 'Flat charm over live 3D'],
  },
];

/** Where a lane's door leads. Worlds are built entries; the rest declare their own href. */
export const laneEntry = (lane: Lane): string =>
  lane.kind === 'world' ? `/worlds/${lane.id}/` : (lane.href ?? '/');

/** The lanes vite compiles as HTML entry points. */
export const buildLanes = (): Lane[] => LANES.filter((l) => l.kind === 'world');
