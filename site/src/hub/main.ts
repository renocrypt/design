import '../shared/reset.css';
import '../shared/motion/reveal.css';
import './fonts.css';
import './tokens.css';
import './hub.css';
import gsap from 'gsap';
import { mountSundial, type SundialHandle } from './sundial/scene';
import { initHubMotion } from './motion';

// ── Doors, cards, marquee, CTA: stamped into index.html AT BUILD TIME from
// the lane registry (tools/vite-plugin-static-hub.ts + src/worlds/lane-markup.ts).
// They used to be appended here at runtime, but AI crawlers don't execute JS —
// the site's substance has to exist in the served HTML. What remains in this
// file is everything that genuinely needs a browser: glyph stamping, hover
// physics, the menu, the preloader, the WebGL poster and scroll motion.

// ── Mobile menu: the toy box as an overlay ──
function initMenu(reduced: boolean): void {
  const btn = document.querySelector<HTMLButtonElement>('.menu-btn');
  const menu = document.querySelector<HTMLElement>('.menu');
  if (!btn || !menu) return;
  let open = false;
  const D = (s: number) => (reduced ? 0 : s);
  const setOpen = (v: boolean) => {
    open = v;
    btn.classList.toggle('is-open', v);
    btn.setAttribute('aria-expanded', String(v));
    menu.setAttribute('aria-hidden', String(!v));
    document.body.classList.toggle('menu-open', v);
    if (v) {
      gsap.set(menu, { visibility: 'visible' });
      gsap.fromTo(menu, { yPercent: -102 }, { yPercent: 0, duration: D(0.55), ease: 'power3.inOut' });
      gsap.fromTo(
        menu.querySelectorAll('.gate, .menu-foot'),
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: D(0.4), ease: 'power2.out', stagger: reduced ? 0 : 0.05, delay: D(0.18) },
      );
    } else {
      gsap.to(menu, {
        yPercent: -102,
        duration: D(0.45),
        ease: 'power3.inOut',
        onComplete: () => gsap.set(menu, { visibility: 'hidden' }),
      });
    }
  };
  btn.addEventListener('click', () => setOpen(!open));
  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) setOpen(false);
  });
}

// Pixel glyphs — the "what defines us" grammar, drawn not downloaded.
// Bitmaps are ASCII art so future agents can add a glyph by drawing one.
const GLYPHS: Record<string, string[]> = {
  crescent: [
    '...XXXX...',
    '..XXXXXX..',
    '..XXXXX...',
    '.XXXX.....',
    '.XXXX.....',
    '.XXXX.....',
    '.XXXX.....',
    '..XXXXX...',
    '..XXXXXX..',
    '...XXXX...',
  ],
  droplet: [
    '....XX....',
    '...XXXX...',
    '...XXXX...',
    '..XXXXXX..',
    '..XXXXXX..',
    '.XXXXXXXX.',
    '.XXXXXXXX.',
    '.XXXXXXXX.',
    '..XXXXXX..',
    '...XXXX...',
  ],
  monolith: [
    '...XXXX...',
    '..XXXXXX..',
    '..XXXXXX..',
    '..XXXXXX..',
    '..XXXXXX..',
    '..XXXXXX..',
    '..XXXXXX..',
    '..XXXXXX..',
    '.XXXXXXXX.',
    '.XXXXXXXX.',
  ],
  heart: [
    '..........',
    '.XXX..XXX.',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
    '.XXXXXXXX.',
    '..XXXXXX..',
    '...XXXX...',
    '....XX....',
    '..........',
  ],
  // 00 Lab — four stacked slabs: the studies, seen edge-on.
  stack: [
    '..........',
    '.XXXXXXXX.',
    '.XXXXXXXX.',
    '..........',
    '.XXXXXXXX.',
    '.XXXXXXXX.',
    '..........',
    '.XXXXXXXX.',
    '.XXXXXXXX.',
    '..........',
  ],
  sun: [
    '...XXXX...',
    '.XXXXXXXX.',
    '.XXXXXXXX.',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
    '.XXXXXXXX.',
    '.XXXXXXXX.',
    '...XXXX...',
  ],
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function stampPixels(): void {
  document.querySelectorAll<SVGSVGElement>('svg.pix').forEach((svg) => {
    const rows = GLYPHS[svg.dataset.glyph ?? ''];
    if (!rows) return;
    const big = svg.classList.contains('pix--big');
    const fill = big ? '#ffb200' : '#0e0d0b'; // amber sun on cobalt; ink elsewhere
    const gridColor = big ? '#f4ebe0' : '#0e0d0b';
    rows.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell !== 'X') return;
        const r = document.createElementNS(SVG_NS, 'rect');
        r.setAttribute('x', String(x * 10));
        r.setAttribute('y', String(y * 10));
        r.setAttribute('width', '10');
        r.setAttribute('height', '10');
        r.setAttribute('fill', fill);
        svg.append(r);
      });
    });
    // Graph-paper lines run OVER the blocks, exactly like the reference cards.
    let d = '';
    for (let i = 0; i <= 10; i++) d += `M${i * 10} 0V100M0 ${i * 10}H100`;
    const grid = document.createElementNS(SVG_NS, 'path');
    grid.setAttribute('d', d);
    grid.setAttribute('stroke', gridColor);
    grid.setAttribute('stroke-width', '1');
    grid.setAttribute('opacity', '0.3');
    grid.setAttribute('fill', 'none');
    svg.append(grid);
  });
}

function wrapHeroLines(): HTMLElement[] {
  const lines = Array.from(document.querySelectorAll<HTMLElement>('.hero-line'));
  return lines.map((line) => {
    const inner = document.createElement('span');
    inner.className = 'split-inner';
    inner.append(...line.childNodes);
    line.append(inner);
    return inner;
  });
}

let sundial: SundialHandle | null = null;

function mountPosterScene(): void {
  const host = document.querySelector<HTMLElement>('.poster-art');
  if (!host) return;
  try {
    sundial = mountSundial(host);
  } catch {
    // No WebGL: the CSS mini-solstice painted on .poster-art is the fallback;
    // keep the toggle working against the DOM theme.
    document.documentElement.dataset.theme =
      localStorage.getItem('hub-theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day');
  }
  const toggle = document.querySelector<HTMLButtonElement>('.theme-toggle');
  toggle?.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme === 'night' ? 'night' : 'day';
    const next = cur === 'night' ? 'day' : 'night';
    if (sundial) {
      sundial.setTheme(next, true);
    } else {
      document.documentElement.dataset.theme = next;
      localStorage.setItem('hub-theme', next);
    }
  });
}

// Vite HMR re-runs this module; without disposal each reload leaks a WebGL
// context (and a Lenis/ScrollTrigger loop) until the browser refuses more.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    sundial?.dispose();
    disposeMotion?.();
  });
}

function hoverLift(selector: string, vars: gsap.TweenVars): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const over = gsap.to(el, { ...vars, duration: 0.35, ease: 'power3.out', paused: true });
    el.addEventListener('mouseenter', () => over.play());
    el.addEventListener('mouseleave', () => over.reverse());
  });
}

// Preloader: five stamps, a mark, a wipe — short and punchy on purpose
// (the pole's intro overstays; ours is out of the way in ~1.6s, and skipped
// entirely on repeat visits this session).
function preload(done: () => void, reduced: boolean): void {
  const el = document.querySelector<HTMLElement>('.preloader');
  if (!el) {
    done();
    return;
  }
  if (reduced || sessionStorage.getItem('hub-seen')) {
    el.remove();
    done();
    return;
  }
  sessionStorage.setItem('hub-seen', '1');
  const tl = gsap.timeline({
    onComplete: () => {
      el.remove();
      done();
    },
  });
  tl.from('.pre-shape', {
    scale: 0,
    rotate: -14,
    duration: 0.45,
    ease: 'back.out(1.8)',
    stagger: 0.08,
  })
    .from('.pre-mark', { autoAlpha: 0, y: 14, duration: 0.35, ease: 'power2.out' }, 0.35)
    .to(el, { yPercent: -100, duration: 0.6, ease: 'power3.inOut' }, '+=0.3');
}

let disposeMotion: (() => void) | null = null;

function enter(): void {
  const heroInners = wrapHeroLines();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  stampPixels(); // the cards' glyph SVGs ship empty; pixels are enhancement
  initMenu(reduced);
  mountPosterScene();
  disposeMotion = initHubMotion(reduced);

  const playIntro = () => {
    if (reduced) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.poster', { autoAlpha: 0, scale: 0.985, duration: 0.8 }, 0)
      .from(heroInners, { yPercent: 110, duration: 0.9, stagger: 0.09 }, 0.25)
      .from('.poster-sub', { autoAlpha: 0, y: 16, duration: 0.6 }, 0.6)
      .from('.poster-cta', { autoAlpha: 0, y: 12, duration: 0.5 }, 0.75)
      .from('.gate', { autoAlpha: 0, x: -18, duration: 0.5, stagger: 0.06 }, 0.35)
      .add(() => {
        hoverLift('.gate', { scale: 1.04, rotate: -0.6 });
        hoverLift('.room-card', { y: -6, rotate: 0.4 });
        hoverLift('.bench-card', { y: -6 });
      });
  };

  preload(playIntro, reduced);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enter);
} else {
  enter();
}
