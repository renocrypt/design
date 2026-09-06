// The page's single scroll-motion clock (2026 architecture rule: ONE rAF loop).
//
// Lenis eases the scroll itself; ScrollTrigger reads it. The two must share a
// heartbeat — Lenis driven by gsap.ticker, ScrollTrigger updated on every Lenis
// frame — or scrubbed animations stutter while the page glides. This module is
// the only place that wiring exists; pages call initScroll() and receive a
// handle, never their own loop.
//
// Reduced motion: no Lenis at all. Native scroll stays native, ScrollTrigger
// still fires so content states resolve, and callers branch on their own
// `reduced` flag for anything decorative.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { prefersReducedMotion } from './reduced-motion';

gsap.registerPlugin(ScrollTrigger);

export interface ScrollHandle {
  /** null when smooth scrolling is off (reduced motion or caller's choice). */
  lenis: Lenis | null;
  /** Lenis-eased when available, instant native otherwise. '#top' safe-maps to 0. */
  scrollTo: (target: string | number) => void;
  /** Re-measure after layout settles (fonts, late images, preloader removal). */
  refresh: () => void;
  /** Kill the loop and every trigger — HMR disposal depends on this. */
  destroy: () => void;
}

let current: ScrollHandle | null = null;

export function initScroll({ smooth = true }: { smooth?: boolean } = {}): ScrollHandle {
  if (current) return current;

  let lenis: Lenis | null = null;
  const tick = (time: number) => lenis?.raf(time * 1000);
  if (smooth && !prefersReducedMotion()) {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }

  current = {
    lenis,
    scrollTo: (target) => {
      if (lenis) {
        lenis.scrollTo(target as string);
      } else if (typeof target === 'number') {
        window.scrollTo(0, target);
      } else {
        document.querySelector(target)?.scrollIntoView();
      }
    },
    refresh: () => ScrollTrigger.refresh(),
    destroy: () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      current = null;
    },
  };
  return current;
}
