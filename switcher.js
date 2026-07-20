/* Direction switcher — fixed bottom pill; jumps + arrow keys. Include once per page. */
(() => {
  const items = [
    { href: "/r1-proof-sheet.html", label: "R1 · Proof Sheet" },
    { href: "/r2-signal-cabinet.html", label: "R2 · Signal Cabinet" },
  ];
  const here = location.pathname;
  const idx = items.findIndex((i) => here.endsWith(i.href));
  const bar = document.createElement("nav");
  bar.setAttribute("aria-label", "Direction switcher");
  bar.style.cssText = `position:fixed;left:50%;bottom:1.1rem;transform:translateX(-50%);z-index:9999;
    display:flex;align-items:center;gap:.35rem;padding:.4rem .55rem;border-radius:999px;
    background:rgba(12,12,14,.82);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.12);
    font:500 11px/1 ui-monospace,monospace;letter-spacing:.08em;color:#ddd;box-shadow:0 8px 28px rgba(0,0,0,.35)`;
  const link = (i) => {
    const a = document.createElement("a");
    a.href = i.href;
    a.textContent = i.label;
    const active = items.indexOf(i) === idx;
    a.style.cssText = `color:${active ? "#62e6c8" : "#bbb"};text-decoration:none;padding:.4rem .7rem;border-radius:999px;${
      active ? "background:rgba(98,230,200,.12);" : ""
    }`;
    return a;
  };
  const arrow = (delta, txt) => {
    const a = document.createElement("a");
    const target = items[(idx + delta + items.length) % items.length];
    a.href = target ? target.href : "#";
    a.textContent = txt;
    a.style.cssText = "color:#888;text-decoration:none;padding:.4rem .5rem;font-size:13px";
    return a;
  };
  bar.appendChild(arrow(-1, "←"));
  items.forEach((i) => bar.appendChild(link(i)));
  bar.appendChild(arrow(1, "→"));
  document.body.appendChild(bar);
  addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const target = items[(idx + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
      if (target) location.href = target.href;
    }
  });
})();
