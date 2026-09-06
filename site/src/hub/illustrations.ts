/** Motion belongs to the drawn subject and runs only while its plate is visible. */
export function initIllustrations(): () => void {
  const events = new AbortController();
  const { signal } = events;
  const visible = new Set<Element>();
  const apply = () => visible.forEach((element) => element.classList.toggle('is-visible', !document.hidden));
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else { visible.delete(entry.target); entry.target.classList.remove('is-visible'); }
    }
    apply();
  }, { threshold: .12 });
  document.querySelectorAll('[data-illustration]').forEach((element) => observer.observe(element));
  document.addEventListener('visibilitychange', apply, { signal });

  const strip = document.querySelector<HTMLElement>('.room-strip');
  const controls = document.querySelector<HTMLElement>('.room-controls');
  let sizing: ResizeObserver | null = null;
  if (strip && controls) {
    const previous = controls.querySelector<HTMLButtonElement>('.room-prev')!;
    const next = controls.querySelector<HTMLButtonElement>('.room-next')!;
    const update = () => {
      previous.disabled = strip.scrollLeft < 2;
      next.disabled = strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 2;
    };
    const advance = (direction: number) => {
      const card = strip.querySelector<HTMLElement>('.room-card')!;
      const gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
      strip.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    previous.addEventListener('click', () => advance(-1), { signal });
    next.addEventListener('click', () => advance(1), { signal });
    strip.addEventListener('scroll', update, { passive: true, signal });
    sizing = new ResizeObserver(update); sizing.observe(strip);
    controls.hidden = false;
    update();
  }
  return () => { events.abort(); observer.disconnect(); sizing?.disconnect(); visible.forEach((element) => element.classList.remove('is-visible')); };
}
