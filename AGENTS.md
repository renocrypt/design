# design — UI/UX + 3D web exploration

Exploring beautiful, elegant websites; 3D/WebGL is the focus, backend is out of scope.
The bar throughout: clear, organized, elegantly implemented.

## Laws

These are the ones that cost us when broken; everything else lives behind a pointer below.

- Markdown prose: one sentence per line, no column wrapping — grep, diffs and edits stay sentence-granular.
- Take the cheapest research rung that answers the question — the ladder is in `docs/INSPIRATION.md`.
- The browser is one shared instance on constrained hardware: sequential use, never parallel, and close the page when done.
- Measure before claiming, and probe rather than eyeball — a number in a commit message must come from a run, not an estimate.
- Tracked files are current state, not a journal: a correction deletes what it overturns, and per-version narrative stays in git.
- No document is written before the thing it describes is settled — the code is the spec.
- Nothing in this repo is frozen, world 00 included — see `docs/CONCEPT.md` § The shape.
- Keep the tracked tree tight: `research/shots/` is gitignored, and anything regenerable or raw stays out.

## Map

- `docs/CONCEPT.md` — the north star: the hub-and-worlds shape, identity rules, stack, deploy, and the add-a-lane checklist.
- `docs/INSPIRATION.md` — where ideas come from: curation hubs, reference sites, the research cost ladder.
- `docs/ASSETS.md` — where material comes from: type, photo, 3D and texture sources, each past its slop filter.
- `research/POLES.md` — measured anatomy of the reference poles, one section per site.
- `research/LESSONS.md` — what building taught us.
- `site/` — the build: one Vite app (TS + Three.js + GSAP), static output.
- `site/public/lab/` — world 00's studies as authored, copied verbatim; `site/lab/` holds the ones that have moved onto our stack as build entries. Both serve under `/lab/`, live work like any other world.
- `site/src/catalog/registry.ts` — site identity, primary destinations, and curated experiences.
- `docs/ARCHITECTURE.md` — source ownership, standalone curation, metadata, and publishing checks.
- `site/public/curated/<slug>/` — self-contained experiences, each with one HTML, CSS, and JavaScript file.

## Commands

```sh
cd site && npm run dev      # http://localhost:5173
cd site && npm run build    # static output in site/dist
cd site && npm run test:site # catalog and metadata behavior
cd site && npm run verify:site # built routes, assets, and discovery output

# Checks. The verifier builds the real scene graph, poses it the way the scroll
# actually poses it, and projects it to site/.verify/*.svg, so 3D geometry can be
# looked at without a GPU.
cd site && node --experimental-strip-types src/lab/cipher/{layout,enigma,tracks}.test.mjs
cd site && node --experimental-strip-types --import ./tools/ts-resolve.mjs src/lab/cipher/scene.verify.mjs

# Solves S5's camera stops when the copy collides with the machine; prints numbers
# to paste into CAMERA_STOPS, which scene.verify.mjs then asserts.
cd site && node --experimental-strip-types --import ./tools/ts-resolve.mjs src/lab/cipher/stops.tune.mjs
```

The software-renderer rung is real and reachable — force it with
`--use-angle=swiftshader --enable-unsafe-swiftshader --disable-gpu` on a throwaway
`--user-data-dir`. Local dev is an Apple GPU and never exercises it.
