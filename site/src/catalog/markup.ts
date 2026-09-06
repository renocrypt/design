// Pure HTML builders for the hub and curated collection.
// Content and navigation ship in the document, including for visitors and
// crawlers that do not execute browser JavaScript. Motion enhances that HTML.

import { CURATED, LANES, curatedEntry, laneEntry, type Lane } from './registry';

const esc = (s: string): string =>
  s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

/** All destinations share one resting size; the last door opens on first paint. */
export const gateMarkup = (lane: Lane, expanded = false): string =>
  `<a class="gate${expanded ? ' is-expanded' : ''}" href="${laneEntry(lane)}" style="background: ${lane.hue}" aria-label="${lane.num} ${esc(lane.name)}${lane.status === 'building' ? ', in progress' : ''}">` +
  `<span class="gate-no">${lane.num}</span>` +
  `<span class="gate-arrow" aria-hidden="true">&#8599;</span>` +
  `<span class="gate-name">${esc(lane.name)}${lane.status === 'building' ? '<small class="gate-status">In progress</small>' : ''}<small class="gate-kicker" aria-hidden="true">${esc(lane.kicker)}</small></span>` +
  `</a>`;

/** The full door set, in registry order — used by both the rail and the mobile menu. */
export const gatesMarkup = (): string => {
  const featured = LANES[LANES.length - 1];
  return LANES.map((lane) => gateMarkup(lane, lane === featured)).join('');
};

/** The utility tray stays separate from the six expanding destinations. */
export const utilitiesMarkup = (location: 'sidebar' | 'menu'): string => `
  <nav class="utility-links" aria-label="Elsewhere">
    <a class="utility-link" href="https://github.com/renocrypt/design" target="_blank" rel="noopener" data-outbound="github" data-placement="${location}" aria-label="View the source on GitHub (opens in a new tab)" title="Source on GitHub">
      <svg class="utility-github" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 26v-4c-5 1-6-2-7-4m7 4c-5-.6-7-3.1-7-7 0-2 .7-3.5 2-4.8-.5-1.5-.4-3.1.1-4.7 2.1 0 3.8 1 5.2 2a17 17 0 0 1 9.4 0c1.4-1 3.1-2 5.2-2 .5 1.6.6 3.2.1 4.7 1.3 1.3 2 2.8 2 4.8 0 3.9-2 6.4-7 7v4"/><path class="github-tail" d="M11 24c-5 1-5-4-8-4"/></svg>
      <span>GitHub</span>
    </a>
    <a class="utility-link" href="https://appautomaton.renocrypt.com/?utm_source=design.renocrypt.com&amp;utm_medium=referral&amp;utm_campaign=worlds" target="_blank" rel="noopener" data-outbound="appautomaton" data-placement="${location}" aria-label="Visit App Automaton (opens in a new tab)" title="App Automaton">
      <svg class="utility-globe" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="16" cy="16" r="12"/><ellipse class="globe-meridian" cx="16" cy="16" rx="5.5" ry="12"/><path d="M4 16h24M6 9.5c6 3 14 3 20 0M6 22.5c6-3 14-3 20 0"/></svg>
      <span>App Automaton</span>
    </a>
  </nav>`;

/** The reference's staggered media strip gives each world a distinct illustrated plate. */
export const roomsMarkup = (): string => {
  const worlds = LANES.filter((lane) => lane.kind === 'world');
  const cards = worlds.map((lane) =>
    `<a class="room-card" href="${laneEntry(lane)}" style="background: ${lane.hue}">` +
    `<div class="scene-art" data-illustration><!-- hub:art=${lane.art} --></div>` +
    `<div class="card-head"><h3 class="card-title">${esc(lane.name)}</h3><span class="card-no">${lane.num}</span></div>` +
    `<p class="card-kicker">${esc(lane.kicker)}${lane.status === 'building' ? '<small class="card-status">In progress</small>' : ''}</p>` +
    `<ul class="card-list">${lane.points.map((point) => `<li>${esc(point)}</li>`).join('')}</ul>` +
    `<span class="card-cta">${esc(lane.cta)} <span aria-hidden="true">↗</span></span></a>`,
  ).join('');
  const shelves = LANES.filter((lane) => lane.kind !== 'world').map((lane) =>
    `<a class="room-shelf" href="${laneEntry(lane)}" style="background: ${lane.hue}">` +
    `<div class="shelf-scene" data-illustration><!-- hub:art=${lane.art} --></div>` +
    `<div class="shelf-copy"><span class="shelf-number">${lane.num}</span><h3>${esc(lane.name)}</h3><p>${esc(lane.points[0])}</p>` +
    `<span class="card-cta">${esc(lane.cta)} <span aria-hidden="true">↗</span></span></div></a>`,
  ).join('');
  return `<div class="rooms-intro"><span class="tag">The worlds</span><h2>One door.<br />A different<br />point of view.</h2><p>Each world has its own atmosphere, its own pace, and a reason to look closer.</p>` +
    `<div class="room-controls" hidden><button type="button" class="room-prev" aria-label="Previous worlds" disabled>←</button><button type="button" class="room-next" aria-label="Next worlds">→</button></div></div>` +
    `<div class="room-strip" tabindex="0" aria-label="Worlds, scroll horizontally to explore">${cards}</div><div class="room-shelves">${shelves}</div>`;
};

/** The collection is readable and navigable before any browser JavaScript runs. */
export const curatedMarkup = (): string =>
  CURATED.map(
    (experience) => `
  <article class="curated-card" aria-labelledby="${experience.id}-title">
    <a class="curated-image" href="${curatedEntry(experience)}" aria-label="Curated ${experience.num} — Explore ${esc(experience.name)}">
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
  </article>`,
  ).join('');

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
