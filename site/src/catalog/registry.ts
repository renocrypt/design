// Site identity, navigation, and curated experiences share this catalog.
//
// LANES describes primary destinations: world studies, collection entrances,
// standalone pages, and external links. CURATED describes individual
// experiences inside the collection, so its growth does not crowd the rail.
//
// `kind` says where a lane's files sit, never how finished or how editable it is.
// Nothing in this repo is frozen — a 'static' lane is live work that happens not
// to compile yet, and may move onto our stack whenever it earns it.
//
// ADDING A LANE (the whole checklist lives in docs/CONCEPT.md § Adding a lane):
// 1. Add a row here. `hue` accepts a token reference ('var(--cobalt)') or a hex.
// 2. kind 'world'    → create worlds/<id>/index.html + src/worlds/<id>/…
//    kind 'collection' → create a collection entry and register it in vite.config.ts
//    kind 'static'   → drop the files in site/public/<path>/ and set `href`
//    kind 'external' → set `href` to the absolute URL
// 3. Add the lane's token(s) to src/hub/tokens.css if you referenced new ones.
// 4. Draw the pixel `glyph` in src/hub/main.ts GLYPHS if it isn't there yet.
// World build inputs and hub navigation are derived here. Collection entrances
// are explicit Vite entries, like the hub and type specimen. The marquee and
// closing CTA use world studies; the gallery uses the CURATED entries below.

export interface Lane {
  id: string; // directory name / slug, e.g. '01-noir'
  num: string; // display numeral — '00' reads as origin, before the worlds
  name: string; // display name, e.g. 'Noir'
  hue: string; // door background: 'var(--cobalt)' or '#62e6c8'
  kind: 'world' | 'collection' | 'static' | 'external';
  status: 'live' | 'building';
  href?: string; // collection/static/external URL; world URLs come from the id
  glyph: string; // pixel-glyph key (GLYPHS in src/hub/main.ts)
  kicker: string; // room-card kicker line
  points: [string, string]; // the two room-card bullets
  cta: string;
}

export const SITE = {
  origin: 'https://design.renocrypt.com',
  name: 'Worlds — a design sketchbook',
  description:
    'A personal design sketchbook of immersive worlds, curated explorations, and interactive studies. Each has its own visual identity.',
};

export const LANES: Lane[] = [
  {
    id: '00-lab',
    num: '00',
    name: 'Lab',
    hue: 'var(--mint)', // quotes the lab's own accent — see tokens.css --mint
    kind: 'static',
    status: 'live',
    href: '/lab/',
    glyph: 'stack',
    kicker: 'The workshop',
    points: ['WebGL studies, still in progress', 'Where this began, and keeps going'],
    cta: 'Open the lab',
  },
  {
    id: '01-noir',
    num: '01',
    name: 'Noir',
    hue: 'var(--cobalt)',
    kind: 'world',
    status: 'building',
    glyph: 'crescent',
    kicker: 'Dark cinema',
    points: ['Charcoal & bone, nothing else', 'Light as the only color'],
    cta: 'Explore the study',
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
    cta: 'Enter',
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
    cta: 'Enter',
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
    cta: 'Enter',
  },
  {
    id: '05-curated',
    num: '05',
    name: 'Curated',
    hue: 'var(--seafoam)',
    kind: 'collection',
    status: 'live',
    href: '/curated/',
    glyph: 'atoll',
    kicker: 'Places worth a little time',
    points: ['Immersive experiences with a point of view', 'Begin in the blue of Bikini Atoll'],
    cta: 'Explore the collection',
  },
];

/** Where a lane's door leads. Worlds are built entries; the rest declare their own href. */
export const laneEntry = (lane: Lane): string =>
  lane.kind === 'world' ? `/worlds/${lane.id}/` : (lane.href ?? '/');

/** The lanes vite compiles as HTML entry points. */
export const buildLanes = (): Lane[] => LANES.filter((l) => l.kind === 'world');

export interface CuratedExperience {
  id: string;
  num: string;
  name: string;
  location: string;
  description: string;
  story: string;
  features: string[];
  image: string;
  imageAlt: string;
  sources: { name: string; url: string }[];
}

export const CURATED: CuratedExperience[] = [
  {
    id: 'bikini-atoll',
    num: '01',
    name: 'Bikini Atoll',
    location: 'The Marshall Islands · Pacific Ocean',
    description:
      'An immersive journey from palm-lined islands and turquoise shallows to the historic shipwrecks beneath Bikini’s lagoon.',
    story:
      'Explore an original 3D interpretation of Bikini Atoll, then descend to USS Saratoga, IJN Nagato, and USS Arkansas. Moving water, marine life, and changing light set the pace. The field notes also remember the Bikinian community displaced for nuclear testing in 1946. The landscape and ships are artistic reconstructions, not a navigation or dive-planning chart.',
    features: ['Living water', 'Free exploration', 'Three historic wrecks'],
    image: '/social/bikini-atoll.jpg',
    imageAlt:
      'Turquoise lagoon water and a palm-lined coral island in the Bikini Atoll 3D experience.',
    sources: [
      { name: 'UNESCO World Heritage', url: 'https://whc.unesco.org/en/list/1339/' },
      { name: 'The people and ships of Bikini', url: 'https://bikiniatoll.com/divetour1.html' },
    ],
  },
];

export const curatedEntry = (experience: CuratedExperience): string => `/curated/${experience.id}/`;
