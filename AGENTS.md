# design — UI/UX + 3D web exploration

Exploring beautiful, elegant websites; 3D/WebGL is the focus, backend is out of scope.
The bar throughout: clear, organized, elegantly implemented.

## Conventions

- Markdown prose: one sentence per line, no column wrapping — keeps grep, diffs, and edits sentence-granular.
- Research cost ladder: search → fetch (WebFetch, or curl/python static analysis of HTML/CSS/JS) → DOM snapshot → screenshot → runtime probe. Use the cheapest rung that answers; the browser is one shared instance on constrained hardware — Playwright rungs are last resort, sequential, never parallel.
- Browser hygiene (any MCP — Playwright, Chrome DevTools, …): one shared instance, sequential use, and when a session is done close the tab/page — no dangling pages eating memory.
- Screenshots are filed as `research/shots/<site>/<date>-<what>.png`, never left in the repo root — and `research/shots/` is **gitignored**: evidence stays on disk, the findings it supports go in `research/POLES.md`, which is tracked. Keep the tracked tree tight; if a file is regenerable or is raw evidence, it does not belong in the repo.
- Research files are **current state, not a journal**: a re-visit that overturns a measurement deletes the old one instead of appending a dated correction, and per-version build narrative stays in git rather than in `research/`.

## Layout

- `docs/CONCEPT.md` — the north star: one entrance hub opening into distinct-vibe worlds; identity rules (type, palette, motion).
- `docs/INSPIRATION.md` — inspiration hubs + single-site reference studies.
- `docs/ASSETS.md` — asset sources; additions must pass its slop filter.
- `research/POLES.md` — measured anatomy of the five reference poles, one section per site.
- `research/LESSONS.md` — what building against them taught us, plus this machine's limits (no GPU, no image tooling).
- `site/` — the build: one Vite app (TS + Three.js + GSAP), hub entrance + world entries, static output.
- `site/public/lab/` — the 2026-07 archive of single-file WebGL studies, served at `/lab/`. Copied verbatim by Vite; it keeps its own CDN-era stack, so never "modernise" it into the app.
- Adding anything the hub opens into is one row in `site/src/worlds/registry.ts` — see `docs/CONCEPT.md` § Adding a lane.
- Deploys: push to `main` → GitHub Actions builds `site/` → Pages serves `site/dist` at design.renocrypt.com.
