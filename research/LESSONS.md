# Standing lessons

What building this lab actually taught us, distilled from the per-version build log that used to live here.
Git holds the narrative of what shipped when; this file holds only what would cost us again if we forgot it.
Hard build rules for a new lane live in `docs/CONCEPT.md` § Adding a lane — this is the reasoning behind several of them, not a second copy.

## Method

**Measure before building; keywords are not anatomy.**
The first hub was built from remembered impressions of units.gr and failed the vibe check outright.
The fix was a DOM measurement pass, and every world since has started from a measured-anatomy section in `POLES.md`.

**Describe the original truthfully, then rebuild — never imitate its un-replicable media.**
Two poles turned out to be something other than they look: hildenkaira's chrome is pre-rendered with zero runtime 3D, and blood-donation is a click-through state machine rather than the scrollytelling we first assumed.
Both corrections came from probing, and both changed what we built.

**A contrast probe must composite alpha, or it lies in your favour.**
A first pass read `getComputedStyle(el).color` and took the first three numbers, so `rgba(14,13,11,0.78)` on cobalt was scored as if it were solid: 4.18:1 reported against 3.42:1 actual.
The probe has to walk up to the first opaque ancestor background, composite the text color over it, and apply the large-text threshold (≥24px, or ≥18.66px at weight ≥700) before judging.
Softening text with opacity is where this bites hardest — on the darkest lane hue no alpha at all clears AA, so hierarchy there has to come from size and measure.

**Verify by probing, not by eye.**
World 04's real bugs were invisible in a screenshot: a blanket `.poster-h1 .line` selector silently zeroed the finale's headline via the poster's exit tween, station u-mapping was `/8` instead of `(n−1)/4`, and a Sprite had been given a MeshBasicMaterial.
The same habit caught the night-mode contrast failures — measured ratios, not "looks a bit dark".

**A fix for *missing* is not licence to change *design*.**
While fixing an absent favicon the mark itself got redesigned, justified with a 16px legibility claim that had never been rendered.
Reverted. A legibility claim without a render behind it is exactly the kind of assertion this project bans.

**Corrections replace, they do not append.**
This file and `POLES.md` are current state.
When a re-visit overturns a number, delete the old one — a tracked note that contains both readings makes the reader do archaeology to find out what we believe.

## Craft

**GSAP owns every transform it touches, exclusively.**
A CSS `transition: transform` on the same element strands `gsap.from()` entrances mid-flight — the hub's rail gates froze half-slid until the hover transition moved into GSAP.

**Area is what glares, not saturation.**
A bright fill that is fine as a 34px accent is not fine as the widest card on a dark page.
Night-mode tuning belongs on the large fills; small accents keep the undimmed hue.

**Text on a fill must not follow a flipping ink token.**
If a surface deliberately keeps its color across themes, its text has to be pinned too, or day/night flips silently invert the contrast.

**Font metric archaeology beats copying a line-height.**
The obys pole's lh 0.9 collides in League Gothic, whose hhea line box is 1.2em against a 0.735em cap height.
We shipped 1.05 with the metrics cited in the stylesheet — an honest deviation, documented where the next reader will hit it.

**Generated beats downloaded, and one recipe should feed every rung.**
World 03's seeded poster generator feeds the WebGL planes, the DOM fallback strip and the gift-shop postcard from a single function; the alternative is three drifting implementations of the same artwork.

**Keep the preloader the short, dynamic cut.**
The poles' own intros run long; ours exists to cover first paint, not to perform.

## This machine

These are environment facts, not project rules — they shape what "verified" can mean in a session here.

**There is no usable GPU.**
Software WebGL (SwiftShader) is deprecated-flagged Chrome-side, exhausts contexts under memory pressure, and refuses context creation outright for several of the poles and for our own heavier scenes.
Consequence: live 3D frequently cannot be visually confirmed here, so scene math gets verified in node, the degrade ladder's lower rungs get verified in the browser, and anything still unproven is written down as unproven rather than implied to work.

**There is no image tooling at all** — no PIL, cairosvg, ImageMagick or rsvg.
`site/tools/make-favicons.mjs` therefore writes PNG/ICO bytes directly (SDF rasteriser, hand-rolled CRC32 + zlib deflate, ICO container around PNG payloads).

**The browser is one shared instance on constrained hardware.**
Sequential use only, never parallel, and close the page when done.
Pause every `<video>` before screenshotting autoplay-heavy sites or the software renderer stalls, and wait on `document.fonts` before capture.
