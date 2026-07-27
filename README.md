# design — the RenoCrypt design lab

Live at **[design.renocrypt.com](https://design.renocrypt.com/)**.

One entrance opening into self-contained worlds, each built around a single hard visual idea and finished to the same bar.
3D/WebGL is the focus; there is no backend.

## What's here

| Route | What it is |
| --- | --- |
| `/` | The entrance hub — warm paper, toy-box doors, a live Three.js relief hero with a day/night solstice |
| `/worlds/01-noir/` | Dark cinema — charcoal and bone, light as the only colour |
| `/worlds/02-chrome/` | Liquid editorial — chrome rendered live, not baked |
| `/worlds/03-monument/` | White room — one colossal condensed face as architecture |
| `/worlds/04-pulse/` | Guided journey — a five-station click-through, no scrolling |
| `/lab/` | The archive — four single-file WebGL studies from 2026-07, kept exactly as authored |
| `/type/` | Type specimen for the cast faces |

## Layout

```
docs/          the north star: concept, inspiration, asset rules, per-world build specs
research/      dated findings per reference site (NOTES.md); screenshots stay local
site/          the build — one Vite app (TS + Three.js + GSAP), static output
  index.html     the hub
  worlds/<id>/   one HTML entry per world lane
  src/worlds/registry.ts   the lane registry — single source of truth
  public/lab/    the archive, copied verbatim (its own CDN-era stack, untouched)
  tools/         build plugins and font converters
```

## Running it

```sh
cd site
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in site/dist
```

## How it grows

Every destination the hub opens — a world we build, a static archive, an external URL — is one row in `site/src/worlds/registry.ts`.
The build inputs, the rail doors, the mobile menu and the room cards all generate from that array.
The full checklist for adding one is in `docs/CONCEPT.md` § Adding a lane.

Deploys run on push to `main`: GitHub Actions builds `site/` and publishes `site/dist` to Pages.
