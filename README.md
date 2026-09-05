# Worlds — the RenoCrypt design sketchbook

Live at **[design.renocrypt.com](https://design.renocrypt.com/)**.

One entrance for distinct worlds, curated explorations, and a workshop of interactive studies.
Each experience keeps its own visual identity; the catalog, navigation, and publishing are shared.
The site is a static front end, hosted on GitHub Pages.

## What's here

| Route | What it is |
| --- | --- |
| `/` | The entrance hub — warm paper, toy-box doors, a live Three.js relief hero with a day/night solstice |
| `/worlds/01-noir/` | A night-drive study in progress — charcoal and bone, light as the only colour |
| `/worlds/02-chrome/` | Liquid editorial — chrome rendered live, not baked |
| `/worlds/03-monument/` | White room — one colossal condensed face as architecture |
| `/worlds/04-pulse/` | Guided journey — a five-station click-through, no scrolling |
| `/lab/` | The lab — an entrance of its own (dark, phosphor mint) opening into the WebGL studies this all grew from; live work, rebuilt as their turn comes |
| `/type/` | Type specimen for the cast faces |
| [`/curated/`](https://design.renocrypt.com/curated/) | Curated explorations, with introductions, context, and links to each experience |
| [`/curated/bikini-atoll/`](https://design.renocrypt.com/curated/bikini-atoll/) | Bikini Atoll — a WebGPU lagoon and three historic shipwrecks to explore |

## Layout

```
docs/                       design direction, architecture, and asset guidance
research/                   reference anatomy and standing lessons
site/                       one static site and its build
  index.html                the entrance hub
  curated/index.html        the collection entrance
  worlds/<id>/              HTML entries for the four world studies
  src/catalog/              site identity, route registry, curated entries, and static markup
  src/hub/                  the hub's visual system and interactions
  src/curated/              the collection's visual system
  src/worlds/<id>/          each world's independent implementation
  public/curated/<slug>/    standalone experiences: index.html, style.css, scene.js
  public/social/            authored images for the collection and sharing
  public/lab/               standalone lab studies
  tools/                    build plugins, metadata tests, and output verification
```

## Running it

```sh
cd site
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in site/dist
npm run test:site
npm run verify:site  # checks the output after a build
```

## How it grows

Primary destinations live in `LANES`, and individual curated experiences live in `CURATED`, both in [`site/src/catalog/registry.ts`](site/src/catalog/registry.ts).
To add a standalone experience, place its three files in `site/public/curated/<slug>/` and add its catalog entry.
The gallery publishes its description and link in HTML, and the build adds page metadata, breadcrumbs, and a sitemap entry.
The experience keeps its own JavaScript and CSS; it does not need a package manifest or a separate build.

Read [the architecture](docs/ARCHITECTURE.md) for route ownership and the publishing checks, and [the design direction](docs/CONCEPT.md) for the visual rules.

On push to `main`, GitHub Actions tests the catalog and SEO behavior, builds `site/`, verifies the complete output, and publishes `site/dist` to Pages.
