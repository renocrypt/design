import '../../shared/reset.css';
import './world.css';
import gsap from 'gsap';
import { mountNoirScene } from './scene';

// Entrance per the measured lamalama vocabulary: word-split masked line-rise,
// power4/expo eases, 0.65s workhorse. Roll-over chips swap on hover.

function rollOvers(): void {
  document.querySelectorAll<HTMLElement>('[data-roll]').forEach((el) => {
    const a = el.querySelector('.roll-a');
    const b = el.querySelector('.roll-b');
    if (!a || !b) return;
    const tl = gsap
      .timeline({ paused: true, defaults: { duration: 0.45, ease: 'expo.out' } })
      .to(a, { yPercent: -100 }, 0)
      .to(b, { yPercent: -100 }, 0);
    el.addEventListener('mouseenter', () => tl.play());
    el.addEventListener('mouseleave', () => tl.reverse());
  });
}

function enter(): void {
  const host = document.querySelector<HTMLElement>('.scene');
  if (host) {
    try {
      mountNoirScene(host);
    } catch {
      // charcoal body stays — the statement still reads
    }
  }

  rollOvers();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap
    .timeline({ defaults: { ease: 'expo.out' } })
    .from('.word', { yPercent: 110, duration: 0.65, stagger: 0.08 }, 0.15)
    .from('.sub', { autoAlpha: 0, y: 14, duration: 0.65 }, 0.5)
    .from('.chip', { autoAlpha: 0, y: -10, duration: 0.45, stagger: 0.06 }, 0.35);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enter);
} else {
  enter();
}
