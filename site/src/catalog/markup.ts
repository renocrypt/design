// Lane markup builders — pure string functions, no DOM.
//
// These exist so the hub's lane-derived content can be stamped into index.html
// AT BUILD TIME (tools/vite-plugin-catalog.ts) instead of being appended by
// client JS. The reason is GEO, not nostalgia: Google's renderer executes JS,
// but GPTBot / ClaudeBot / PerplexityBot and friends do not — for them, and for
// anyone with scripting off, the gates, room cards, marquee and closing CTA
// must exist in the served HTML. Client JS keeps only the jobs that genuinely
// require it (pixel-glyph stamping, hover physics, scroll motion).
//
// The markup here mirrors what src/hub/main.ts used to render at runtime —
// same classes, same order, same aria — so the existing CSS applies untouched.
// If you change a card's structure, change it HERE; the stylesheet and the
// crawlers see only this version.

import { CURATED, LANES, curatedEntry, laneEntry, type Lane } from './registry';

const esc = (s: string): string => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

/** One rail / menu door. `gate--compact` marks non-world lanes, as before. */
export const gateMarkup = (lane: Lane): string =>
  `<a class="gate${lane.kind === 'world' ? '' : ' gate--compact'}" href="${laneEntry(lane)}" style="background: ${lane.hue}">` +
  `<span class="gate-no">${lane.num}</span>` +
  `<span class="gate-arrow" aria-hidden="true">&#8599;</span>` +
  `<span class="gate-name">${esc(lane.name)}${lane.status === 'building' ? '<small class="gate-status">In progress</small>' : ''}</span>` +
  `</a>`;

/** The full door set, in registry order — used by both the rail and the mobile menu. */
export const gatesMarkup = (): string => LANES.map(gateMarkup).join('');

/**
 * The room-card grid. Worlds fill the 2×2 first; anything else becomes a
 * full-width shelf below, so the four worlds keep the section's rhythm.
 * (This deliberately inverts the rail's numeral order — the rail is an index,
 * the grid is a pitch. Same lanes, both ends, by choice.)
 */
export const roomsMarkup = (): string => {
  const ordered = [...LANES.filter((lane) => lane.kind === 'world'), ...LANES.filter((lane) => lane.kind !== 'world')];
  return ordered
    .map(
      (lane) =>
        `<a class="room-card${lane.kind === 'world' ? '' : ' room-card--wide'}" href="${laneEntry(lane)}" style="background: ${lane.hue}">` +
        `<svg class="pix" data-glyph="${lane.glyph}" viewBox="0 0 100 100" aria-hidden="true"></svg>` +
        `<div class="card-head"><h3 class="card-title">${esc(lane.name)}</h3><span class="card-no">${lane.status === 'building' ? '<small class="card-status">In progress</small>' : ''}${lane.num}</span></div>` +
        `<p class="card-kicker">${lane.kicker}</p>` +
        `<ul class="card-list">${lane.points.map((p) => `<li>${p}</li>`).join('')}</ul>` +
        `<span class="card-cta">${esc(lane.cta)} <span aria-hidden="true">&#8599;</span></span>` +
        `</a>`,
    )
    .join('');
};

/** The collection is readable and navigable before any browser JavaScript runs. */
export const curatedMarkup = (): string => CURATED.map((experience) => `
  <article class="curated-card" aria-labelledby="${experience.id}-title">
    <a class="curated-image" href="${curatedEntry(experience)}" aria-label="Explore ${esc(experience.name)}">
      <img src="${experience.image}" width="1200" height="630" alt="${esc(experience.imageAlt)}" fetchpriority="high" />
      <span class="image-caption">CURATED ${experience.num}<span aria-hidden="true">↗</span></span>
    </a>
    <div class="curated-content">
      <p class="curated-location">${esc(experience.location)}</p>
      <h2 id="${experience.id}-title"><a href="${curatedEntry(experience)}">${esc(experience.name)}</a></h2>
      <p class="curated-description">${esc(experience.description)}</p>
      <ul class="curated-features">${experience.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      <a class="curated-enter" href="${curatedEntry(experience)}">Enter the experience <span aria-hidden="true">↗</span></a>
    </div>
    <div class="curated-story"><h3>A little context.</h3><p>${esc(experience.story)}</p>
      <nav class="curated-sources" aria-label="References for ${esc(experience.name)}">${experience.sources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a>`).join('')}</nav>
    </div>
  </article>`).join('');

/**
 * Two identical marquee halves — sliding one half's width loops seamlessly.
 * The band names the worlds and only the worlds: 00 is a door to another
 * entrance, not a destination in the band.
 */
export const tickerMarkup = (): string => {
  const half = LANES.filter((l) => l.kind === 'world')
    .map((l, i) => `${l.num} ${l.name} <i class="${i % 2 ? 'tick-dia' : 'tick-bolt'}"></i> `)
    .join('');
  return `<span>${half}</span><span>${half}</span>`;
};

/**
 * The closing call to action points at the first world, whichever that becomes.
 * `extraClass` carries whatever the static shell already declares (e.g. reveal
 * classes), so build-time filling never strips a behaviour the page opted into.
 */
export const bigCtaMarkup = (extraClass = ''): string => {
  const first = LANES.find((l) => l.kind === 'world');
  if (!first) return `<a class="big-cta${extraClass}"></a>`;
  return (
    `<a class="big-cta${extraClass}" href="${laneEntry(first)}">` +
    `First door — ${first.num} ${first.name} <span aria-hidden="true">&#8599;</span></a>`
  );
};
