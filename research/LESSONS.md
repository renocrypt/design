# Standing lessons

Only what would cost us again if we forgot it.
Git holds what shipped when; this file holds no narrative.

## Method

**Measure before building; keywords are not anatomy.**
The first hub was built from remembered impressions of units.gr and failed outright.
Every world since starts from a measured section in `POLES.md`.

**Describe the original truthfully, then rebuild — never imitate un-replicable media.**
Probing overturned two poles: hildenkaira's chrome is pre-rendered with zero runtime 3D, and blood-donation is a click-through state machine, not scrollytelling.

**A contrast probe must composite alpha, or it lies in your favour.**
Reading `getComputedStyle(el).color` and taking the first three numbers scored `rgba(14,13,11,0.78)` on cobalt as solid: 4.18:1 reported, 3.42:1 actual.
Walk up to the first opaque ancestor background, composite, then apply the large-text threshold (≥24px, or ≥18.66px at weight ≥700).

**Verify by probing, not by eye.**
World 04's real bugs were invisible in a screenshot: a blanket selector zeroing a headline, station u-mapping off by a divisor, a Sprite given a MeshBasicMaterial.

**Look at the thing, not only at its numbers.**
S5 passed 14/14 geometry assertions with a keyboard missing Z, its three rows front-to-back reversed, and rotor flanges rotated onto the wrong axis so they overlapped by 0.27.
Assertions check the intent; the built scene graph is a separate object and needs its own look — `site/src/lab/cipher/scene.verify.mjs` projects it to wireframes without a GPU, because rasterising needs one and geometry does not.

**Prefer a known-answer vector from outside the project to a self-consistency check.**
The old cipher passed reciprocity and was still wrong: a broken transform can be perfectly self-consistent.
One published vector caught it — Enigma I at AAA turns `AAAAA` into `BDZGO`.
Corollary: when a fresh test fails, suspect the expectation first.

**A test can pass for the wrong reason, so read what it actually compares.**
The rotor/lampboard clearance check compared the frontmost lamp's *centre* to the rotor face and reported +0.640 of daylight where there was −0.177 of overlap.
Clearances are measured surface to surface, and a count of slots is not a check that the alphabet is covered.

**Fidelity claims are cheap to type and cost one script to check.**

**A fix for *missing* is not licence to change *design*.**
Restoring an absent favicon turned into redesigning the mark, on a 16px legibility claim nobody had rendered.

**Corrections replace, they do not append.**
This file and `POLES.md` are current state; when a re-visit overturns a number, delete the old one.

## Craft

**GSAP owns every transform it touches, exclusively.**
A CSS `transition: transform` on the same element strands `gsap.from()` entrances mid-flight.

**Area is what glares, not saturation.**
Night-mode tuning belongs on the large fills; small accents keep the undimmed hue.

**Text on a fill must not follow a flipping ink token**, or day/night silently inverts the contrast.

**Don't tie a rendering mode to a colour theme.**
Theme is colour; which representation is on screen is a separate axis, and one of them travels the lab while the other belongs to its page.
S5 hid its 3D under `[data-theme='day']`, so a light-mode visitor never saw the page's subject and a toggle in any other world took it away through the shared `hub-theme` key.
Splitting them means the lit object also needs a second lighting pose, or it is a hole cut in the paper.

**A degrade ladder must actually fire, and the trigger has to exist.**
A lost context that hides the canvas without restoring the fallback leaves an empty page.
Still live in seven files: software-renderer detection reads `WEBGL_debug_renderer_info`, which modern browsers gate — the sniff returns nothing and the code concludes "fast GPU".

**Font metric archaeology beats copying a line-height.**
The obys pole's lh 0.9 collides in League Gothic, whose hhea line box is 1.2em against a 0.735em cap height; we ship 1.05 with the metrics cited in the stylesheet.

**Generated beats downloaded, and one recipe should feed every rung** — world 03's poster generator feeds the WebGL planes, the DOM strip and the postcard.
The rule is about avoiding three drifting implementations, not a ban: `ASSETS.md` puts CC0 first, and downloaded GLBs already ship in S4 and world 04.

**Keep the preloader the short, dynamic cut.**
