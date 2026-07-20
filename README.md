# RenoCrypt — Design Lab

The UI/UX design surface for the RenoCrypt org. Everything here is raw material
for the publication: tokens, assets, reference studies, and rendered direction
prototypes. Directions are judged rendered, not described.

## Structure

- `tokens/` — the brand's atomic layer: color, type, motion (CSS + notes)
- `assets/fonts/` — verified self-hosted woff2 (all OFL/FFL)
- `assets/imagery/` — verified free imagery + a contact sheet (every image in
  this pool has been visually inspected — never wire an unverified URL)
- `references/` — study notes from award-site research (what winners actually do)
- `directions/` — single-file rendered direction studies (r*.html). Open the
  index: `python3 -m http.server 8642` in this folder, then
  http://127.0.0.1:8642/directions/

## Workflow

1. Study references (visually — screenshots, not summaries).
2. Build direction studies as single-file HTML in `directions/` — CDN
   libraries welcome (Three.js, GSAP, KaTeX); performance is the only rule.
   Every page must include the switcher: `<script src="/switcher.js"></script>`
   (update the items list when adding a direction).
3. Preview locally, screenshot desktop + mobile, critique against references.
4. Winner gets ported into the target site (renocrypt.com etc.) with
   self-hosted fonts/images.

## Brand frame

RenoCrypt is Matrix Alchemy: long-form technical writing on ML, systems, and
security. Voice: authority, precision. Design values: clean typography, fast
pages, math and code as first-class citizens.
