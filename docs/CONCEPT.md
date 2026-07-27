# Concept — the hub and its worlds

The north star for everything we build here.
Content is never the point; **look and vibe are ubercritical** — copy and structure get tailored to us later, aesthetics are studied and stolen now.
This is a personal project, kept for ourselves: no acknowledgement rituals anywhere (no credits footers, no award ceremony), and personal-use font tiers are fully in scope.

## The shape

One **entrance site** — modern, elegant, bold, unique — that opens into four **worlds**, each a self-contained experience with its own distinct vibe, all finished to the same bar.

- The hub is a design statement in its own right, not a table of contents. It sells the universe, then hands off.
- Each world is one hard idea executed cleanly (per `INSPIRATION.md` habits) — different vibe, same level of commitment.
- In repo terms: everything lives in `site/` — one Vite app, the hub fronting the world pages.

Alongside the worlds sits **00 — Lab**, the archive (merged 2026-07-27): the four single-file WebGL studies that preceded this build, at `/lab/`.
They are kept exactly as authored — CDN libraries, no build step — because they are a dated record, not living code.
Mechanically this is why the merge is frictionless: `site/public/` is copied verbatim by Vite, so the archive's own stack never meets ours.
It is a lane like any other (registry `kind: 'static'`), which is the general shape for anything the hub should open but not compile.

## The mapping (decided 2026-07-26)

Each design target takes one reference pole — original styles described truthfully in `research/NOTES.md`, then rebuilt with our identity, faces, and content.

| Target | Reference pole | Original style in one line |
| --- | --- | --- |
| **Hub** | units.gr | Warm cream paper, toy-box color cards as numbered nav, chunky display face, marquees, one radius |
| **01 — Noir** | lamalama.com | Charcoal + bone total two-color commitment, mono labels vs. grotesk statements, red only as footage, full-WebGL motion craft |
| **02 — Chrome** | hildenkaira.fi | Warm-stone editorial serif + liquid-chrome masthead and metallic stickers, vermilion/pistachio/jade accents |
| **03 — Monument** | experiment.obys.agency | Gallery-white void, one custom face as colossal caps monument sliced by hairlines, wry museum labeling, Three.js gallery |
| **04 — Pulse** | blood-donation.com | Saturated single-hue red poster, one variable font by weight, flat-vector charm over a WebGPU click-through journey (XState-staged, not scroll) |

Working names are ours and renameable.
Five poles, zero overlap: warm toy-box, dark cinema, chrome editorial, white type-monument, red flat-pop journey — proof that worlds may differ radically as long as each commits totally.
Runtime-3D truth per pole (what we verified, not what it looks like): lamalama real WebGL; hildenkaira **pre-rendered** chrome (zero runtime 3D — our version goes live-3D); obys real Three.js; blood-donation Three.js on the WebGPU renderer.

## Backlog (later worlds)

Validated 2026-07-26 from posts.design + recent.design: liquid glass / refraction, jelly & soft-body UI, kinetic typography, dither & grain.
A world enters the queue only with a one-line vibe statement this sharp.

## Identity rules (hard constraints)

- **Type**: every target gets its own deliberately chosen face from the vetted sources in `ASSETS.md` § Type. No reflex Google Fonts, no Inter-by-default. Pattern proven by every pole: one characterful display + one quiet workhorse, two families max (blood-donation shows one variable family can do both jobs).
- **Palette**: a designed artifact, never a default ramp. Derived from a material, photo, HDRI, or print reference (lamalama's red is ink-in-water macro photography, not a hex picked in a color tool). Limited — canvas + text + few accents. Named tokens in the target's folder.
- **Motion**: each target has a signature easing/physics feel; motion vocabulary is part of the identity, not decoration sprinkled at the end.
- **Icons/glyphs are drawn, not downloaded**: hand-made SVG in each world's own language, animated where it earns it — no stock icon sets (see `ASSETS.md` § Icons).
- **The hub keeps its own identity too** — it is the fifth design, not a neutral frame.
- **Un-replicable media gets a stand-in, never an imitation**: reference photography/footage (units.gr lifestyle shots, lamalama's macro red ink) is not replaced with stock lookalikes — we build items with comparable vibe from what we own: shaders, generated fields, live 3D, drawn SVG. Generated beats downloaded (per `ASSETS.md`).

## Stack (decided 2026-07-26)

Vite + TypeScript + vanilla Three.js + GSAP (SplitText/ScrollTrigger — all free now).
Static output only; frontend only.
One app, N HTML entries (hub + worlds) generated from the lane registry (`site/src/worlds/registry.ts`) — only `kind: 'world'` lanes become build inputs.
**Deploy** (from 2026-07-27): GitHub Actions builds `site/` and publishes `site/dist` to `design.renocrypt.com` (`.github/workflows/pages.yml`); the Pages source is the workflow, not a branch folder.
`site/public/CNAME` carries the domain into every build — deleting it drops the custom domain.
Head tags: one Vite plugin (`site/tools/vite-plugin-head-tags.ts`) stamps the Google tag **and the icon set** into every built page at `closeBundle`, including the verbatim-copied archive — template-level tags silently miss `public/`, which is exactly how the archive shipped faviconless.
Icons: `favicon.svg` is hand-authored; `favicon.ico` (16+32), `apple-touch-icon.png` (180) and `icon-512.png` are generated by `site/tools/make-favicons.mjs` (no image library on this machine — it writes PNG/ICO bytes directly). Change the mark in one and regenerate the other; the geometry is duplicated by design and noted in both files.
Fonts: self-hosted in-repo is the default (license text alongside); **CDN font delivery is allowed** (ruled 2026-07-27) when a face can't be reasonably persisted — the uniqueness/elegance bar for pairings is unchanged, and each world still casts its own faces from `ASSETS.md` § Type.
Other runtime assets (HDRI, models, textures) stay self-hosted in-repo per their licenses.

## Adding a lane (for future agents)

The lab is built to grow past four worlds. One checklist, in order:

1. **Registry row** — add to `LANES` in `site/src/worlds/registry.ts` (`id`, `num`, `name`, `hue`, `kind`, `status`, `glyph`, `kicker`, `points`).
   The vite build inputs, the rail doors, the mobile menu **and the room-card grid** all generate from this list; the lane now exists, is linked, and has a card.
   `kind` decides the rest: `'world'` becomes a build entry under `worlds/<id>/`; `'static'` lives in `site/public/<path>/` and just needs an `href`; `'external'` is an absolute URL.
2. **World folder** — `site/worlds/<id>/index.html` + `site/src/worlds/<id>/main.ts` + `world.css` (+ optional `scene.ts`).
   World pages are self-contained identities: own tokens, own faces, own motion law — never import another world's CSS.
3. **Theme policy** — decide day/night stance up front (dark-only / both / a signature toggle).
   If dual-mode: read `localStorage('hub-theme')` pre-paint in an inline head script and write back on toggle — lab-wide continuity.
4. **Pixel glyph** — draw the lane's `glyph` as a 10×10 ASCII bitmap in `GLYPHS` in `src/hub/main.ts`; the room-card and rail render themselves from it. No hand-authored card markup — `#worlds` is empty in `index.html` by design.
5. **Hue token** — add the lane's hue to `site/src/hub/tokens.css` if the registry references a new `var(...)`.
6. **The hard rules still apply**: measured-anatomy reference pole filed in `research/NOTES.md` first; degrade ladder (live → still frame → art-directed DOM) with ≤40 draw calls and dpr ≤1.75; `webglcontextlost` guard; GSAP owns every transform it touches; icons drawn, never stock; assets pass the `ASSETS.md` slop filter; unique image assets per world (generated/seeded beats downloaded).
7. **Spec first** — write the world's build spec into `docs/specs/<id>.json` (shape: world/policy/typecasting/downloads/sections/centerpiece/assets2d/motion/fallback/distinct) and check it against `docs/specs/_verdict.md`'s distinctiveness matrix before building.
