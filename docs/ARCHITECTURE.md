# Site architecture

The site has one deployment and three editorial areas: world studies, the lab, and a curated collection of interactive stories, places, and experiments.
Their visual identities are independent; their routes and publishing checks are shared.

## Source and route ownership

| Area | Authored source | Public route |
| --- | --- | --- |
| Hub | `site/index.html`, `site/src/hub/` | `/` |
| World studies | `site/worlds/<id>/`, `site/src/worlds/<id>/` | `/worlds/<id>/` |
| Lab entrance and bundled studies | `site/lab/`, `site/src/lab/` | `/lab/` |
| Standalone lab studies | `site/public/lab/` | `/lab/<file>.html` |
| Curated entrance | `site/curated/index.html`, `site/src/curated/` | `/curated/` |
| Standalone curated experiences | `site/public/curated/<slug>/` | `/curated/<slug>/` |
| Shared previews | `site/public/social/` | `/social/<file>` |

`site/src/catalog/registry.ts` owns the site identity, primary destinations (`LANES`), and curated experiences (`CURATED`).
`kind: 'world'` is a bundled world entry, `collection` is a collection entrance, `static` is a standalone destination, and `external` is an absolute URL.
Readiness is separate: an accessible study can still be marked `building` and presented as “In progress.”
CTA wording belongs to its catalog entry, so a collection never inherits a lab-only label.

The catalog is not inside a particular world because the hub, collection, build configuration, and metadata all consume it.
Existing public URLs remain stable when source files move.

## Hub rendering and artwork

`site/src/hub/lounge/scene.ts` loads the compressed room and its paired lighting atlases from `site/public/hero/`.
The same camera frames the initial stills and live geometry, including on narrow screens.
Fine wirework, floor joints, and opal lights use separate material batches to avoid artifacts from tiny texture islands.
The remaining surfaces share one lighting atlas per appearance.
The appearance control blends the daylight and evening lighting without rebuilding the room.

The renderer uses the shared GSAP clock and stops when the hero is offscreen, the tab is hidden, the menu is open, or motion is paused.
Reduced motion, data-saving preferences, software rendering, and graphics failure retain a visible still.
The content fingerprint in `site/src/hub/lounge/revision.ts` keeps the mesh and matching atlases on the same asset revision.
The optional Blender and image-packing commands are documented in `site/tools/hero/README.md`.

The catalog names each SVG through its `art` field.
`vite-plugin-catalog.ts` embeds the artwork into the served HTML, and `illustrations.ts` runs its animations only while visible.
The world strip supports native horizontal scrolling, keyboard focus, and explicit previous/next controls.

Lab and Curated share the line-art source indicator in `site/public/icons/source.svg`.
Individual curated experiences use a quiet return link and a text source link to their own HTML file on GitHub's `main` branch.

The GitHub and App Automaton utilities emit `outbound_navigation` through the existing Google tag, with `destination`, `placement`, and `link_url` parameters.
The links work without analytics and never wait for tracking.
App Automaton also receives referral campaign parameters.

## Adding a curated experience

1. Put the standalone `index.html` and its runtime CSS, JavaScript, and assets in `site/public/curated/<slug>/`.
   Keep an existing modular project structure when present; research captures and local authoring caches stay outside the published folder.
2. Add a `CURATED` entry with its name, description, context, preview, and reference links.
3. Add an optimized preview under `site/public/social/`.
4. Include a visible route back to `/curated/`, desktop and touch controls, and a usable graphics fallback.
5. Run `npm run test:site`, `npm run build`, and `npm run verify:site` from `site/`.
6. Verify the built route in a browser, including a direct visit, a gallery visit, mobile layout, and graphics failure.

The standalone files use relative references to their own CSS and JavaScript.
Shared site assets and navigation use paths from the domain root.
The collection page is generated from the catalog as static HTML and stays useful without JavaScript.
CDN fonts and libraries are permitted for these self-contained experiences; they do not need another npm project.

Bikini Atoll keeps its three-file application.
A Drop of Doubt retains its `css/`, `js/`, and `assets/` folders, including model credits and licensing.
Its collection preview also supplies the still shown without graphics or JavaScript.
The After hours presentation pairs Playfair Display and Switzer with a blue-black, pearl, and lilac palette.
The opening places a compact scene heading above the complete court, while playback opens a separate dialogue column.
On small screens the picture precedes the dialogue and playback controls stay fixed at the bottom.
Speaker accents stay within the cool palette; the brand signature appears once in the header.
The optional `shareImage` catalog field selects a separate social card; otherwise the collection preview is used.
Both use 1200 × 630 images, and the build verifier checks each experience's Open Graph and Twitter image selection.

## Publishing pipeline

`vite-plugin-catalog.ts` fills the hub and collection templates in both development and production.
Its exact template markers fail loudly if the destination content would be missing.
Vite compiles the shared pages and copies `public/`, including standalone experiences, into `dist/`.
`vite-plugin-seo.ts` applies the same metadata rules to compiled and copied pages.
`vite-plugin-head-tags.ts` supplies the existing analytics and site icon support.
`site.verify.mjs` then checks every HTML page, local asset link, registered destination, canonical URL, structured-data block, and sitemap decision.

The development middleware resolves public directory indexes so `/curated/<slug>/` serves the same page locally as it does on GitHub Pages.
`site/public/CNAME` carries `design.renocrypt.com` into each deployment.
The workflow publishes only after the tests, TypeScript checks, build, and output verification pass.

## Search and AI discovery

The useful content comes first: human-readable introductions, reference links, meaningful titles, and real internal navigation.
The metadata describes that content through canonical URLs, individual social tags, and linked `WebPage`, `CreativeWork`, `CollectionPage`, and breadcrumb data.
Author-supplied metadata is preserved, and missing tags are filled individually.
The sitemap contains actual, indexable canonical pages and excludes the custom 404 page.
Build time is not emitted as a fabricated `lastmod` value.

`public/llms.txt` stays an authored guide and must be updated when the collection changes.
It complements the site’s HTML; it is not a substitute for readable content or a requirement for AI search inclusion.
This follows [Google’s guidance for AI search features](https://developers.google.com/search/docs/appearance/ai-features), which emphasizes the same accessible content and internal links used for ordinary search.

## Temporary work

Build output, dependency caches, verification screenshots, and browser artifacts stay untracked.
Use a namespaced directory under `/tmp/` for integration work and test evidence.
The preview image under `public/social/` is a selected publishing asset; raw browser captures remain outside the repository.
