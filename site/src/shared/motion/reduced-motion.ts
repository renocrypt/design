// One door for the motion preference, so every page and plugin asks the same
// question the same way. The hub's preloader and the lounge scene already
// honour it inline; anything new should ask here.

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
