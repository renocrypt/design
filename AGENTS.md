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
- Nothing in this repo is frozen, world 00 included — see `docs/CONCEPT.md` § The shape.
- Keep the tracked tree tight: `research/shots/` is gitignored, and anything regenerable or raw stays out.

## Map

- `docs/CONCEPT.md` — the north star: the hub-and-worlds shape, identity rules, stack, deploy, and the add-a-lane checklist.
- `docs/INSPIRATION.md` — where ideas come from: curation hubs, reference sites, the research cost ladder.
- `docs/ASSETS.md` — where material comes from: type, photo, 3D and texture sources, each past its slop filter.
- `docs/specs/` — per-world build specs, written before the world.
- `research/POLES.md` — measured anatomy of the reference poles, one section per site.
- `research/LESSONS.md` — what building taught us, plus this machine's limits (no GPU, no image tooling).
- `site/` — the build: one Vite app (TS + Three.js + GSAP), static output.
- `site/public/lab/` — world 00's studies, served at `/lab/`; live work like any other world.
- `site/src/worlds/registry.ts` — the lane registry; adding anything the hub opens is one row here.

## Commands

```sh
cd site && npm run dev      # http://localhost:5173
cd site && npm run build    # static output in site/dist
```
