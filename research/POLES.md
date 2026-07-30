# Reference poles — measured anatomy

The five sites the lab is built against, one section each: what the original *is*, and the numbers we measured off it.
This file is **current state, not history** — when a re-visit corrects an earlier reading, the old number is deleted rather than appended, so anything here is what we believe today.
Where two viewports disagree, both are recorded with their viewport, because that difference is usually the finding.

Screenshots live in `shots/<site>/<date>-<what>.png` and are gitignored — evidence stays on disk, conclusions come here.
`shots/_smoke/` holds environment-verification captures, not inspiration.
Sibling files: `LESSONS.md` (what building against these poles taught us), `award-study-2026-07.md` (the 2026-07-19 award-winner study the lab itself grew from).
Curation hubs (posts.design, recent.design, mnmm.xyz…) are listed with their verdicts in `docs/INSPIRATION.md`; they are feeds, so they get a verdict there rather than a findings section here.

---

## units.gr — the hub pole

Greek student-housing brand, design by Big Horror, code by Lemonjelly.
Role: entrance-page anatomy — a hub that sells a universe, then hands off.
Renders here; Playwright needed for measurement passes.

**Palette and surfaces.** Cream paper `rgb(244,233,225)` stays uncolored; saturation lives only in cards, chips and bands.
Door hues: cobalt `rgb(0,114,227)`, amber `rgb(255,178,0)`, orange `rgb(255,97,0)`, green `rgb(0,170,60)`, violet `rgb(171,84,247)`.
Black text on every color, sentence case, 16px — small labels, never display type.
White text exists in exactly one place: on the hero media card.

**Geometry.** Two radius scales plus pills: big cards ~33px at 1280 and ~37.5px at 1440 (so it is fluid, not fixed), nav chips 10px, pills 999px.
Rail is fixed and only 142px wide; doors are 122×144px — taller than wide, and that door proportion is the thing a 122×100 chip misses.
Hero is ONE giant rounded photo card (1093×670 at 1280) filling the first viewport.
Bento cards ~360×267, solid fills, black text, list rows with hairline underlines.
Tags are hairline-bordered pills at 14px on paper.

**Type.** Bunch (chunky warm display) at weight 850 + Aeonik Pro (neutral grotesk) for body — the two-font pattern.
Hero display 64px/lh 1.0 at 1280, 72px at 1440; sub Aeonik 700 at 24px; CTA is a black pill 182×48 at 15px.
Marquee band: full-width strip, red ground `rgb(234,55,55)`, amber Bunch-850 items at 14px — colored-on-colored, not hairline-on-paper.

**Section grammar** (the part that carries the page).
Hero statement → numbered destination cards → alternating tone sections → values triptych → handoff links.
Asymmetric manifesto card (amber, ~1/3 width, tag top, statement mid-low, pill chips, cream air beside); red marquee band with drawn bolt/diamond glyphs; a "living" row of flat-vector illustration + photo + hairline-list cards; a "what we stand for" row of cobalt cards carrying pixel-art-on-graph-grid icons; a full-width black pill bar; a footer of newsletter pills, graph-paper grid with scattered pixel blocks, giant black logotype and hairline pill links.
One "Press to Start" canvas sits mid-page — playful easter-egg energy inside an otherwise flat, print-like page.

**Mobile grammar** (decisive).
The rail collapses to logo + pill CTA + black hamburger — never a horizontal chip strip.
Hero card follows immediately, display type stays huge, black pill CTA bottom-center.

**Preloader.** Animated items play before entry: charming, but too long — ours is the short, dynamic cut.

---

## lamalama.com — the 01 Noir pole

Amsterdam agency, 15× Awwwards Developer Award.
Role: boldness and motion craft; total two-color commitment.
Env: full-canvas WebGL + virtual scroll, which is unscreenshotable here — study via og-image, DOM probes and their Awwwards case pages.

**Palette.** Near-black warm charcoal `rgb(26,28,28)` canvas + bone `rgb(249,244,235)` ink, and that is genuinely all.
Layering is done with alpha, not new colors: bone/white at 10% for idle chips, black at 40–60% + backdrop-blur for floating panels.
The signature red `rgb(231,93,96)` appears 5× as signal only; the *visceral* red is macro ink-in-water photography used as image material, not as UI color — palette from a material.

**Type.** SuisseBPIntl (grotesk, 4 weights) for statements + Sometype Mono for labels — the mono does the `[ bracketed label ]` voice, the grotesk does ALL-CAPS damage.
Global tracking −0.02em on every role, one knob.
Statement H1: 700, uppercase, **lh 0.80**, ~5.2vw via `clamp(2.5rem, 0.9375rem + 3.13vw, 3.75rem)`; display ~5.7vw up to 7.69rem; statement H2 at weight 400 / lh 0.90 / no uppercase / ~3.4vw is the quiet counter-voice.
Mono label: **10px fixed at every breakpoint**, w500, uppercase, lh 1.8 — nav, tags, timeline and footer all share this one role.

**Geometry.** Border-radius **4px everywhere**, never larger.
Floating UI inset 16px from viewport edges; top pill 438×50 (black 60% + blur); side cards 160px wide; timeline chips 168×50, idle white-10%+blur(24px), active solid bone with black text.
12-col grid, 40px page margin, 24px gutter, **no max-width**; rhythm comes entirely from vw-proportional padding tokens (`max(Npx, N/1440·100vw)`, 60→320px) with zero margins between sections.

**Motion.** **Zero CSS hover transitions — all JS** (GSAP + Lenis), over 8.1 viewports of virtual scroll (wheel hijack, `scrollY` stays 0).
Vocabulary: duplicated-text roll-over (53 parents hold 2× identical children, translate swap) and word-split masked line-rise (`clip-path` inset + translateY 100%).
Ease census power4.out ×62, expo.out ×58; **0.65s is the workhorse**, range 0.35–0.65s.

**Voice as design.** Rotating header strings ("LET'S DO DAMAGE") make the copy itself a motion element; peripheral UI (sticky corner cards, `( + )` expanders) is furniture in the composition, not chrome around it.

---

## hildenkaira.fi — the 02 Chrome pole

Helsinki social-content agency.
Role: warm-stone editorial serif meeting liquid metal.
Env: 403s/drops WebFetch — Playwright required.

**The honest 3D note.** Zero runtime WebGL/canvas/Three.js: every chrome surface is pre-rendered AVIF/video, baked offline and animated in 2D with GSAP in Webflow.
It *reads* 3D and isn't — which is exactly why World 02 does the chrome live.

**Palette.** Greige canvas `rgb(234,233,230)` + near-black ink `rgb(24,24,24)` + white carry ~85% of surfaces.
Accent trio: vermilion `rgb(255,76,36)`, pale pistachio `rgb(236,253,173)`, jade `rgb(63,174,134)`.
Pistachio does the real accent work (27 uses), jade 17, and vermilion has exactly ONE genuine UI use — a scalpel, not a brush.

**Type.** PP Editorial New (sharp serif) owns EVERY heading and numeral — always weight 400, lh 0.9, tracking −2%, vw-fluid (5.82 / 4.36 / 4.0 / 3.27 / 2.9vw).
PP Neue Montreal owns everything ≤14px at weight 500, lh 1.3.
Both Pangram Pangram, and the free tier covers personal use — this exact pair is legitimately available to us.

**Composition.** Masthead is 12 individual AVIF letter sprites in one full-width strip, 17.4vw tall, flush to the viewport top (letters 58–192px wide at 1280).
Hero collage: 7 photos ~12vw wide, portrait ratio 0.80, rotations within ±4.5°, and **no border, shadow or radius** — rotation alone does the polaroid cue; exactly one pair (the founders) gets a 2px pistachio border and ±5°.
Buttons are 28px tall at radius **0** — sharp, not pills — with a 14×14 ink arrow-square inside and a jade layer sliding in on hover.
Sections are strict 100vh slabs with ZERO vertical gaps; light/dark flips are per-section background swaps (ink `#181818`, footer `#2b2b2b`) while the body stays greige, so the palette has a built-in night mode per section.
Services is a sticky 100vh stage over a 2.5-viewport runway with 3 stacked 39vw×43vh cards entering from translateY 160 / translateZ −160.

**Motion.** One ease does almost everything: **0.525s `cubic-bezier(0.625, 0.05, 0, 1)`** on transform, shared by 92 of 96 transition elements.
Idle float is rotation ~±1°/s inside a ±5–12° band plus ±5% scale breathing, with translation on a parent layer.

Vibe words: editorial · chrome · warm-stone calm · sticker-collage · confident-cocky.

---

## experiment.obys.agency — the 03 Monument pole

Obys' unpublished-works archive ("Since 2018… …Never Finished").
Role: type as architecture in a gallery-white void.
Env: real runtime Three.js (0.170 via esm.sh), and its WebGL context refuses to create under SwiftShader — the typographic shell is all we can see here.
Desktop-only by design: viewports ≤1199px get a hard mobile-blocker, and there is zero fluid type anywhere.

**Palette.** White + pure black + `#0003` (20% black) for every hairline. Nothing else.
The Pride toggle is not a palette swap: a fixed z−1 backdrop of blurred canvas color blobs appears and two shader uniforms flip (grayscale/whitewash off), while ink and hairlines never change.

**Type.** Brutally binary — display 94px / lh 0.9 / ls −0.055em / uppercase, single face single weight (Obys NG 400); utility 13px / ls −0.01em for nav, clock, archive and footer; dim tier is that 13px at 20% black.
Declared escalations (110px lh 0, 180px) exist but go unused.

**Hairline grammar.** 1px `#0003` rules slice BETWEEN display lines, and the 94px type pulls up into them with `margin-top: −7px`.
Reveals run `clip-path: inset(0 100% 0 0) → inset(0)` at 0.5s power2.out.

**Geometry.** One inset governs the page: 10px margin, 10px grid gap, 12 equal columns, all fixed corner UI at 10px, captions at top 226px.

**Motion.** Enter expo.out 0.8–1.2s (staggers 0.02 char / 0.08 line / 0.12 block), exit power2.in 0.4s, structural wipes power4.inOut 0.75–0.9s, CSS micro-motion `cubic-bezier(0.16,1,0.3,1)`.
Continuous motion is **per-frame lerp, not tweens**: 0.05 planes/camera, 0.1 scroll inertia, 0.15 cursor, wheel → virtual scroll `Δ·0.002`.

**Gallery recipe (full).** 32 unit planes re-geometried to `2·aspect × 2` on texture load; one ShaderMaterial (grayscale by luminance, whitewash mix 0.4, distance-fog-to-white, wireframe mode); formations are Fibonacci sphere (r 6.5), jittered ring, golden-angle flower and cylinder, crossfaded by lerp/slerp; scroll morphs formation → x-strip at spacing 4; fov 45, camera z 10, `depthWrite: false` with opacity fade instead of sorting.
Preloader: black top/bottom curtains + a centered 1px line at 52.5% and a 13px counter, curtains parting expo.inOut 1.2s.

---

## blood-donation.com — the 04 Pulse pole

Interactive 3D guide to the blood-donation process, by Steve Meredith.
Role: single-hue poster commitment over a guided journey.
Env: renders fully here — the one pole we can see live.

**It is not scroll-driven.** The journey is a click-through **XState state machine** (React 19 + react-three/fiber + Three r184 WebGPU/TSL + framer-motion; no GSAP or Lenis anywhere).
Grammar per station: `walk → cameraEnter → dialog → cameraExit`, six stations (Reception → Waiting → Screening → Donation → Refreshments → "GIVE BLOOD").
WebGPU with a WebGL2 fallback, Safari forced to WebGL, frameloop paused on tab hide.

**Palette.** Saturated red `#e5262c` IS the canvas (SVGs carry `#E5272C` — two reds coexist), pink text `#fdd2d2`, bag-gradient pink `#f9cfd1`, plum body `#3d3c47`, darkest `#302c35`, success green `#00b870`.
The WebGL clearColor `0x4b4a53` blends the canvas into the plum ground.

**Type.** Outfit variable 300–800, one 32KB woff2 doing the entire identity — proof a single variable family can carry both jobs.
Poster h1 96px (144px on exit) / weight 800 / lh 0.9 / ls −4 to −6px / uppercase.
Weight map: 300 body · 600 eyebrows (+3.5px tracking) · 700 buttons (+1.4px) · 800 titles; 400 and 500 never appear.
Two-tone headlines are per-line spans with pink lines set to `#fdd2d2` — no gradients.
All px, zero clamp/vw; two breakpoints (800/960) do everything.

**Components.** Roundel badge 149px fixed top-right, circular text pre-outlined as paths (no textPath), rotating via CSS `360°/8s linear infinite`.
Pill CTA h 54/64px, radius 44px, pad 0 32px; hover scales a `::before` fill layer to 1.05 in 200ms — never the button itself.
Blood bag is an SVG gradient with two stops at 46.15/46.17% — a hard cut standing in for fill level.
Curtain reveal: full-screen red slides y 0→140% over 2s linear while a 512×128 wave strip loops at 1s.

**Motion.** Framer: 1.4s easeInOut screen fades, 2s linear curtain, backOut `(.34,1.56,.64,1)` pops, anticipation bezier `(.36,0,.66,−1.2)` exits, delays quantized to 300ms.

**3D.** All glTF (1.06MB draco map + character with wave/walk/idle/sit/drink clips + NPCs), baked lightmap+AO webp, forest.exr env, ONE directional shadow light; follow cam fov 40 at +(0,8,8) with lerp `1−0.96^(60·dt)`; walk 3 u/s.
