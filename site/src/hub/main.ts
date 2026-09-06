import '../shared/reset.css';
import '../shared/motion/reveal.css';
import './fonts.css';
import './tokens.css';
import './hub.css';
import gsap from 'gsap';
import { initHubMotion } from './motion';
import { initNavigation } from './navigation';
import { initIllustrations } from './illustrations';
import type { LoungeHandle } from './lounge/scene';

const events = new AbortController();
const { signal } = events;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const animation = gsap.context(() => {});
const media = gsap.matchMedia();
let lounge: LoungeHandle | null = null;
let mounting = false, paused = false, menuOpen = false;
const host = document.querySelector<HTMLElement>('.poster-art')!;
const pauseButton = document.querySelector<HTMLButtonElement>('.hero-motion')!;
const themeButton = document.querySelector<HTMLButtonElement>('.theme-toggle')!;
const syncPaused = () => lounge?.setPaused(paused || menuOpen || reduced.matches);

// The page and the two lighting atlases respond to the same appearance control.
const syncTheme = () => {
  const night = document.documentElement.dataset.theme === 'night';
  themeButton.setAttribute('aria-label', `Switch to ${night ? 'day' : 'night'} appearance`);
  themeButton.setAttribute('aria-pressed', String(night));
  lounge?.setTheme(night, !reduced.matches);
};
syncTheme();
themeButton.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'night' ? 'day' : 'night';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('hub-theme', next); } catch { /* Appearance works without storage. */ }
  syncTheme();
}, { signal });
pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.setAttribute('aria-pressed', String(paused));
  pauseButton.textContent = paused ? 'Resume motion ▷' : 'Pause motion Ⅱ';
  syncPaused();
}, { signal });
host.addEventListener('lounge-still', () => { pauseButton.hidden = true; }, { signal });
host.addEventListener('lounge-unavailable', () => { pauseButton.hidden = true; }, { signal });
host.addEventListener('lounge-available', () => { pauseButton.hidden = false; }, { signal });

async function mountArt(): Promise<void> {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (lounge || mounting || signal.aborted || reduced.matches || connection?.saveData) return;
  mounting = true;
  try {
    const { mountLounge } = await import('./lounge/scene');
    if (signal.aborted || reduced.matches) return;
    lounge = await mountLounge(host, signal);
    if (lounge) { lounge.setTheme(document.documentElement.dataset.theme === 'night', false); pauseButton.hidden = false; syncPaused(); }
  } catch {
    host.dataset.ready = 'false';
    host.dataset.mode = 'fallback';
    host.querySelector('canvas')?.remove();
  } finally { mounting = false; }
}
const artObserver = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) { void mountArt(); artObserver.disconnect(); }
});
requestAnimationFrame(() => { if (!signal.aborted) artObserver.observe(host); });
reduced.addEventListener('change', () => {
  if (reduced.matches) { lounge?.dispose(); lounge = null; pauseButton.hidden = true; }
  else void mountArt();
}, { signal });

// The overlay keeps focus on its navigation and releases the page on resize.
const menu = document.querySelector<HTMLElement>('.menu')!;
const menuButton = document.querySelector<HTMLButtonElement>('.menu-btn')!;
const hub = document.querySelector<HTMLElement>('.hub')!;
menu.inert = true;
const setMenu = (open: boolean, immediate = false) => {
  menuOpen = open;
  menuButton.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.setAttribute('aria-hidden', String(!open));
  menu.inert = !open; hub.inert = open;
  document.body.classList.toggle('menu-open', open);
  syncPaused();
  gsap.killTweensOf(menu);
  const duration = reduced.matches || immediate ? 0 : .4;
  if (open) {
    animation.add(() => {
      gsap.set(menu, { visibility: 'visible' });
      gsap.fromTo(menu, { yPercent: -102 }, { yPercent: 0, duration, ease: 'power3.inOut' });
    });
  } else {
    animation.add(() => gsap.to(menu, { yPercent: -102, duration, ease: 'power3.inOut', onComplete: () => gsap.set(menu, { visibility: 'hidden' }) }));
  }
};
menuButton.addEventListener('click', () => setMenu(!menuOpen), { signal });
menu.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('a')) setMenu(false);
}, { signal });
const desktop = matchMedia('(min-width: 761px)');
desktop.addEventListener('change', () => { if (desktop.matches && menuOpen) setMenu(false, true); }, { signal });
document.addEventListener('keydown', (event) => {
  if (!menuOpen) return;
  if (event.key === 'Escape') { setMenu(false); menuButton.focus(); }
  if (event.key === 'Tab') {
    const last = [...menu.querySelectorAll<HTMLAnchorElement>('a[href]')].at(-1)!;
    if (event.shiftKey && document.activeElement === menuButton) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); menuButton.focus(); }
  }
}, { signal });

const disposeNavigation = initNavigation();
const disposeIllustrations = initIllustrations();
let disposeMotion = initHubMotion(reduced.matches);
reduced.addEventListener('change', () => { disposeMotion(); disposeMotion = initHubMotion(reduced.matches); }, { signal });
const lines = [...document.querySelectorAll<HTMLElement>('.hero-line')].map((line) => {
  if (line.firstElementChild?.classList.contains('split-inner')) return line.firstElementChild;
  const inner = document.createElement('span'); inner.className = 'split-inner';
  inner.append(...line.childNodes); line.append(inner); return inner;
});
media.add('(prefers-reduced-motion: no-preference)', () => {
  const intro = () => {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from(lines, { yPercent: 110, duration: .85, stagger: .08 }, 0)
      .from('.poster-sub, .poster-cta', { y: 14, autoAlpha: 0, duration: .65, stagger: .12 }, .25)
      .from('.rail .gate', { x: -12, autoAlpha: 0, duration: .4, stagger: .04 }, .15);
  };
  const preloader = document.querySelector<HTMLElement>('.preloader');
  let seen = false;
  try { seen = Boolean(sessionStorage.getItem('hub-seen')); sessionStorage.setItem('hub-seen', '1'); } catch { seen = true; }
  if (preloader && !seen) {
    gsap.timeline({ onComplete: () => { preloader.remove(); intro(); } })
      .from('.pre-shape', { scale: 0, duration: .3, stagger: .07, ease: 'back.out(1.6)' })
      .to(preloader, { yPercent: -100, duration: .5, ease: 'power3.inOut' }, '+=.1');
  } else { preloader?.remove(); intro(); }
});
if (reduced.matches) document.querySelector('.preloader')?.remove();

if (import.meta.hot) import.meta.hot.dispose(() => {
  events.abort(); artObserver.disconnect(); lounge?.dispose(); media.revert(); animation.revert();
  disposeNavigation(); disposeIllustrations(); disposeMotion();
  document.body.classList.remove('menu-open'); hub.inert = false;
});
