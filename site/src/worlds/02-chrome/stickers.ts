// Four hand-drawn metallic stickers — the foundry's seals.
// Every mark is our own path (zero stock); the canonical chrome ramp with its
// hard #232322 horizon does the metal. Each sticker carries a specular #sweep
// stripe that GSAP slides on hover (see main.ts).

const RAMP_STOPS = `
  <stop offset="0" stop-color="#fbfbf9" />
  <stop offset="0.2" stop-color="#d8d7d3" />
  <stop offset="0.46" stop-color="#8f8e8a" />
  <stop offset="0.54" stop-color="#232322" />
  <stop offset="0.6" stop-color="#c9c8c4" />
  <stop offset="0.82" stop-color="#efeeea" />
  <stop offset="1" stop-color="#fafaf8" />`;

function defs(id: string, rotate = 0): string {
  return `
  <defs>
    <linearGradient id="ramp-${id}" x1="0" y1="0" x2="0" y2="1" gradientTransform="rotate(${rotate} 0.5 0.5)">
      ${RAMP_STOPS}
    </linearGradient>
    <linearGradient id="sweep-${id}" x1="0" y1="0" x2="1" y2="0" gradientTransform="translate(-1 0)">
      <stop offset="0.42" stop-color="#ffffff" stop-opacity="0" />
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.85" />
      <stop offset="0.58" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
  </defs>`;
}

// One lobe of the asterisk, drawn once and rotated into place.
const AST_LOBE = 'M48 48 C44 34 45 22 48 14 C51 22 52 34 48 48 Z';

const STICKERS: Record<string, (id: string) => string> = {
  asterisk: (id) => `
    <svg viewBox="0 0 96 96" role="img">
      ${defs(id)}
      <g fill="url(#ramp-${id})">
        ${[0, 60, 120, 180, 240]
          .map((a) => `<path d="${AST_LOBE}" transform="rotate(${a} 48 48)" />`)
          .join('')}
        <!-- the 300° lobe is elongated, with the detached drip bead — the molten tell -->
        <path d="M48 48 C43.5 32 44.5 14 48 7 C51.5 14 52.5 32 48 48 Z" transform="rotate(300 48 48)" />
        <circle cx="48" cy="48" r="7" />
        <circle cx="76.4" cy="12.6" r="2.6" />
      </g>
      <g fill="url(#sweep-${id})" class="sweep-layer">
        ${[0, 60, 120, 180, 240].map((a) => `<path d="${AST_LOBE}" transform="rotate(${a} 48 48)" />`).join('')}
        <path d="M48 48 C43.5 32 44.5 14 48 7 C51.5 14 52.5 32 48 48 Z" transform="rotate(300 48 48)" />
        <circle cx="48" cy="48" r="7" />
      </g>
    </svg>`,

  ampersand: (id) => `
    <svg viewBox="0 0 96 96" role="img">
      ${defs(id, 8)}
      <!-- our own two-loop outline, never typeset: thick 12 / thin 3, tail with a hanging bead -->
      <path
        d="M60 84 C48 76 30 66 24 54 C18 43 22 32 31 30 C39 28 45 33 44 41 C43 49 34 52 29 49
           M52 66 C58 55 66 44 70 34 C73 26 70 18 62 18 C54 18 49 25 50 33 C51 42 60 46 66 42
           M52 66 C60 72 70 78 78 84"
        fill="none"
        stroke="url(#ramp-${id})"
        stroke-width="9"
        stroke-linecap="round"
      />
      <circle cx="79" cy="87" r="3.4" fill="url(#ramp-${id})" />
      <path
        d="M60 84 C48 76 30 66 24 54 C18 43 22 32 31 30 C39 28 45 33 44 41 C43 49 34 52 29 49
           M52 66 C58 55 66 44 70 34 C73 26 70 18 62 18 C54 18 49 25 50 33 C51 42 60 46 66 42
           M52 66 C60 72 70 78 78 84"
        fill="none"
        stroke="url(#sweep-${id})"
        stroke-width="9"
        stroke-linecap="round"
        class="sweep-layer"
      />
    </svg>`,

  ingot: (id) => `
    <svg viewBox="0 0 96 96" role="img">
      ${defs(id)}
      <polygon points="24,38 60,30 76,40 40,48" fill="url(#ramp-${id})" opacity="1" />
      <polygon points="24,38 40,48 40,66 24,56" fill="url(#ramp-${id})" opacity="0.72" />
      <polygon points="40,48 76,40 76,58 40,66" fill="url(#ramp-${id})" opacity="0.5" />
      <polygon class="sweep-layer" points="24,38 60,30 76,40 40,48" fill="url(#sweep-${id})" />
      <text x="48" y="61" font-family="Zodiak, Georgia, serif" font-size="9" fill="rgb(24 24 24 / 60%)" text-anchor="middle">02</text>
    </svg>`,

  drop: (id) => `
    <svg viewBox="0 0 96 96" role="img">
      ${defs(id)}
      <path d="M48 18 C58 32 70 46 70 62 A22 22 0 1 1 26 62 C26 46 38 32 48 18 Z" fill="url(#ramp-${id})" />
      <path class="sweep-layer" d="M48 18 C58 32 70 46 70 62 A22 22 0 1 1 26 62 C26 46 38 32 48 18 Z" fill="url(#sweep-${id})" />
      <rect x="38" y="40" width="4" height="18" rx="2" fill="#ffffff" opacity="0.85" transform="rotate(-22 40 49)" />
      <ellipse cx="48" cy="88" rx="14" ry="3" fill="none" stroke="rgb(24 24 24 / 25%)" stroke-width="1.5" />
    </svg>`,
};

export function mountStickers(): void {
  document.querySelectorAll<HTMLElement>('.sticker[data-sticker]').forEach((host) => {
    const kind = host.dataset.sticker ?? '';
    const make = STICKERS[kind];
    if (make) host.innerHTML = make(kind);
  });
}
