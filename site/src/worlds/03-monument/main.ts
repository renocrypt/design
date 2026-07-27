import '../../shared/reset.css';
import './tokens.css';
import './world.css';
import gsap from 'gsap';
import { generatePosters, generatePoster, type Poster } from './posters';
import { mountGallery, formationIndex, FORMATION_LABELS, type GalleryHandle } from './gallery';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const smallViewport = matchMedia('(max-width: 1199px)').matches;

// ── Virtual scroll: one translating strip, wheel Δ·0.002, lerp 0.1 ──
const vstate = { target: 0, current: 0 };
const V_MAX = 10; // hero 1 + hall 6 + index 2 + colophon 1

function clampV(v: number): number {
  return Math.min(V_MAX, Math.max(0, v));
}

// ── Clock: its own 1Hz interval — museums don't blink, tab-pause never freezes it ──
function initClock(): void {
  const el = document.querySelector<HTMLElement>('.clock');
  if (!el) return;
  const tick = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    el.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} — LOCAL`;
  };
  tick();
  setInterval(tick, 1000);
}

// ── Theme toggle: the gallery blackout ──
function initToggle(gallery: GalleryHandle | null): void {
  const btn = document.querySelector<HTMLButtonElement>('.toggle');
  if (!btn) return;
  const sync = () => {
    const night = document.documentElement.dataset.theme === 'night';
    btn.setAttribute('aria-pressed', String(night));
    btn.querySelector('.t-word--white')?.classList.toggle('is-active', !night);
    btn.querySelector('.t-word--night')?.classList.toggle('is-active', night);
  };
  sync();
  let busy = false;
  btn.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    const next = document.documentElement.dataset.theme === 'night' ? 'day' : 'night';
    const flip = () => {
      document.documentElement.dataset.theme = next;
      localStorage.setItem('hub-theme', next);
      gallery?.setTheme(next as 'day' | 'night');
      sync();
    };
    if (reduced) {
      flip();
      busy = false;
      return;
    }
    const tl = gsap.timeline({ onComplete: () => (busy = false) });
    tl.to('.bo-curtain--top', { y: 0, duration: 0.75, ease: 'power4.inOut' }, 0)
      .to('.bo-curtain--bottom', { y: 0, duration: 0.75, ease: 'power4.inOut' }, 0)
      .add(flip)
      .to('.bo-curtain--top', { y: '-101%', duration: 0.9, ease: 'expo.inOut' }, '+=0.05')
      .to('.bo-curtain--bottom', { y: '101%', duration: 0.9, ease: 'expo.inOut' }, '<');
  });
}

// ── Drawn-arrow redraw on hover (draw-on 0.5s power2.out) ──
function initArrowHover(): void {
  document.querySelectorAll<HTMLElement>('.back-link').forEach((link) => {
    const path = link.querySelector('path');
    if (!path) return;
    const len = path.getTotalLength();
    link.addEventListener('mouseenter', () => {
      if (reduced) return;
      gsap.fromTo(
        path,
        { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' },
      );
    });
  });
}

// ── Formation label swaps at stage boundaries ──
function initFormationLabel(): (fi: number, visible: boolean) => void {
  const el = document.querySelector<HTMLElement>('#formation-label');
  let current = -1;
  let visibleNow = false;
  return (fi: number, visible: boolean) => {
    if (!el) return;
    if (fi === current && visible === visibleNow) return;
    const swap = () => {
      el.textContent = visible ? FORMATION_LABELS[fi] : '';
      if (visible && !reduced) gsap.from(el, { autoAlpha: 0, y: 8, duration: 0.8, ease: 'expo.out' });
    };
    current = fi;
    visibleNow = visible;
    if (reduced) swap();
    else if (el.textContent) gsap.to(el, { autoAlpha: 0, y: -8, duration: 0.4, ease: 'power2.in', onComplete: swap });
    else swap();
  };
}

// ── The Index: 32 rows from the posters' own curatorial data ──
function buildIndex(posters: Poster[], jump: (k: number) => void): void {
  const table = document.querySelector<HTMLElement>('#index-table');
  if (!table) return;
  const f = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
  posters.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'irow';
    const [x, y, z] = p.seat;
    row.innerHTML = `
      <span class="c-no">${String(p.index + 1).padStart(2, '0')}</span>
      <span class="c-seed">${p.seed}</span>
      <span class="c-pal">${p.paletteName}</span>
      <span class="c-seat">( ${f(x)}, ${f(y)}, ${f(z)} )</span>`;
    const view = document.createElement('button');
    view.className = 'c-view';
    view.type = 'button';
    view.textContent = 'VIEW';
    view.addEventListener('click', () => jump(p.index));
    row.append(view);
    table.append(row);
  });
}

// ── Rung-2: the DOM strip of the same posters ──
function buildRung2(posters: Poster[]): void {
  const host = document.createElement('div');
  host.className = 'rung2';
  const track = document.createElement('div');
  track.className = 'rung2-track';
  posters.forEach((p) => track.append(p.canvas));
  host.append(track);
  document.body.append(host);
}

// ── Preloader: the honest counter ──
async function boot(): Promise<void> {
  const count = document.querySelector<HTMLElement>('.pre-count');
  const setCount = (n: number) => {
    if (count) count.textContent = `${n} / 100`;
  };

  // The Gift Shop path (<1200px): one poster, zero WebGL.
  if (smallViewport) {
    setCount(20);
    await document.fonts.ready;
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const idx = dayOfYear % 32;
    const poster = generatePoster(idx);
    const pc = document.querySelector<HTMLCanvasElement>('#postcard-canvas');
    pc?.getContext('2d')?.drawImage(poster.canvas, 0, 0, 256, 362);
    const cap = document.querySelector<HTMLElement>('#postcard-caption');
    if (cap) cap.textContent = `EXHIBIT ${String(idx + 1).padStart(2, '0')} — SEED ${poster.seed}`;
    setCount(100);
    document.querySelector('.preloader')?.remove();
    document.querySelector('#plinth')?.remove();
    initClock();
    initToggle(null);
    initArrowHover();
    return;
  }

  // 0–20: the face.
  await Promise.all([document.fonts.load('400 620px "League Gothic"'), document.fonts.load('400 18px "League Gothic"')]);
  setCount(20);

  // 20–84: poster generation, 2 pts each.
  const posters = await generatePosters((done) => setCount(20 + done * 2));

  // 84–100: textures + gallery init (rung-2 if no usable context).
  const holder = document.querySelector<HTMLElement>('#gl-holder');
  let gallery: GalleryHandle | null = null;
  if (holder) {
    gallery = mountGallery(holder, posters, document.documentElement.dataset.theme === 'night' ? 'night' : 'day');
    setCount(100);
  }
  if (!gallery) buildRung2(posters);
  document.querySelector('#plinth')?.remove();

  // Part the curtains; corner UI enters after.
  const tl = gsap.timeline();
  if (reduced) {
    document.querySelector('.preloader')?.remove();
  } else {
    tl.to('.pre-curtain--top', { yPercent: -101, duration: 1.2, ease: 'expo.inOut' }, 0)
      .to('.pre-curtain--bottom', { yPercent: 101, duration: 1.2, ease: 'expo.inOut' }, 0)
      .to('.pre-line, .pre-count', { opacity: 0, duration: 0.3 }, 0)
      .add(() => document.querySelector('.preloader')?.remove());
  }

  initClock();
  initToggle(gallery);
  initArrowHover();

  // Hero entrance: hairlines draw, then the monument wipes in.
  if (!reduced) {
    tl.from('.hero-stack .hairline', { scaleX: 0, duration: 1.0, ease: 'expo.out', stagger: 0.08 }, 1.1)
      .from(
        '.hero-line',
        { clipPath: 'inset(0 100% 0 0)', duration: 0.5, ease: 'power2.out', stagger: 0.08 },
        1.4,
      )
      .from('.hero-util', { autoAlpha: 0, duration: 0.8, ease: 'expo.out' }, 1.9)
      .from('.corner, .caption', { autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.12 }, 1.6);
  }

  // Index rows + VIEW jumps.
  const jump = (k: number) => {
    vstate.target = 6.5 + (k - 15.5) / 31; // the 0.1 lerp IS the transition
  };
  buildIndex(posters, jump);
  gallery && (gallery.onPick = jump);

  const setLabel = initFormationLabel();
  const strip = document.querySelector<HTMLElement>('#strip');
  const caption = document.querySelector<HTMLElement>('#hall-caption');
  const canvasEl = holder?.querySelector('canvas');

  // ── Virtual scroll input ──
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    vstate.target = clampV(vstate.target + e.deltaY * 0.002);
  };
  addEventListener('wheel', onWheel, { passive: false });
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === ' ') vstate.target = clampV(vstate.target + 0.35);
    if (e.key === 'ArrowUp') vstate.target = clampV(vstate.target - 0.35);
    if (e.key === 'PageDown') vstate.target = clampV(vstate.target + 1);
    if (e.key === 'PageUp') vstate.target = clampV(vstate.target - 1);
  });
  let touchY = 0;
  addEventListener('touchstart', (e) => (touchY = e.touches[0].clientY), { passive: true });
  addEventListener(
    'touchmove',
    (e) => {
      const y = e.touches[0].clientY;
      vstate.target = clampV(vstate.target + (touchY - y) * 0.004);
      touchY = y;
    },
    { passive: true },
  );

  // ── The scroll loop: lerp, translate, dissolve, labels ──
  const tick = () => {
    vstate.current += (vstate.target - vstate.current) * 0.1;
    const v = vstate.current;
    strip?.style.setProperty('transform', `translateY(${-v * 100}dvh)`);
    gallery?.setV(v, reduced);

    // Canvas dissolves as The Index arrives.
    const dissolve = 1 - gsap.utils.clamp(0, 1, (v - 6.8) / 0.4);
    if (canvasEl) canvasEl.style.opacity = String(dissolve);
    const rung2 = document.querySelector<HTMLElement>('.rung2');
    if (rung2) rung2.style.opacity = String(dissolve);
    gallery?.setActive(dissolve > 0.02 && !document.hidden);

    // Hall caption + formation label (the closure dedupes fi/visible).
    const inHall = v >= 0.8 && v < 6.8;
    if (caption) caption.style.opacity = inHall ? '1' : '0';
    const t = gsap.utils.clamp(0, 1, (v - 1) / 5);
    setLabel(formationIndex(t), inHall);
    requestAnimationFrame(tick);
  };
  tick();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    // The gallery handle lives inside boot()'s scope; full teardown on HMR
    // happens via page reload for this world (context-leak guard first).
  });
}

boot();
