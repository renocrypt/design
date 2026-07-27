# Inspiration sources

The curated list of places we pull design inspiration from.
One line of *what it's for* per site — detailed findings from actual visits go in `research/NOTES.md`, screenshots in `research/shots/<site>/`.

Research cost ladder (cheapest first) — pick the lowest rung that answers the question:

1. **WebSearch / WebFetch** — what a site is, whether it's worth visiting.
2. **Playwright DOM snapshot** — structure, content list, link targets.
3. **Playwright screenshot** — only when we need to *see* the design.
4. **Runtime analysis** (JS eval, network log, probe) — only for how-did-they-build-it deep dives.

## Our shortlist (user-provided)

| Site | What it is | Best for |
| --- | --- | --- |
| [posts.design](https://posts.design) | Curated wall of brand social posts (292+), each linking to its original source | Card-scale graphic language: type, color, motion trends. Visited 2026-07-26 ✓ |
| [recent.design](https://recent.design) | Daily-curated multi-category gallery (Web, Interface, Motion, 3D, Typography…) with sub-galleries for Websites, OG Images, App Screenshots, App Icons | Broadest single feed; category filters map to our sketch topics. Visited 2026-07-26 ✓. Note: 403s WebFetch — needs Playwright |
| [mnmm.xyz](https://mnmm.xyz) ("Minimum") | Hand-curated directory of ~148 minimalist sites, mostly designer/dev portfolios (Rauch, shadcn, Paco Coursey…) | The restrained end of the spectrum; portfolio patterns |

## Reference sites (single-site studies)

User-provided single sites studied whole — north-star references feeding `CONCEPT.md`, not recurring hubs.

| Site | What it is | Role |
| --- | --- | --- |
| [lamalama.com](https://lamalama.com) | Amsterdam agency, 15× Awwwards Developer Award; full-WebGL virtual-scroll site | Pole for boldness + motion craft. Visited 2026-07-26 ✓. WebGL dies under SwiftShader — study via og-image + DOM probes |
| [units.gr](https://units.gr/en/homepage/) | Student-housing brand site by Big Horror (design) / Lemonjelly (code) | Pole for entrance-page anatomy: numbered color-card nav → sections → handoff. Visited 2026-07-26 ✓ |
| [hildenkaira.fi](https://www.hildenkaira.fi/) | Helsinki social-content agency; warm-stone editorial serif + pre-rendered liquid-chrome collage | World 02 pole. Visited 2026-07-26 ✓. Drops WebFetch — Playwright required |
| [experiment.obys.agency](https://experiment.obys.agency/) | Obys' unpublished-works archive; white void, custom-face type monument, real Three.js gallery | World 03 pole. Visited 2026-07-26 ✓. Its WebGL needs a real GPU — shell only under SwiftShader |
| [blood-donation.com](https://blood-donation.com/) | Interactive 3D donation guide; single-hue red poster + WebGPU-renderer scrollytelling | World 04 pole. Visited 2026-07-26 ✓. Renders fully in our env |

## Full-site galleries

- [Awwwards](https://www.awwwards.com/websites/sites_of_the_year/) — the center of gravity; Sites of the Year/Month are the best filter.
- [FWA](https://thefwa.com) — skews experimental WebGL/immersive.
- [Godly](https://godly.website) — tightly curated landing pages, heavy motion.
- [Minimal Gallery](https://minimal.gallery) / [SiteInspire](https://www.siteinspire.com) /
[Httpster](https://httpster.net) — typography-and-layout end.
- [Refs.Gallery WebGL](https://www.refs.gallery/category/webgl) — weekly hand-picked WebGL sites.
- [Land-book](https://land-book.com) / [A1](https://www.a1.gallery) /
[Best Website Gallery](https://bestwebsite.gallery) — general curation, good breadth.

## Gap-fillers (added 2026-07-26, each verified via WebFetch)

| Site | What it is | Gap it fills |
| --- | --- | --- |
| [60fps.design](https://60fps.design) | ~2,000 short captures of UI animations from real apps (Duolingo, ChatGPT, Apple Wallet…), 100+ tags incl. 3D, Parallax, Spring Physics | **Micro-interaction motion** — the easing/spring vocabulary our galleries don't show |
| [hoverstat.es](https://www.hoverstat.es) | "The home of alternative web-design" — editorial features on experimental sites (dial navigation, wind-speed-driven pages, variable-font fades) | **The weird end** — ideas from outside the trend cycle; each entry explains *why* it's interesting |
| [dark.design](https://www.dark.design) | Hundreds of dark-theme sites (Vercel, Linear, Raycast, xAI), filterable by category | **Dark-first, concentrated** — directly serves the dominant aesthetic we keep seeing |
| [unsection.com](https://www.unsection.com) | 4,000+ real page *sections* — Hero, Pricing, Footer — tagged by style (Bento, Gradient, Large Type, 3D) | **Section-level patterns** — between posts.design's cards and Awwwards' full sites (note: free login gate) |
| [osmo.supply](https://osmo.supply) | Component vault (transitions, cursors, scroll effects) by two 38×-Awwwards devs; GSAP-centric | **Ready-made technique** — paid (~€20/mo), so: browse the free previews, buy only if we hit a wall |

Evaluated and skipped: cosmos.so — a moodboard/collection *tool*, not a source; our `research/` folder already plays that role.

## Technique sources (come with code)

- [Codrops](https://tympanus.net/codrops/) — dissected effects with demos + source; half our sketch ideas can start here.
- [three.js examples](https://threejs.org/examples/) + forum showcase — canonical reference implementations.
- [Maxime Heckel's blog](https://blog.maximeheckel.com) — long-form shader/R3F writeups (dithering, particles).
- [Shadertoy](https://www.shadertoy.com) + [Book of Shaders](https://thebookofshaders.com) — raw fragment-shader vocabulary.

## Studios worth stalking

[Lusion](https://lusion.co) · Active Theory · [Immersive Garden](https://immersive-g.com) (Awwwards Agency of the Year 2025) · Locomotive · Basement Studio · Unseen · 14islands · Obys · OFF+BRAND (Lando Norris site, Site of the Year 2025) · [Utsubo](https://www.utsubo.com) (IVRESS, WebGPU/TSL pioneers)

## Habits

- Collect by **technique**, not by site: "that marquee bend" → a future sketch in `sketches/`.
- Steal one hard idea executed cleanly, not stacks of effects.
- Every visited site gets: one line here (✓ + date), findings in `research/NOTES.md`, shots in `research/shots/<site>/`.


