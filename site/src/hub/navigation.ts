/** Height is shared by the six doors; pointer and keyboard select the same state. */
export function initNavigation(): () => void {
  const events = new AbortController();
  const { signal } = events;
  document.querySelectorAll<HTMLElement>('.gates').forEach((nav) => {
    const gates = [...nav.querySelectorAll<HTMLAnchorElement>('.gate')];
    const expand = (selected: HTMLAnchorElement) => {
      gates.forEach((gate) => gate.classList.toggle('is-expanded', gate === selected));
    };
    gates.forEach((gate) => {
      gate.addEventListener('pointerenter', (event) => {
        // Touch links navigate on the first tap; there is no hover to emulate.
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') expand(gate);
      }, { signal });
      gate.addEventListener('focus', () => expand(gate), { signal });
    });
  });
  const trackOutbound = (event: MouseEvent) => {
    if (event.button > 1) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-outbound]');
    if (!link) return;
    // Tracking never delays navigation and is harmless when analytics is blocked.
    const analytics = window as Window & {
      gtag?: (command: string, event: string, params: Record<string, string | boolean>) => void;
    };
    analytics.gtag?.('event', 'outbound_navigation', {
      destination: link.dataset.outbound!,
      placement: link.dataset.placement!,
      link_url: link.href,
      outbound: true,
      transport_type: 'beacon',
    });
  };
  document.addEventListener('click', trackOutbound, { signal });
  document.addEventListener('auxclick', trackOutbound, { signal });
  return () => events.abort();
}
