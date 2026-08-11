// Hub scroll choreography — everything scroll-driven that CSS can't express.
//
// The split of labour, decided once and applied everywhere:
//   CSS view() timelines (shared/motion/reveal.css): one-shot entry reveals
//     for static blocks — man-card, bench cards, big-cta, footer.
//   HERE (GSAP + ScrollTrigger on the Lenis clock): scroll VELOCITY (the
//     marquee reacts to how fast you move), layered scrub (the poster's art
//     and copy part at different rates), and element-level stagger (cards,
//     rules) — the three things view() timelines don't do.
//
// Everything here is additive: nothing in CSS or HTML hides this content, so a
// JS failure leaves a fully readable page, and `reduced` skips it all.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initScroll } from '../shared/motion/scroll';

gsap.registerPlugin(ScrollTrigger);

// Leaving the poster: the WebGL art drifts up slower than the page while the
// copy lifts faster and dims. Two rates plus opacity is what reads as depth;
// one rate reads as "a thing is moving".
function heroParallax(): void {
  gsap.to('.poster-art', {
    yPercent: -16,
    ease: 'none',
    scrollTrigger: { trigger: '.poster', start: 'top top', end: 'bottom top', scrub: 0.5 },
  });
  gsap.to('.poster-copy', {
    yPercent: 26,
    autoAlpha: 0,
    ease: 'none',
    scrollTrigger: { trigger: '.poster', start: 'top top', end: '72% top', scrub: 0.5 },
  });
}

// The marquee listens to scroll VELOCITY: scrolling down spins it faster,
// scrolling up runs it backwards, and it settles back to cruise when you stop.
// The loop starts at progress 0.5 so reversing never exposes the seam at x=0 —
// the two halves are identical, every progress value is a valid frame.
function velocityTicker(): void {
  const track = document.querySelector<HTMLElement>('.ticker-track');
  if (!track) return;
  const loop = gsap.to(track, { xPercent: -50, duration: 26, ease: 'none', repeat: -1 });
  loop.progress(0.5);

  let settle: gsap.core.Tween | null = null;
  ScrollTrigger.create({
    onUpdate(self) {
      const v = self.getVelocity(); // px/s, signed with scroll direction
      const dir = v < 0 ? -1 : 1;
      settle?.kill();
      gsap.to(loop, {
        timeScale: dir * Math.min(1 + Math.abs(v) / 450, 5),
        duration: 0.25,
        ease: 'power1.out',
        overwrite: true,
      });
      // onUpdate stops firing when scrolling stops, so the decay back to
      // cruise speed has to be scheduled, not waited for.
      settle = gsap.delayedCall(0.35, () =>
        gsap.to(loop, { timeScale: dir, duration: 1.1, ease: 'power2.out' }),
      );
    },
  });
}

// Room cards arrive as one gesture — a staggered group per scroll batch, not
// five independent pops. once: entrance is an event, not a scrub.
function roomCards(): void {
  ScrollTrigger.batch('.room-card', {
    start: 'top 88%',
    once: true,
    onEnter: (batch) =>
      gsap.from(batch, { y: 56, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09 }),
  });
}

// House rules: the icon rows read as a checklist being dealt onto the shelf.
function rulesList(): void {
  gsap.from('.rules li', {
    scrollTrigger: { trigger: '.rules', start: 'top 85%', once: true },
    y: 26,
    autoAlpha: 0,
    duration: 0.6,
    ease: 'power2.out',
    stagger: 0.1,
  });
}

// In-page anchors ride the Lenis easing instead of the browser's jump, so
// "Pick a door" and "Back to top" feel like the same physical page the rest
// of the scroll does. '#top' has no element — it maps to scroll position 0.
function anchorScrolling(scrollTo: (target: string | number) => void): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href') ?? '';
      if (id.length < 2) return;
      e.preventDefault();
      scrollTo(id === '#top' ? 0 : id);
      history.replaceState(null, '', id);
    });
  });
}

export function initHubMotion(reduced: boolean): () => void {
  const scroll = initScroll({ smooth: !reduced });

  if (!reduced) {
    heroParallax();
    velocityTicker();
    roomCards();
    rulesList();
    anchorScrolling(scroll.scrollTo);
    // Late fonts and images shift what ScrollTrigger measured at init.
    addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }

  return () => scroll.destroy();
}
