# Asset sources

Where we pull images, icons/SVG, illustrations, textures, and 3D assets.
Companion to `INSPIRATION.md` (where ideas come from; this is where *material* comes from).

**License ladder — prefer top, always record what we used:**
1. **CC0 / public domain** — use freely, no attribution. Default choice.
2. **Permissive with attribution** (CC-BY, some free tiers) — fine, credit in the sketch's meta/footer.
3. **Freemium marketplaces** — only when nothing above fits; check terms per asset. Avoid anything with "free for personal use only".

**Slop filter — every entry here must pass, and additions must too:**
- A named human or team behind it (Greg Zaal/Poly Haven, Kenney, Pablo Stanley, the fffuel guy) — not an anonymous SEO farm.
- Genuinely free at point of use: no attribution-farming, no login walls, no "free for personal use only" bait.
- Curated or authored, not scraped — and no AI-generated flood.
- Actually in working designers' toolchains (shows up in real projects and talks, not just in "27 Best Free…" listicles).

Known slop to route around when searching: Freepik/Flaticon (attribution farms, now heavy AI stock), Vecteezy, "free-png"-style sites, and most things Google surfaces for "free svg icons".
When in doubt, come back to this list instead of searching.

## Type — the identity carrier

Standing rule: no reflex Google Fonts, no Inter-by-default.
Every vibe/sketch picks its own face deliberately; the display face carries the personality, paired with one quiet workhorse (the two-font pattern every premium reference uses — see `research/POLES.md`).

- **Fontshare** (fontshare.com) — Indian Type Foundry's free catalog, 100 families, ITF Free Font License (free commercial, no signup). Real-foundry quality: General Sans, Clash Display/Grotesk, Cabinet Grotesk, Satoshi. **First stop.** Download from fontshare.com only — third-party mirrors mislabel the license.
- **Uncut.wtf** — Kasper Nordkvist's curated catalog of 160+ free-for-commercial contemporary typefaces from independent designers; skews display/experimental. Exactly the "unique fonts" brief. Note: 403s WebFetch — browse via Playwright.
- **Free Faces** (freefaces.gallery) — Simon Foster's hand-picked gallery of free typefaces with foundry credits; license varies per face, always check the linked source.
- **Velvetyne** (velvetyne.fr) — French libre foundry, SIL/open licenses; experimental and characterful (Pilowlava, Le Murmure, Trickster). For when a spoke needs a weird, opinionated voice.
- **Atipo Foundry** (atipofoundry.com) — pay-what-you-want families (one weight always free): Silka, Geomanist, Strawford, Chaney. The "almost free, fully professional" tier.
- **Pangram Pangram** (pangrampangram.com) — free tier is personal-use, and this is a personal project, so it's **fully in scope**: PP Neue Montreal, PP Editorial New, PP Right Grotesk… the Awwwards-scene house style (hildenkaira.fi runs on the first two). Revisit only if anything ever ships commercially.
- **Fonts In Use** (fontsinuse.com) — not a download source: the research archive for how faces behave in real identities and what they pair with. Check before committing a face.

Anti-slop: DaFont/1001fonts/font.download-tier sites are off the table (mislabeled licenses, broken files).
Google Fonts is allowed only as a deliberate pick for a specific reason (e.g. a variable-font axis experiment), never as the default.

**Delivery ruling (2026-07-27):** self-hosting woff2 in-repo remains the default (with license text at `site/public/fonts/licenses/`); **CDN delivery is allowed** when a face can't be reasonably persisted (e.g. a huge CJK variable family, or a license that forbids redistribution but allows linking).
CDN = the foundry's own or Google Fonts' css API with a pinned version URL; never a third-party mirror.
The pairing bar does not move: unique and elegant per world, two families max.

## Heavy media — delivery ruling (2026-07-30)

Fonts are self-hosted by default (see § Type).
**Video and audio are the opposite: never commit them.**
A video in git is in history permanently, Pages is not a video host, and the repo has already had to drop 41 MB of dead assets once.

Which delivery is allowed depends on what the media does:

- **Plain `<video>` or `<audio>` playback** — a remote URL is fine. Prefer a host with stable URLs; treat stock-site hotlinks as breakable, because they rotate paths and several forbid hotlinking outright.
- **Video as a WebGL texture** — the response MUST send `Access-Control-Allow-Origin` and the element MUST set `crossOrigin`, or the texture is silently unusable. Check before designing around an asset: `curl -sSI -H "Origin: https://design.renocrypt.com" <url> | grep -i access-control`. Verified 2026-07-30: `archive.org` sends `*`; a stock CDN we tested sent nothing.
- **Short UI sound** (a key click, a detent) — a few KB of audio is the rare case worth committing, since it must be instant and cannot depend on a third party staying up.

And the standing preference still wins: generate motion with a shader or canvas rather than sourcing footage.
Generated has no license, no CORS problem, no weight, and no dead link in a year.

## Photos

- **Unsplash** (unsplash.com) — still the default for elegant photography, but degrading at the edges: filter out paid "Unsplash+" results and watch for AI-generated uploads creeping in. Prefer named photographers.
- **Pexels** (pexels.com) — same class, includes video clips (nice for video-texture experiments). Same AI-creep caution.

### Public-domain archives — for anything historical

Stock photography is the wrong tool for a real object; museum scans are better, free, and CC0.

- **Smithsonian Open Access** (si.edu/openaccess) — ~4.5M CC0 items with an API, including instruments and machines photographed properly.
- **The Met Open Access** (metmuseum.org/art/collection) — CC0 for public-domain works, excellent photography, clean API.
- **Rijksmuseum** / **Library of Congress** / **NASA Image Library** — institutional, public domain, high resolution.
- **Rawpixel public domain** (rawpixel.com/public-domain) — curated and restored PD scans; good for period print texture. Free tier gates some downloads.
- **The Public Domain Review** (publicdomainreview.org) — editorially curated rather than exhaustive; the best place to *find* the odd thing.

## Video

Read § Heavy media first — none of these get committed.

- **Pexels Video** / **Coverr** / **Mixkit** — free, no-attribution clips; Coverr and Mixkit are the more designed end. Check CORS per asset if it will become a texture.
- **Internet Archive** (archive.org) — public-domain and period footage, and **verified to send `Access-Control-Allow-Origin: *`**, which makes it the one dependable source for cross-origin video textures.
- **Videvo** / **Mazwai** — mixed licenses, read per clip.

## Audio

Not decoration: on anything mechanical, a click or a detent does more for believability than another shader pass.

- **Freesound** (freesound.org) — the cornerstone. Named contributors, per-sound CC0 / CC-BY filtering, deep catalogue of switches, relays, typewriters and mechanisms.
- **BBC Sound Effects** (sound-effects.bbcrewind.co.uk) — 33,000+ clips, free for personal and educational use, which is exactly this project's tier. Superb archival recordings; re-check the licence before anything commercial.
- **Zapsplat** (zapsplat.com) — large and well-tagged, free tier requires attribution.
- Generated first where it fits: a filtered noise burst with a fast envelope is a convincing mechanical click and weighs nothing.

## Icons & SVG

**House rule (2026-07-26): we draw our own.**
Stock icon sets are the icon-shaped version of slop — Lucide/Feather strokes are the visual Inter-by-default, instantly generic.
Every icon/glyph in this project is hand-drawn SVG in the world's own identity, animated where it earns it (draw-on strokes, morphs, micro-loops via CSS/GSAP — we have the capability, so we use it).
Per-world glyph language follows that world's tokens: Noir gets 10px-mono-grade hairline glyphs, Chrome gets serif-weight flourishes, Monument gets 1px hairline geometry, Pulse gets chunky 800-weight rounded shapes.

Inspiration (study construction and character, never copy files): the hand-drawn interface glyphs on the sites we measured; broader references worth stealing *thinking* from — early Susan Kare grids, Otl Aicher pictograms, the animated-icon craft on 60fps.design.
Fallback for pure utility marks (only if drawing one is genuinely wasteful): Phosphor duotone or Radix, recolored and reweighted into the world's language — never default-stroke Lucide.
Brand/logo SVGs when needed: **Simple Icons** (simpleicons.org, CC0) — brand marks are facts, not design.

## Generated SVG (backgrounds, shapes, textures)

- **Haikei** (haikei.app) — blobs, waves, layered peaks, mesh-ish gradients; export SVG/PNG, free.
- **fffuel** (fffuel.co) — a whole family of generators: nnnoise (SVG noise/grain), ffflux (fluid gradients), sssurf, dddepth…; free, by one designer, very much our aesthetic.

## Illustrations & stickers

- **Open Peeps / Humaaans** (openpeeps.com, humaaans.com) — Pablo Stanley's mix-and-match people illustrations, CC0/free. First choice for people.
- **unDraw** (undraw.co) — flat illustrations, recolorable, open license. Honest caveat: instantly recognizable and near-cliché by now — fine for throwaway sketches, avoid in anything we'd show off.
- **LottieFiles** (lottiefiles.com) — animated stickers/micro-animations as Lottie JSON; free tier is generous. This is the "sticker" source that actually moves. Community section has slop — sort by staff picks.

## 3D — most relevant to us

- **Poly Haven** (polyhaven.com) — **the cornerstone. All CC0**: HDRIs (lighting/environment maps for Three.js — this is 80% of "why does their render look expensive"), PBR textures, and models. If we use one asset source all project, it's this.
- **ambientCG** (ambientcg.com) — CC0 PBR textures/materials, deeper catalog than Poly Haven for surfaces.
- **Kenney** (kenney.nl) — CC0 game-asset packs; stylized low-poly, great for playful scenes.
- **Quaternius** (quaternius.com) — CC0 low-poly model packs, more organic style than Kenney.
- **Sketchfab** (sketchfab.com) — filter by **Downloadable + CC license**; the biggest catalog of real-world scanned + artist models in glTF. (Its paid store moved to Epic's **Fab** marketplace — Fab is the paid tier.)
- **glTF Sample Models** (github.com/KhronosGroup/glTF-Sample-Assets) — canonical test models (DamagedHelmet etc.) for renderer/material sketches.
- **Matcaps** (github.com/nidorx/matcaps) — 600+ CC0 matcap textures; the cheap trick for expensive-looking materials without lighting setup.

## Per-world shortlist (researched + license-verified 2026-07-26)

Concrete picks for the build, verified via each source's own license page; UNVERIFIED means exactly that — recheck before shipping.

**01 Noir**
- HDRIs (Poly Haven, CC0): `moonless_golf` (near-black canonical), `dikhololo_night` (moonlit gradient), `satara_night_no_lamps` (pure starfield — best when red must own the frame).
- Grain/scratch overlays (ambientCG, CC0): `SurfaceImperfections014-016`, `Scratches003-005`; animated grain: procedural shader first, fffuel nnnoise second.
- Type: **Sometype Mono** (SIL OFL, Google Fonts — the reference's actual mono, genuinely free) + **General Sans** or stricter **Switzer** (both Fontshare ITF FFL) as the Suisse stand-in.
- Red visceral layer: Pexels "ink in water" videos (Pexels License: free commercial, self-host OK, not CC0) — or our own fluid shader per the stand-in rule.

**02 Chrome**
- Studio HDRIs (Poly Haven, CC0): `studio_small_09` (default expensive-chrome), `brown_photostudio_02` (warm greige reflections), `cyclorama_hard_light` (crisp specular edges).
- Matcaps: nidorx/matcaps repo has **no license / unknown provenance** — personal-lab acceptable only; cleaner path is MeshPhysicalMaterial (metalness 1, roughness ~0.05) + the CC0 HDRIs.
- Display serif: **Zodiak** (Fontshare FFL — strongest free Editorial-New-adjacent), **Instrument Serif** (OFL, single weight), Nyght Serif (Uncut.wtf, license text UNVERIFIED), PP Editorial New (free tier personal-only — fine here, not portable).
- Metallic blobs: no reputable CC0 pack exists — model them ourselves (noise-displaced primitives + chrome material), which is the stand-in rule anyway.

**03 Monument**
- Condensed monster faces: **Humane** (freeware, EULA text UNVERIFIED — closest to the Obys NG energy), **Anybody** (OFL variable with width axis — colossal AND hairline from one file), **Outward** (Velvetyne OFL, caps-only brutalist block), **Le Murmure** (Velvetyne OFL, elegant counterpoint), Big Shoulders Display (OFL fallback).
- Trap flagged: Tusker Grotesk is PAID despite SEO "free download" claims — avoid.

**04 Pulse**
- Variable font: **Outfit** (SIL OFL — the reference's own face, 100–900 axis; just use it); Switzer as divergence option.
- 3D: no CC0 medical/anatomy pack exists (Quaternius/Kenney searched) — build the journey from primitives (tubes, spheres, instanced cells); Quaternius Universal Base Characters (CC0) if a human silhouette is ever needed.
- Flat-vector layer: fffuel `ssshape` / `sssurf` / `bbblurry` / `ooorganize` (free commercial, verified); Haikei (free, formal license unpublished — UNVERIFIED).

**Hub**
- Press-to-start easter egg: **Kenney Toy Car Kit** (CC0 verified, 100 glTF files) — literal toy-box, matches the palette's energy; Poly Haven `chess_set` etc. as photoreal alternates.

License notes: Poly Haven / ambientCG / Kenney / Quaternius all CC0 (each verified at source); Fontshare FFL kits ship self-hostable WOFF2 (re-read the FFL before any commercial reuse); Pexels license is permissive but not CC0.

## Rules for this repo

- Every sketch that uses external assets lists them (source + license) in its folder — a one-line `ASSETS` note is enough.
- Prefer generating over downloading when feasible (SVG noise, gradients, procedural geometry) — generated assets have no license and match the "elegantly implemented" bar.
- Keep downloaded assets small and local to the sketch that uses them; no shared dumping-ground folder.


