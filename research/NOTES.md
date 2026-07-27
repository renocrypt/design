# Design research notes

Screenshots live in `shots/<site>/<date>-<what>.png`, one folder per site, date-prefixed so shots of the same page on different days sort together.
`shots/_smoke/` holds environment-verification captures, not inspiration.

## posts.design — 2026-07-26

Curated wall of social post design (292 posts) from Linear, Tesla, Coca-Cola, Archer, Kimi, etc.
Card-scale graphic language rather than full sites.
Shots: `shots/posts.design/`

Observations worth stealing:

- **Dark-first canvases** — near-black + one luminous element dominates the premium look (light trails, Linear cards, "Built for Android").
- **Type-as-image / kinetic type** — Coca-Cola weaving logos inline into editorial text; "Trading_ / Robots / LLM / Rockets" card is pure typography with opacity hierarchy.
- **Liquid glass** ×2 independent posts (Aave clock, Mikk Martin) — refraction/glassmorphism is current; good WebGL sketch candidate.
- **Dither/grain revival** — "Dither Motion" post, grainy b/w collages.
- **Warm-neutral stat design** — Scout card: huge numerals on cream paper.
- **The gallery shell itself** — 3-col masonry, calm sidebar, "N online" presence dot; reference for our own sketch gallery.

## recent.design — 2026-07-26

Daily-curated, multi-category inspiration feed ("last updated 9h ago", 38 online).
Categories: Web / Interface / Branding / Product / Typography / Motion / Illustration / 3D / Editorial / Print / Packaging, plus separate sub-galleries: Websites, OG Images, App Screenshots, App Icons, Tools, Skills.
Sources are X and Instagram posts, credited and linked.
Shots: `shots/recent.design/`

Observations:

- **Same shell pattern as posts.design**: masonry grid + calm left sidebar + "N online" presence + newsletter modal (annoying: opens on load; Escape dismisses it — remember for future visits).
- **Category filters are exactly our sketch taxonomy** — the Motion and 3D tabs are pre-filtered idea feeds for the sketchbook.
- Current wall echoes posts.design trends: liquid glass (terminal, button, clock ×3 items!), jelly/soft-body UI (jelly switch, jelly slider, inflatable button), WebGL heightfield cards, glassy tunnel forms, plus a strong print/riso revival current (stamps, flyers, posters).
- **Item pages** (`/i/<id>-<slug>`) each have their own like counts and link to the original post — same jump-off-directory structure as posts.design.
- Gotcha: site 403s WebFetch/curl (bot protection) — Playwright required.

## lamalama.com — 2026-07-26

Amsterdam agency, heavy Awwwards pedigree (15× Developer Award); user-picked reference for boldness + motion craft.
Vibe study only — their content/copy is irrelevant to us.
Shots: `shots/lamalama.com/` (note: site is a full WebGL canvas pipeline that mostly dies under SwiftShader, so viewport shots are sparse; the og-share-image jpg carries the art direction better).

Vibe observations:

- **Palette is two colors, total commitment**: near-black warm charcoal `rgb(26,28,28)` canvas + bone/cream `rgb(249,244,235)` text, with one signature accent — a visceral macro-photo *red* (ink-in-water texture) used as image material, not as UI color. Palette-from-a-material, exactly the approach we want.
- **Two-font system**: SuisseBPIntl (grotesk, 4 weights) for statements + Sometype (mono) for labels/nav. The mono does the editorial `[ bracketed label ]` voice; the grotesk does ALL-CAPS damage.
- **Voice as design**: rotating header strings ("LET'S DO DAMAGE", "SLIDE INTO OUR INBOX") — the copy itself is a motion element. Tone is a design layer, swap-in-able.
- **Structure**: virtual scroll (wheel hijack, scrollY stays 0), WebGL compositing of the whole page (3 canvases), 0→100% preloader, duplicated text nodes for roll-over reveals, section timeline at page bottom.
- **Peripheral UI as furniture**: sticky corner cards (GET IN TOUCH with webcam-style thumbnail, THIS IS US `( + )` expanders) — the chrome around the canvas is part of the composition.
- Cost note: this class of site (full-canvas WebGL + virtual scroll) is *unscreenshotable* in our env; study via og-image, DOM probes, and their Awwwards case pages instead.

## units.gr — 2026-07-26

Greek student-housing brand, design by Big Horror, code by Lemonjelly; user-picked reference for the *entrance page* shape.
Vibe study only — student-housing content gets re-tailored to "hub that sells a universe, then hands off to destinations".
Shots: `shots/units.gr/`

Vibe observations:

- **Warm paper canvas, saturated block accents**: cream `rgb(244,233,225)` ground; sidebar nav is a stack of solid-color rounded cards (cobalt blue, amber, orange, green, violet) — numbered 01–04 with arrow glyphs. Feels like colored index tabs; instantly readable hub navigation. *This is a hub-nav pattern to steal.*
- **Two-font system again**: Bunch (chunky, warm display face — all the personality) + Aeonik Pro (neutral grotesk body). Confirms the pattern: one characterful display + one quiet workhorse is enough.
- **Marquee tickers as section dividers** — colored strips with icon-separated items; cheap, joyful rhythm between sections.
- **Card grammar**: everything is a rounded-corner block — photos, feature lists (with hairline-underlined rows), map, Instagram wall. One radius everywhere = cohesion.
- **A "Press to Start" interactive canvas** embedded mid-page (1 WebGL canvas) — playful easter-egg energy inside an otherwise flat, print-like page.
- **Entrance-page anatomy worth copying**: hero statement → numbered destination cards (the spokes) → alternating tone sections → values triptych → handoff links. Long-scroll, GSAP-animated, but the identity carries it, not the tech.
- Together with lamalama: two opposite poles (dark cinematic WebGL vs. warm flat print-joy) that are *both* premium — proof the hub and each spoke can differ radically in vibe as long as commitment is total.

## lamalama.com — measured anatomy — 2026-07-26 (agent probe, viewport 1280×720)

Full DOM/CSSOM measurement + static analysis of the theme bundle; feeds World 01 Noir directly.

Typography (global tracking −0.02em on every role — one knob):

- Statement H1: SuisseBPIntl 700, uppercase, **lh 0.80**, ~5.2vw via `clamp(2.5rem, 0.9375rem + 3.13vw, 3.75rem)`.
- Display: same voice, ~5.7vw, up to 7.69rem at wide.
- Statement H2: weight 400, lh 0.90, no uppercase, ~3.4vw — the quiet counter-voice.
- Mono label (`ll-add-tag`): Sometype Mono **10px fixed at every breakpoint**, w500, uppercase, lh 1.8 — nav, tags, timeline, footer all share this one role.
- Body: ~1.5vw clamp, w400, lh 1.2.

Color (census over 3007 elements): charcoal `rgb(26,28,28)` canvas + bone `rgb(249,244,235)` ink dominate utterly; layering is done by alpha, not new colors — bone/white at 10% for idle chips, black at 40–60% + backdrop-blur for floating panels. Declared-but-dormant accents in `:root`; red `rgb(231,93,96)` appears 5× as signal only.

Chrome geometry: border-radius **4px everywhere** (never larger); floating UI inset 16px from viewport edges; top pill 438×50 (black 60% + blur); side cards 160px wide; timeline chips 168×50, idle white-10%+blur(24px), active solid bone/black text.

Layout: 12-col grid, 40px page margin, 24px gutter, **no max-width**; rhythm entirely from vw-proportional padding tokens (60→320px, `max(Npx, N/1440·100vw)`), zero margins between sections; page = 8.1 viewports of Lenis virtual scroll.

Motion: **zero CSS hover transitions — all JS** (GSAP + Lenis). Vocabulary: duplicated-text roll-over (53 parents with 2× identical children, translate swap) + word-split masked line-rise (`clip-path` inset + translateY 100%). Ease census: power4.out ×62, expo.out ×58. Duration census: **0.65s is the workhorse**, range 0.35–0.65s.

Build cues distilled: two colors + alpha layering; 4px radius; 10px mono label system with `[ brackets ]`; lh 0.8 uppercase statements at ~5vw; power4/expo eases; left-rail chip timeline as wayfinding.

## hildenkaira.fi — 2026-07-26

Helsinki social-content agency; user-picked reference for World 02.
Note: 403s/drops WebFetch — Playwright required.
Shots: `shots/hildenkaira.fi/`

Vibe observations:

- **Warm-stone editorial**: greige canvas `rgb(234,233,230)`, near-black ink `rgb(24,24,24)`; lots of air, print-magazine calm.
- **Serif display + grotesk UI**: PP Editorial New (sharp elegant serif, magazine-masthead energy) for headlines, PP Neue Montreal for everything else. Both Pangram Pangram — free tier covers personal use, so this exact pair is legitimately available to us.
- **Liquid-chrome collage layer**: full-viewport mirror-metal masthead with molten ampersand + metallic 3D emoji stickers (heart, fire, wink, pigeon) floating through sections; polaroid-style photos scattered at slight rotations.
- **Honest 3D note**: zero runtime WebGL/canvas/Three.js — all chrome is pre-rendered AVIF/video baked offline, animated 2D with GSAP in Webflow. Reads 3D, isn't. Our twist for World 02: do the chrome *live* in Three.js (env-map/HDRI) since 3D is our focus.
- **Accent trio**: vermilion `rgb(255,76,36)`, pale pistachio `rgb(236,253,173)`, jade `rgb(63,174,134)` — sparse, mostly on buttons/cards.
- **Dark flip mid-page**: services section inverts to near-black with jade cards, serif intact — the palette has a built-in night mode per section.
- Vibe words: **editorial · chrome · warm-stone calm · sticker-collage · confident-cocky · serif-meets-liquid-metal.**

## hildenkaira.fi — measured anatomy — 2026-07-26 (agent probe, viewport 1280×633)

Masthead: 12 individual AVIF letter sprites in one full-width strip, 17.4vw tall, flush to the viewport top; letters 58–192px wide at 1280.
Type rule: serif (PP Editorial New) owns EVERY heading and the numerals — always weight 400, lh 0.9, tracking −2%, vw-fluid (5.82 / 4.36 / 4.0 / 3.27 / 2.9vw); grotesk (PP Neue Montreal) owns everything ≤14px at weight 500, lh 1.3.
Photos: 7 hero collage shots ~12vw wide, portrait 0.80, rotations within ±4.5°, NO border/shadow/radius — rotation alone does the polaroid cue; exactly one special pair (founders) gets a 2px pistachio border and ±5°.
Buttons: 28px tall, radius **0** (sharp, not pills); pistachio or ink fills; 14×14 ink arrow-square inside; hover = jade layer sliding in.
The one ease: **0.525s cubic-bezier(0.625, 0.05, 0, 1)** on transform — 92 of 96 transition elements share it.
Sections: strict 100vh slabs with ZERO vertical gaps; light/dark flips are per-section `theme-*` bg swaps (ink #181818, footer #2b2b2b) while body stays greige; services = sticky 100vh stage over a 2.5-viewport runway, 3 stacked 39vw×43vh cards (jade/white/pistachio) entering from translateY 160 / translateZ −160.
Color: greige+ink+white carry ~85% of surfaces; pistachio does the real accent work (27 uses), jade 17, vermilion has ONE genuine UI use — a scalpel, not a brush.
Idle float: rotation ~±1°/s inside a ±5–12° band + ±5% scale breathing; translation lives on a parent layer.

## experiment.obys.agency — 2026-07-26

Obys' experiment archive ("Since 2018… …Never Finished"); user-picked reference for World 03.
Shots: `shots/experiment.obys.agency/`

Vibe observations:

- **Gallery-white void**: pure white canvas, near-black `rgb(51,51,51)` type, nothing else — anti-decoration as a stance.
- **Type as monument**: one custom in-house face ("Obys NG") set colossal in condensed caps — OBYS / EXPERIMENT / SPACE stacked across the full viewport, with hairline rules slicing straight through the letterforms.
- **Utilitarian periphery**: tiny nav ("Space, About"), live CEST clock, a **White / Pride** theme toggle — wry, self-aware museum labeling.
- **Real runtime 3D**: loads three@0.170 (esm.sh) for the floating experiment gallery. Env caveat: its WebGL context refuses to create under SwiftShader, so we've verified the typographic shell only — the 3D archive needs a real GPU to view.
- Vibe words: **gallery-white · Swiss-brutalist · type-as-monument · anti-decoration · wry.**

## experiment.obys.agency — static anatomy — 2026-07-26 (agent, curl/python)

Webflow shell wrapping an inline hand-written GSAP + Three.js (0.170 via esm.sh) build; desktop-only — viewports ≤1199px get a hard mobile-blocker, zero fluid type.

- **Type scale is brutally binary**: display 94px / lh 0.9 / ls −0.055em / uppercase / single face single weight (OTF Obys NG 400); utility 13px / ls −0.01em everywhere else (nav, clock, archive, footer); dim tier = 13px at 20% black. Declared escalations exist (110px lh 0, 180px) but unused.
- **Colors**: white + pure black + `#0003` (20% black) for EVERY hairline. Nothing else.
- **Hairline grammar**: 1px `#0003` lines slice BETWEEN display lines; the 94px type pulls up into them with `margin-top: −7px`; reveals via `clip-path: inset(0 100% 0 0) → inset(0)` 0.5s power2.out.
- **One inset**: 10px page margin, 10px grid gap, 12 equal columns; all fixed corner UI at 10px insets; captions at top: 226px.
- **Ease vocabulary**: enter expo.out 0.8–1.2s (staggers 0.02 char / 0.08 line / 0.12 block); exit power2.in 0.4s; structural wipes power4.inOut 0.75–0.9s; CSS micro-motion `cubic-bezier(0.16,1,0.3,1)` (the CSS twin of expo.out).
- **Continuous motion = per-frame lerp, not tweens**: 0.05 planes/camera, 0.1 scroll inertia, 0.15 cursor; wheel → virtual scroll `Δ·0.002`.
- **Gallery recipe (full)**: 32 unit planes re-geometried to `2·aspect × 2` on texture load; one ShaderMaterial (grayscale by luminance, whitewash mix 0.4, distance-fog-to-white, wireframe mode); formations = Fibonacci sphere (r 6.5) / jittered ring / golden-angle flower / cylinder, crossfaded by lerp/slerp; scroll morphs formation → x-strip at spacing 4; fov 45, cam z 10, depthWrite:false with opacity fade instead of sorting.
- **Preloader**: black top/bottom curtains + centered 1px line at 52.5%, 13px counter, curtains part expo.inOut 1.2s.
- **Pride toggle**: not a palette swap — fixed z−1 backdrop layer (blurred 2D-canvas color blobs) + two shader uniforms flip (grayscale/whitewash off). Ink and hairlines never change.

## blood-donation.com — 2026-07-26

Interactive 3D guide to the blood-donation process; user-picked reference for World 04.
Renders fully in our env. Shots: `shots/blood-donation.com/`

Vibe observations:

- **Single-hue poster commitment**: saturated red `rgb(229,38,44)` IS the canvas; type in white + pale pink `rgb(249,207,209)`; deep plum `rgb(61,60,71)` as the secondary ground. Nothing outside this family.
- **One variable font doing everything**: Outfit 300–800 — hierarchy built entirely from weight + the white/pink two-tone stack ("WHAT HAPPENS / WHEN YOU / GIVE BLOOD?"). Proof that one well-used variable font can carry a whole identity.
- **Flat-vector charm on top of real 3D**: hanging blood-bag illustration, rotating circular badge, pill CTA — friendly-institutional, almost toy-like.
- **Technically the most modern of the five**: Three.js with the **WebGPU renderer** (falls back to WebGL) driving a guided scrollytelling journey. The structure — intro poster → "GET STARTED" → staged 3D walk-through — is the guided-journey pattern.
- Vibe words: **poster-flat · saturated single-hue · friendly-institutional · guided journey · pop.**

## units.gr — measured anatomy — 2026-07-26 (revisit)

First hub attempt failed the vibe check ("basic look and fundamentals NOT aligned") because we built from remembered keywords instead of measured structure.
Playwright DOM measurements of the real page, for the record:

- **Rail**: fixed, only **142px wide**; nav chips 122×100px, radius **10px**, colors cobalt `rgb(0,114,227)` / amber `rgb(255,178,0)` / orange `rgb(255,97,0)` / green `rgb(0,170,60)` / violet `rgb(171,84,247)`; **black text on color, sentence case, 16px** — small labels, not display type.
- **Hero**: ONE giant rounded photo card (1093×670, radius **~33px**) filling the first viewport; display text sits ON the media in cream/white — the only white text on the page.
- **Display face**: Bunch at weight **850**, hero 64px with line-height 64px (1.0); section h2s dark on paper elsewhere.
- **Marquee band**: full-width strip, radius ~33px, **red ground `rgb(234,55,55)` with amber Bunch-850 items at 14px** — colored-on-colored, not hairline-on-paper.
- **Bento cards**: ~360×267, radius ~33px, solid fills (e.g. Security card orange `rgb(255,142,10)`), black text, list rows with hairline underlines.
- **Tags**: pill radius 100px, hairline border, 14px, on paper.
- **Two radius scales**: big cards ~33px, nav chips 10px, pills 999px. Paper `rgb(244,233,225)` stays uncolored; saturation lives only in cards/chips/bands.

Hub v2 rebuilt against these numbers (see `shots/_site/2026-07-26-hub-v2*.png`); lesson recorded: measure before building, keywords are not anatomy.

## Our own build — hub v1 — 2026-07-26

Shots: `shots/_site/` (hub desktop + mobile, type specimen).
Hub palette "Cotton & Ink": paper `#f5efe6`, ink `#1b1813`, gate colors borrowed from each world's probed pole.
Hub faces: Clash Display (display default) + General Sans (text), Cabinet Grotesk as challenger — all live on `/type` specimen for the casting call.
Motion note learned the hard way: GSAP owns element transforms exclusively; a CSS `transition: transform` on the same element strands `gsap.from()` entrances mid-flight (gates froze half-slid until the hover transition was moved into GSAP).

## blood-donation.com — static anatomy — 2026-07-26 (agent, curl/python)

Big correction to our earlier assumption: **not scroll-driven at all** — a click-through **XState state machine** (React 19 + react-three/fiber + Three r184 WebGPU/TSL + framer-motion; no GSAP/lenis anywhere). By Steve Meredith.

- **Type**: Outfit variable (300–800, one 32KB woff2). Poster h1 96px (exit 144px) / weight 800 / lh 0.9 / ls −4 to −6px / uppercase. Weight map: 300 body · 600 eyebrows (+3.5px tracking) · 700 buttons (+1.4px) · 800 titles. 400/500 never used. Two-tone = per-line spans, pink lines get `color: #fdd2d2` — no gradients. All px, zero clamp/vw; two breakpoints (800/960) do everything.
- **Color tokens**: red `#e5262c` (SVGs use `#E5272C` — two reds coexist), pink text `#fdd2d2`, bag-gradient pink `#f9cfd1`, plum body `#3d3c47`, darkest `#302c35`, success green `#00b870`; WebGL clearColor `0x4b4a53` blends canvas into the plum ground.
- **Roundel badge**: 149px fixed top-right; circular text is pre-outlined paths (no textPath); rotation = CSS `rotate 360°/8s linear infinite`.
- **Pill CTA**: h 54/64px, radius 44px, pad 0 32px; hover scales a `::before` fill layer to 1.05 in 200ms — never the button itself.
- **Blood bag**: SVG gradient with two stops at 46.15/46.17% — a hard cut = fill level. Curtain reveal: full-screen red slides y 0→140% over 2s linear while a 512×128 wave strip loops 1s.
- **Motion**: framer — 1.4s easeInOut screen fades, 2s linear curtain, backOut `(.34,1.56,.64,1)` pops, anticipation bezier `(.36,0,.66,−1.2)` exits; delays quantized to 300ms.
- **3D**: all glTF (map 1.06MB draco + character with wave/walk/idle/sit/drink clips + NPCs); baked lightmap+AO webp, forest.exr env, ONE directional shadow light; follow cam fov 40 at +(0,8,8), lerp `1−0.96^(60·dt)`; walk 3 u/s.
- **Journey grammar**: `walk → cameraEnter → dialog → cameraExit` × 6 stations (Reception → Waiting → Screening → Donation → Refreshments → end "GIVE BLOOD"); WebGPU with WebGL2 fallback, Safari forced to WebGL, frameloop paused on tab hide.

## Our own build — World 01 Noir v1 — 2026-07-26

Shot: `shots/_site/2026-07-26-noir-v1.png`.
Built to the measured lamalama anatomy: their exact clamp() for the statement (700/uppercase/lh 0.8/−0.02em), 10px Sometype Mono chips with `[ brackets ]` at 16px insets on black-60%+blur / bone-10%, 4px radius, roll-over back-link (two stacked copies, expo.out 0.45s), word-split masked line-rise entrance (0.65s workhorse).
Fonts: Sometype Mono variable (16KB, OFL — the reference's own mono) + General Sans, both self-hosted.
Scene: "night drive" — instanced lane dashes + lamp posts recycling through fog, one oncoming car as two additive glow sprites (canvas-drawn, zero downloads), low bone moon + grazing fill for road sheen; camera-only sway + pointer parallax.
Performance: instancing only, no shadows, dpr capped 1.75, paused on tab hide, SwiftShader → single composed still frame at dpr 1, context-lost handler hides the canvas (white-flash guard) and repaints on restore.
Env note: SwiftShader kills the context under memory pressure mid-session — fresh tab renders correctly (verified); real GPUs unaffected.

## Our own build — hub hero v3 "toy racetrack diorama" — 2026-07-26

User verdict on the primitive-toys hero: kindergarten-level — real objects required.
Fix: **Kenney Toy Car Kit (CC0)** installed to `site/public/models/` (license alongside): 3 vehicles + track loop pieces + finish gate + props, 428KB total, plus the shared `Textures/colormap.png` the GLBs reference (first load 404'd it — the kit keeps textures external to the GLBs).
Scene: closed track loop on a round rug, speedster lapping via CatmullRom curve (~22s/lap, toy speed), spinning gold coin, two parked cars, cones; warm desk-lamp key + hemisphere bounce, ACES, camera-only drift/parallax.
Perf: 1024 shadow map (off on software renderers), dpr ≤1.75, IntersectionObserver pause, context-lost white-flash guard, CSS warm-room fallback when WebGL is unavailable.
Env limitation (honest): this machine's software WebGL is deprecated-flagged Chrome-side and exhausts contexts — probes now mostly get the CSS fallback; DOM/build/model-fetch all verified, the moving diorama needs a real-GPU browser (LAN URL).

## Our own build — hub hero jury round (v4) — 2026-07-26

Three-lens adversarial critique (art-director / engineer / type-on-image workflow) of the diorama plan; full reports in the workflow journal. Consensus fixes applied to `site/src/hub/scene.ts` + `hub.css`:

- Camera to true toy-eye y 0.9, pitched up — horizon at ~58%, type floats on the fogged wall, diorama owns the bottom band; fov derived from HORIZONTAL 44° so portrait never crops.
- Track math socket-walked from measured GLBs (2 straights + 4 corner arcs r=4, perimeter ≈ 33u); cars ride the derived centreline at track-top 0.3 — no more eyeballed placement; the vertical-ramp GLB deleted (it was never a flat piece).
- Believability adds: wheel spin via named wheel nodes, curvature-derived roll (clamped 0.12, low-passed), 9Hz suspension bob, TWO cars offset half a lap, contact-shadow blobs, coin pivot recentred (was orbiting, not spinning).
- Materials: PMREM RoomEnvironment at 0.3 (kit stops being clay), gold coins metalness 0.85, ONE shared kit material (draw-call diet), kit whites capped to #f0e6d2 — luminance supremacy: nothing outrenders the headline.
- Light ratio fixed 1:2.4 → 4:1 (hemi 0.3 vs physical spot 320cd, penumbra 0.5, decay 2, normalBias 0.02, shadow near/far 4/14); 60 dust motes in the beam.
- Floor: procedural wide-plank oak (1024px canvas albedo+roughness, 1.5u planks, ±7% L variance, staggered joints, knots, mottling, anisotropy 8), planks run along the view axis — seams converge behind the title.
- Finish stack: canvas → warm multiply scrim (radial at 50% 46%, core 42%) → copy (optical centre ~45%, on-image tracking −0.006em, descender-safe reveal masks, sub-only text-shadow) → vignette + animated 3-step film grain (normal blend — overlay would kill the compositor fast path).
- Fallback room redesigned to the jury spec (lamp wall-glow, floor pool, fog band, floor line 62%, plank seams; no drawn objects) — verified on this machine: with SwiftShader dead, the poster still reads art-directed, not broken.
- preserveDrawingBuffer dropped (mobile cost); canvas fades in only when the diorama is complete (pop-in kill); grain/vignette shared over live scene and fallback.

## Our own build — SUNDIAL hero (v5) + day/night — 2026-07-27

After four rejected literal-3D concepts, ran a 4-concept × 3-judge × synthesis workflow; winner **Sundial** (25.5/30 — the only concept all judges scored ≥8): a Girard-style painted-wood relief poster — five oversized brand shapes (amber sun 82,16 / cobalt bar / vermilion arch / violet ring / red peg = hub + worlds 01–04) on a deep cobalt wall, one real traveling key light, VSM soft shadows, Neutral tone mapping (ACES hue-shifts amber/vermilion), engraved numeral decals, paint-tooth bump + mottle + baked dither.
Key insight the jury surfaced: none of our five reference sites puts a literal miniature 3D scene under hero type — graphic relief plays to real-time's strengths instead of imitating photography.
**Day/night is the concept**: 1.6s solstice sweep — key light physically crosses the wall (all shadows rotate), eclipse disc carves the sun into a crescent, 4 stars ignite in world order, page chrome flips at the sweep midpoint (`html[data-theme]`, 800ms). First paint = scheme-correct with zero animation; explicit choice persists to localStorage; OS scheme changes animate live. Metronome: one element beats every 12s (bar slide → arch breathe → ring quarter-turn → peg roll, stamps rotating with their shapes); 19s key-breathing desynced from the 12s beat; night micro-event = a star dims 25% every 20–40s.
Shipping hygiene: 13 draw calls, shadowMap.autoUpdate=false (flagged only during beats/sweep/parallax), IntersectionObserver + hidden-tab pause, still-frame path for software renderers, CSS fallback = the same poster as positioned divs with directional box-shadows whose theme transition is a mini-solstice (verified live: shadows swing, sun→crescent, knob slides — shots `2026-07-27-sundial-{day,night}-fallback.png`), WebGL day state verified via one-shot headless render (`2026-07-27-sundial-day-webgl.png`).

## Browser workflow notes

- Pause all `<video>` elements (JS one-liner) before screenshots on autoplay-heavy sites — software renderer stalls otherwise.
- Screenshots also wait for `document.fonts`; give heavy sites a beat.



## units.gr re-study (fresh eyes, desktop + mobile) — 2026-07-27

User re-pointed us at the pole: "absolutely gorgeous — much more beautiful" than our hub; the vibe gap was real.
Full-page pass at 1440×900 (shots `2026-07-27-restudy-*.png`) plus a 390×844 mobile pass (`2026-07-27-theirs-mobile.png`).

Measured this round: rail doors 122×144px r=10 (cobalt 0,114,227 / amber 255,178,0 / orange 255,97,0 / green 0,170,60 — taller than wide, the "door" proportion our 100px chips missed); hero media card r≈37.5px; hero display Bunch 850 @72px lh 1.0 white-on-photo; sub Aeonik 700 @24px; CTA black pill 182×48 r=pill @15px.
Section grammar (the part our page was starving for): asymmetric manifesto card ("Locations": amber card ~1/3 width, tag top, statement mid-low, pill chips, cream air beside); red marquee band with amber items + drawn bolt/diamond glyphs; "living" row = flat-vector illustration card (monstera) + photo card + hairline-list card; "what we stand for" = cobalt cards with PIXEL-ART-ON-GRAPH-GRID icons (green smiley / red / yellow heart) + centered copy; full-width black pill bar; footer = newsletter pills + graph-paper grid with scattered pixel blocks + giant black logotype + hairline pill links.
**Mobile grammar (decisive)**: rail collapses to logo + pill CTA + black hamburger — never a horizontal chip strip; hero card follows immediately, display type stays huge, black pill CTA bottom-center. Our old mobile (chip strip + full-width amber banner) read "generic corpo landing" — user called it, reference confirms.
Preloader: theirs plays animated items before entry (user: charming but too long; ours must be the short, dynamic cut).

## Our own build — hub v3 uplift (units.gr grammar, our content) — 2026-07-27

Rebuilt below-hero with the pole's section grammar, all media drawn in-repo (zero stock):
- Rail doors flex-fill the column (≈122×144 proportion); gates now rendered from the new lane registry (`site/src/worlds/registry.ts` — single source of truth; vite inputs + rail + menu generate from it; add-a-lane checklist in CONCEPT.md).
- Manifesto: cobalt card, tag top, statement/text/chips bottom-anchored, cream air right (Locations grammar).
- Marquee band: drawn bolt/diamond clip-path glyphs between items.
- Rooms: four gate cards each carry a PIXEL-ON-GRAPH-GRID glyph (crescent/droplet/monolith/heart as ASCII-art bitmaps stamped by main.ts, ink pixels, grid lines over) — the stand-for move.
- Bench row: flat-vector "toy shelf" illustration (the five sundial shapes off-duty, amber card), cream house-rules card with drawn 22px line icons, cobalt card with big amber pixel sun.
- Full-width black CTA bar ("First door — 01 Noir ↗"); footer = graph paper + 6 scattered pixel blocks + giant "worlds." logotype + hairline pills.
- Hero: CTA → crisp black pill; CSS fallback gained the missing three shapes (bar/ring/peg as divs) + drift loops, so the software-renderer path shows the full composition.
- Motion presence (user: "nothing was moving"): metronome 12s→7s with first beat at 2.2s; key light now drifts a ±~7° arc (28s+43s sines) so shadows visibly crawl — the sundial doing its job; camera idle sway (lissajous 23s/31s) after 4s pointer-silence (the touch answer — no gyro needed); eclipse crescent slowly orbits at night.
- Preloader: five toy shapes stamp (back.out, 80ms stagger) + mark rise + 0.6s power3 wipe, ~1.6s total, sessionStorage-skipped on repeat, reduced-motion skips, CSS auto-hide covers no-JS.
- Mobile: rail → logo + black burger (drawn glyph, X crossfade); full-screen toy-box menu (registry doors staggered); rooms/bench stack with media intact.

## Workflow — world specs authored + critiqued (wf_3743a7f3) — 2026-07-27

Four build specs (01 Noir / 02 Chrome / 03 Monument / 04 Pulse) authored in parallel from the measured anatomies, then adversarially critiqued and cross-judged (9 agents; first run's critic phase died on an org auth error — salvaged author specs from journal.jsonl, resumed cleanly next model).
Final artifacts: `docs/specs/{01-noir,02-chrome,03-monument,04-pulse}.json` (critic-amended) + `docs/specs/_verdict.md` (distinctiveness PASS with 4 guardrail amendments: 01 S4 = evidence locker not type exhibit; 02 assay plates stay physical paperwork (≤64px engraved numerals, process captions) + S4 is the foundry/type-ladder register; 03 poster numerals must bleed off-canvas, zero collage treatment; 04 unchanged).
Font fetches done: Zodiak Variable + Italic + Switzer Variable (Fontshare zips), League Gothic latin woff2 (GF API) + OFL; Zodiak-Bold.otf staged at `src/worlds/02-chrome/font-src/` for the facetype.js extrusion derivative.

## Our own build — WORLD 02 CHROME shipped (v1) — 2026-07-27

Built to the critic-amended spec (`docs/specs/02-chrome.json`): five slabs (masthead pour / assay wall / foundry flip / scale ladder / footer vault), both day+night with lab-wide 'hub-theme' continuity.
- **Typeface derivative**: tools/ttf-to-typeface.mjs (opentype.js, y-flip — opentype y-down vs typeface.json y-up) → `public/type/zodiak-bold-chrme.typeface.json` (5 glyphs, 5KB); verified in node with three FontLoader+TextGeometry (cap height 700/1000, advances sane).
- **Masthead (centerpiece)**: 5 extruded Zodiak-700 letters, metric layout via bbox advances, MarchingCubes molten O (5 ring charges + 1 fixed negative carving the counter, seed 0x5EED02), shared metalness-1 material lit ONLY by studio_small_08 PMREM (zero lamps), 6 draw calls, fov 12° telephoto; O outer diameter normalized to cap height by measuring the polygonized bbox once at init (charge-ring radius alone undershoots); camera z = max(glyphH 0.84/62%, span×1.04/aspect) so neither caps nor word ever crops. Splash via invisible torus hit-proxy, agitation by pointer velocity, entrance pour + idle float grammar.
- **Assay plates**: 7 seeded canvases (mulberry32 0xA55A+i) — banded ramp with hard #232322 horizon, ±3px stop jitter, paper tooth, ordered dither, engraved 64px numerals, diegetic captions; 03/04 pistachio-bordered day/night pair; parent-layer parallax only (measured law).
- Honest env note: this machine's WebGL paths (MCP chrome + one-shot SwiftShader) both fail context creation, so the LIVE masthead could not be visually verified here — rung-3 CSS fallback verified in BOTH themes (reads as genuine chrome on ink at night); all geometry/camera math verified in node. Live pour needs the phone (real GPU).
- S3 counter-slab + sticky 250vh runway fan (jade/white/pistachio cards, translateY/Z 160 scrub), S4 vw-ladder specimen + live ease exhibit, S5 vault with the single vermilion scalpel. Mobile: statement floor 6vw (lh-0.9 mush at 13px), fallback word 11vw, plates 2-col grid, fan 78vw cards.
- Zodiak + Switzer (Fontshare FFL zips) self-hosted; HDRI CC0 already on disk.

## Our own build — WORLD 03 MONUMENT shipped (v1) — 2026-07-27

Built to the critic-amended spec (`docs/specs/03-monument.json`): WHITE/NIGHT blackout toggle, preloader with honest counter, 180px monument once, Formation Gallery recipe, Index with VIEW jumps, Colophon, Gift Shop <1200px.
- **Poster generator**: 32 seeded 512×724 canvases (mulberry32 20260300+i), five palettes = the whole lab (NOIR/CHROME/MONUMENT/PULSE/HUB hexes traceable to tokens+measured poles); 620px League Gothic numerals bleed off-canvas per the judge guardrail (crop, never shrink-to-fit; no rotation/border/shadow/tooth); same recipe feeds WebGL planes + rung-2 DOM strip + Gift Shop postcard (one recipe, three outputs).
- **Virtual scroll**: hand-rolled v∈[0,10] (hero 1 + hall 6 + index 2 + colophon 1 — the index needs 2 viewports at 34px rows), wheel Δ·0.002, lerp 0.1, keyboard + touch deltas, strip translateY(−v·100dvh); canvas opacity 1−smoothstep(6.8,7.2,v); VIEW click → v_target = 6.5+(k−15.5)/31, the lerp IS the transition.
- **Gallery (unlit shader)**: 32 planes 1.414×2, one program cloned per plane (uMap/uColor/uWash/uFog/uDist/uOpacity), luminance grayscale + 0.4 wash + fog 7→14 (OURS derivation, honestly marked); five formations precomputed into Float32Arrays (Fibonacci r6.5 / jittered ring mulberry32(9001) / Vogel flower 137.50776° / cylinder two turns / strip spacing 4), position lerp 0.05 + quaternion slerp 0.05, idle yaw 0.02 rad/s, far-hemisphere uOpacity fade 0.3 (anti-sort-error policy), hover color reveal 0.15 in / 0.05 out, zero per-frame allocations, 32 draw calls.
- **Font metric archaeology**: the pole's lh 0.9 COLLIDES in League Gothic — hhea line 1.2em, cap 0.735em (read from the TTF with opentype.js); shipped lh 1.05 with metrics cited in the stylesheet — honest deviation, slice grammar (margin-top −7px) untouched.
- Verified here: hero (day+night = perfect negative, rung-2 poster strip behind), Index (Fibonacci seats match spec's exact first three rows), colophon, Gift Shop postcard (exhibit 17 = dayOfYear 208 % 32), virtual scroll via simulated wheels/PageUp-Down. Live formations unverifiable on this GPU-less machine (gallery mount refuses software renderers → rung-2, exactly as specced).
- League Gothic latin woff2 (GF API subset, 10KB) + OFL from theleagueof repo.

## Our own build — WORLD 04 PULSE shipped (v1) — 2026-07-27

Built to the critic-amended spec (`docs/specs/04-pulse.json`): zero-scroll click-through FSM (poster → curtain → 5 stations → finale), Outfit weight map 800/700/600/300 as four utility classes, day red / night plum with 'hub-theme' continuity both directions.
- **FSM** (`fsm.ts`, ~90 lines): guard-table machine, states poster|reveal|travel(n)|station(n)|finale, unguarded events dropped silently (scripted double-clicks during travel correctly no-op).
- **The hall** (`hall.ts`): 48-unit CatmullRom wire, lathe button base/cap, half-torus arch, helix-tube spring, lathe cradle, RoundedBox screen slab + 16×9 instanced pixel grid (seeded flicker/cascade), 60 instanced chevrons drifting 0.12 u/s, 24 pylons, additive heat tail, 80-confetti InstancedMesh (mulberry32(4) velocities); ONE directional shadow light tracking the pulse (shadowMap.autoUpdate=false, dirty-flagged) + hemisphere + night-only PointLight parented to the pulse (the protagonist IS the light); NeutralToneMapping; station camera poses per spec table with measured lerp rates 1−0.96/0.94/0.95^(60dt); software-renderer path renders one still per state.
- **DOM choreography**: poster IS the curtain (h1 96→144px scale exit at pulseExit, 2s linear yPercent-140 slide, CSS-loop wave strip on the trailing edge); ONE reusable dialog node (pop 0.6 pulsePop / exit 0.45 pulseExit); 5 progress dots (visited jumps); hanging tag = progress meter (two-stop hard-cut gradient 6.15→26.15→46.15→66.15→86.15→100, station 3 lands on the measured 46.15 exactly); finale with the world's ONLY green (#00b870 stamp, dashoffset draw) + seeded confetti; RUN IT AGAIN resets tag/dots/pulse without reusing the curtain.
- **Rung-3 diagram journey verified here** (this machine has no WebGL): five flat-vector station glyphs + dashed line, pink pulse dot hops (position:absolute anchor fix — transforms are container coords), same dialogs/dots/tag/theme.
- **Bugs found by probing, not by eye**: blanket `.poster-h1 .line` selector caught the finale's lines too (finale h1 silently zeroed by the poster's exit tween — same for the comma-group body/pills selectors; ALL poster selectors now scoped under `.poster-copy`); station u-mapping was /8 instead of (n−1)/4 (stations sit at EVEN curve points 0/2/4/6/8); Sprite got MeshBasicMaterial (needs SpriteMaterial).
- **Roundel center glyph redesigned same-day** (user: "looks like a dick"): the fingertip-capsule became a chunky down-arrow over the pill — press metaphor in pure geometry.
- Poster max-width removed: "WHEN YOU PRESS" ≈720px at 96px must hold one row (it wrapped at 520px container).

## Repo merge — the 2026-07 design lab becomes world 00 — 2026-07-27

`renocrypt/design` (design.renocrypt.com) held four single-file WebGL studies from 2026-07-20; this tree held the worlds build. Merged into one repo, one domain.

**Measured before deciding** (`gh api`, not assumptions):
- Pages was `build_type: legacy`, source `main` / root — a branch-folder publish, incompatible with a Vite build. Flipped to `workflow` with `.github/workflows/pages.yml`; `site/public/CNAME` carries the domain into every build.
- The lab has **no build step at all** (Three.js/GSAP via jsdelivr, fonts via Fontshare/GF APIs). That is precisely why there is no framework conflict: `site/public/` is copied verbatim by Vite, so the archive keeps its own CDN-era stack and the two never meet. Relative paths (`assets/…`, `s4-the-agent.html`) still resolve under the `/lab/` prefix, unedited.
- **`switcher.js` was referenced by s1/s2/s4 but absent from the repo** — a live 404 since 2026-07-20; the three studies' cross-links were dead. Rewritten to do the one job the pages can't do themselves (the way back to `/`), and wired into all five.
- 41 MB of `assets/models/` (flight-helmet PBR set, damaged-helmet) plus 6 self-hosted woff2 were referenced by **nothing** — `flight-helmet.glb` was a 14-byte file containing the literal text `404: Not Found`. Only `robot-expressive.glb` + 2 imagery JPGs are actually loaded; the rest dropped from the working tree (history untouched — rewriting a public repo's hashes to reclaim 41 MB is not worth it).

**Registry generalized** so the hub can open things it doesn't compile: `kind: 'world' | 'static' | 'external'` + `href`, and the room cards now render from the same array as the rail and the mobile menu (`#worlds` is empty markup by design). Only `kind: 'world'` becomes a vite input. The archive is `00 · Lab` in the lab's own phosphor mint `#62e6c8` — its colour, not an assigned one — laid out as a full-width shelf under the four world doors.

**Google tag** (G-6TMHBNWWB6) is injected at `closeBundle` by `tools/vite-plugin-google-tag.ts` rather than in the HTML templates: files under `public/` never pass through Vite's html pipeline, so a template tag would have silently missed all five archive pages. Verified: 11/11 built pages carry it, `window.dataLayer` present on both a bundled world and a copied archive page.

**Also**: the `worlds.` dot went red → cobalt (user: red reads as a telecom logo — and red belongs to lane 04); `research/shots/` is now gitignored, evidence stays local while `NOTES.md` carries the findings.

Verified on the built output (`python3 -m http.server` over `dist/`): 14/14 routes 200 incl. archive assets and CNAME; registry-rendered doors and cards correct at 1440 and 390; archive exit pill present on all five pages. The studies' WebGL still can't create a context here (no GPU — same standing limitation as the worlds' centerpieces), so their live render needs the phone.
