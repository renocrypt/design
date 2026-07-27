/* Lab switcher — the return path out of the archive.
 *
 * Each study already carries its own hand-authored <nav> between the four
 * directions, so this script owns exactly one job the pages cannot do for
 * themselves: link back to the entrance that now sits above them at "/".
 * It was referenced by s1/s2/s4 and missing from the repo (a live 404) until
 * the archive moved under /lab/ — restored here, with the one job it needs.
 *
 * Vanilla, no build step: everything under /lab/ is served verbatim by Vite's
 * public/ passthrough, exactly as it was authored in 2026-07.
 */
(() => {
  const HOME = '/';
  const a = document.createElement('a');
  a.href = HOME;
  a.id = 'lab-exit';
  a.setAttribute('aria-label', 'Back to the worlds entrance');
  a.innerHTML = '<span aria-hidden="true">&#8592;</span> worlds';

  const css = document.createElement('style');
  css.textContent = `
    #lab-exit {
      position: fixed;
      left: 1.1rem;
      bottom: 1.1rem;
      z-index: 999;
      display: inline-flex;
      align-items: center;
      gap: .5rem;
      padding: .5rem .9rem;
      border: 1px solid rgba(232, 228, 216, .28);
      border-radius: 999px;
      background: rgba(8, 9, 11, .62);
      backdrop-filter: blur(6px);
      color: #e8e4d8;
      font: 500 .68rem/1 ui-monospace, "JetBrains Mono", monospace;
      letter-spacing: .14em;
      text-transform: uppercase;
      text-decoration: none;
      transition: border-color .25s, color .25s;
    }
    #lab-exit:hover { border-color: #62e6c8; color: #62e6c8; }
    @media (max-width: 640px) { #lab-exit { left: .7rem; bottom: .7rem; } }
  `;

  const mount = () => {
    document.head.append(css);
    document.body.append(a);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
