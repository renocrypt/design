import '../../shared/reset.css';
import './tokens.css';
import './world.css';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mountMasthead, type MastheadHandle } from './masthead';
import { mountStickers } from './stickers';
import { initPlates } from './plates';
import { mulberry32 } from '../../shared/rng';

gsap.registerPlugin(CustomEase, ScrollTrigger);
// THE bezier — the only ease in the room, 100% here (92/96 on the reference).
CustomEase.create('chrome', 'M0,0 C0.625,0.05 0,1 1,1');

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let masthead: MastheadHandle | null = null;

// ── Theme: lab-wide continuity via the shared key ──
function initTheme(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.theme-toggle');
  toggle?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'night' ? 'day' : 'night';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('hub-theme', next);
    masthead?.setTheme(next as 'day' | 'night');
  });
}

// ── Line-rise entrances: clip mask + translateY 110→0, THE bezier ──
function riseLines(scope: Element | Document, opts: { delay?: number; stagger?: number } = {}): void {
  const inners = scope.querySelectorAll('.line-inner');
  if (!inners.length) return;
  if (reduced) {
    gsap.from(inners, { autoAlpha: 0, duration: 0.3, stagger: 0.05 });
    return;
  }
  gsap.from(inners, {
    yPercent: 110,
    duration: 0.9,
    ease: 'chrome',
    stagger: opts.stagger ?? 0.09,
    delay: opts.delay ?? 0,
  });
}

function revealOnScroll(selector: string, threshold = 0.2): void {
  const els = document.querySelectorAll(selector);
  if (!els.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        riseLines(entry.target as Element);
      });
    },
    { threshold },
  );
  els.forEach((el) => io.observe(el));
}

// ── S3 — Foundry fan scrub over the 250vh runway ──
function initFan(): void {
  const cards = gsap.utils.toArray<HTMLElement>('.fcard');
  if (!cards.length) return;
  const mobile = matchMedia('(max-width: 820px)').matches;
  const spread = mobile ? 22 : 58;
  // Base fan pose — GSAP owns these transforms from the start.
  cards.forEach((card, i) => {
    gsap.set(card, {
      xPercent: (i - 1) * spread,
      y: i === 1 ? 0 : '2vh',
      rotation: (i - 1) * (mobile ? 2.5 : 4),
    });
  });
  if (reduced) return;
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.s3',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
    },
  });
  tl.from('.foundry-stage .line-inner', { yPercent: 110, duration: 0.15, ease: 'chrome' }, 0);
  cards.forEach((card, i) => {
    tl.from(
      card,
      { y: '+=160', z: -160, duration: 0.33, ease: 'chrome' },
      0.05 + i * 0.3,
    );
  });
}

// ── Stickers: the measured float grammar + specular sweep on hover ──
function initStickers(): void {
  const rnd = mulberry32(0x5eed02);
  document.querySelectorAll<HTMLElement>('.sticker').forEach((el) => {
    const band = 5 + rnd() * 7; // ±5–12° seeded band
    const period = 2 * band; // ±1°/s
    if (!reduced) {
      gsap.fromTo(
        el,
        { rotation: -band },
        { rotation: band, duration: period, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: -rnd() * period },
      );
      gsap.fromTo(
        el,
        { scale: 0.95 },
        { scale: 1.05, duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: -rnd() * 9 },
      );
    }
    const sweep = el.querySelector('[id^="sweep-"]');
    if (sweep) {
      el.addEventListener('mouseenter', () => {
        gsap.fromTo(
          sweep,
          { attr: { gradientTransform: 'translate(-1 0)' } },
          { attr: { gradientTransform: 'translate(1 0)' }, duration: 0.525, ease: 'chrome' },
        );
      });
    }
  });
}

// ── Plates: entrances, hover straighten, parent-layer parallax ──
async function initWall(): Promise<void> {
  const field = document.querySelector<HTMLElement>('.plate-field');
  if (!field) return;
  const plates = await initPlates(field);

  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      plates.forEach((p, i) => {
        if (reduced) {
          gsap.set(p.el, { rotation: p.rotation });
          return;
        }
        gsap.from(p.el, {
          y: 40,
          rotation: 0,
          autoAlpha: 0,
          duration: 0.9,
          ease: 'chrome',
          delay: i * 0.06,
          onComplete: () => gsap.set(p.el, { rotation: p.rotation, clearProps: 'autoAlpha' }),
        });
      });
    },
    { threshold: 0.2 },
  );
  io.observe(field);

  plates.forEach((p) => {
    p.el.addEventListener('mouseenter', () => {
      gsap.to(p.el, { rotation: 0, scale: 1.03, duration: 0.525, ease: 'chrome' });
    });
    p.el.addEventListener('mouseleave', () => {
      gsap.to(p.el, { rotation: p.rotation, scale: 1, duration: 0.525, ease: 'chrome' });
    });
  });

  if (!reduced && matchMedia('(min-width: 821px)').matches) {
    // Measured: translation lives on the parent layer, never on the floated element.
    gsap.to('.par-a', {
      y: -46,
      ease: 'none',
      scrollTrigger: { trigger: '.s2', start: 'top bottom', end: 'bottom top', scrub: 0.6 },
    });
    gsap.to('.par-b', {
      y: 46,
      ease: 'none',
      scrollTrigger: { trigger: '.s2', start: 'top bottom', end: 'bottom top', scrub: 0.6 },
    });
  }
}

async function boot(): Promise<void> {
  mountStickers();
  initTheme();
  initStickers();
  initFan();
  revealOnScroll('.s2, .s4, .s5');

  const wrap = document.querySelector<HTMLElement>('.masthead-wrap');
  const s1 = document.querySelector<HTMLElement>('.s1');
  if (wrap && s1) {
    const theme = document.documentElement.dataset.theme === 'night' ? 'night' : 'day';
    masthead = await mountMasthead(wrap, s1, theme).catch(() => null);
    // The pour leads; the copy rises behind it.
    riseLines(document.querySelector('.s1')!, { delay: reduced ? 0 : 0.55 });
    if (!reduced) {
      gsap.from('.s1 .eyebrow, .s1 .sub, .s1 .btn-row', {
        autoAlpha: 0,
        y: 14,
        duration: 0.525,
        ease: 'chrome',
        stagger: 0.09,
        delay: 0.7,
      });
    }
  }
  void initWall();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    masthead?.dispose();
    ScrollTrigger.getAll().forEach((st) => st.kill());
  });
}

boot();
