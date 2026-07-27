import '../../shared/reset.css';
import './tokens.css';
import './world.css';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { createFsm } from './fsm';
import { mountHall, type HallHandle } from './hall';

gsap.registerPlugin(CustomEase);
// The framer grammar, rebuilt: measured backOut / anticipation / exact easeInOut.
CustomEase.create('pulsePop', 'M0,0 C0.34,1.56 0.64,1 1,1');
CustomEase.create('pulseExit', 'M0,0 C0.36,0 0.66,-1.2 1,1');
CustomEase.create('pulseFade', 'M0,0 C0.42,0 0.58,1 1,1');

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Dialog copy (exact, per spec) ──
const DIALOG: Record<number, { eyebrow: string; title: string; body: string; next: string }> = {
  1: {
    eyebrow: 'STATION 01 · PRESS',
    title: '300 GRAMS OF FORCE',
    body: "Your thumb lands, the cap dips two millimeters, a switch closes in the dark. A tiny event is born with your name on it. That's the whole miracle — the rest is delivery.",
    next: 'FOLLOW IT',
  },
  2: {
    eyebrow: 'STATION 02 · SIGNAL',
    title: 'RIDING THE WIRE',
    body: 'The event sprints up the tree shouting its coordinates. Listeners lean over the track; one of them — yours — snags it mid-air and asks for a state change.',
    next: 'KEEP UP',
  },
  3: {
    eyebrow: 'STATION 03 · SPRING',
    title: 'OVERSHOOT IS A FEELING',
    body: 'Stiffness 170, damping 26. The value flies past its target on purpose, swings back, and forgives itself. That wobble is the difference between alive and obedient.',
    next: 'AND THEN?',
  },
  4: {
    eyebrow: 'STATION 04 · SETTLE',
    title: 'HALF A PIXEL OF CALM',
    body: 'The rings tighten until the motion is smaller than anyone can see. Sixteen milliseconds a frame, every frame, until rest is official.',
    next: 'ALMOST HOME',
  },
  5: {
    eyebrow: 'STATION 05 · SHIP',
    title: 'HELLO, PIXEL',
    body: "Through the compositor's glass and onto the screen: one state change, painted as light. Door to door in about the blink of a hummingbird.",
    next: 'FINISH THE TOUR',
  },
};

// The tag is secretly the progress meter (the measured blood-bag trick).
const TAG_LEVELS: Record<string, number> = { poster: 6.15, '1': 6.15, '2': 26.15, '3': 46.15, '4': 66.15, '5': 86.15, finale: 100 };

// ── Mount the hall (null → rung-3 diagram journey) ──
const theme0 = document.documentElement.dataset.theme === 'night' ? 'night' : 'day';
let hall: HallHandle | null = null;
const canvasEl = document.querySelector<HTMLCanvasElement>('#hall');
if (canvasEl) {
  hall = mountHall(canvasEl, theme0);
  if (hall && !hall.isLive) {
    // software renderer: keep the canvas for still frames, no rAF loop
  } else if (!hall) {
    document.body.classList.add('is-fallback');
    canvasEl.style.display = 'none';
  }
}
if (!hall || !hall.isLive) {
  document.querySelector<HTMLElement>('#diagram')!.hidden = false;
}
if (document.body.classList.contains('is-fallback')) {
  document.querySelector<HTMLElement>('#diagram')!.hidden = false;
}

// ── DOM refs ──
const poster = document.querySelector<HTMLElement>('#poster')!;
const dialog = document.querySelector<HTMLElement>('#dialog')!;
const finale = document.querySelector<HTMLElement>('#finale')!;
const dots = [...document.querySelectorAll<HTMLButtonElement>('#dots button')];
const tagStops = {
  a: document.querySelector<SVGStopElement>('.tag-stop-a')!,
  b: document.querySelector<SVGStopElement>('.tag-stop-b')!,
};

const visited = new Set<number>();

// ── Tag meter ──
function tagTo(key: string): void {
  const p = TAG_LEVELS[key] ?? 6.15;
  gsap.to(tagStops.a, { attr: { offset: `${p}%` }, duration: 0.6, ease: 'pulseFade' });
  gsap.to(tagStops.b, { attr: { offset: `${p + 0.02}%` }, duration: 0.6, ease: 'pulseFade' });
}

// ── Dots ──
function dotsTo(n: number | null): void {
  dots.forEach((d, i) => {
    const k = i + 1;
    d.classList.toggle('is-visited', visited.has(k));
    d.setAttribute('aria-disabled', String(!visited.has(k)));
    const wasActive = d.classList.contains('is-active');
    d.classList.toggle('is-active', k === n);
    if (k === n && !wasActive && !reduced) {
      gsap.fromTo(d, { scale: 1 }, { scale: 1.4, duration: 0.6, ease: 'pulsePop' });
    } else if (k !== n) {
      gsap.set(d, { scale: 1 });
    }
  });
}
dots.forEach((d) => {
  d.addEventListener('click', () => {
    const k = Number(d.dataset.dot);
    if (!visited.has(k) || k === currentStation) return;
    jumpToStation(k);
  });
});

// ── Dialog card (ONE reusable node) ──
let dialogOpen = false;
function dialogShow(n: number, delay: number): void {
  const copy = DIALOG[n];
  document.querySelector('#d-eyebrow')!.textContent = copy.eyebrow;
  document.querySelector('#d-title')!.textContent = copy.title;
  document.querySelector('#d-body')!.textContent = copy.body;
  document.querySelector('#d-next')!.textContent = copy.next;
  dialog.hidden = false;
  dialogOpen = true;
  if (reduced) {
    gsap.set(dialog, { autoAlpha: 1 });
    return;
  }
  gsap.fromTo(
    dialog,
    { scale: 0.9, y: 24, autoAlpha: 0 },
    { scale: 1, y: 0, autoAlpha: 1, duration: 0.6, ease: 'pulsePop', delay },
  );
}
function dialogHide(onDone?: () => void): void {
  if (!dialogOpen) {
    onDone?.();
    return;
  }
  dialogOpen = false;
  if (reduced) {
    gsap.set(dialog, { autoAlpha: 0 });
    onDone?.();
    return;
  }
  gsap.to(dialog, {
    scale: 0.92,
    y: 24,
    autoAlpha: 0,
    duration: 0.45,
    ease: 'pulseExit',
    onComplete: () => {
      dialog.hidden = true;
      onDone?.();
    },
  });
}

// ── The diagram journey (rung-3): a pink dot hops the glyphs ──
let diaCurrent = 0;
function diaTo(n: number): void {
  const glyphs = [...document.querySelectorAll<HTMLElement>('.dia-glyph')];
  const dot = document.querySelector<HTMLElement>('.dia-pulse');
  const g = glyphs[n - 1];
  if (!g || !dot) return;
  const gr = g.getBoundingClientRect();
  const dr = document.querySelector('#diagram')!.getBoundingClientRect();
  const x = gr.left - dr.left + gr.width / 2 - 8;
  const y = gr.top - dr.top + gr.height / 2 - 8;
  if (diaCurrent === 0) gsap.set(dot, { x, y });
  else gsap.to(dot, { x, y, duration: 0.9, ease: 'pulsePop' });
  glyphs.forEach((el, i) => {
    gsap.to(el, { scale: i === n - 1 ? 1.15 : 1, duration: 0.6, ease: 'pulsePop' });
  });
  diaCurrent = n;
}

// ── Poster entrance / exit / restore ──
function posterEntrance(): void {
  if (reduced) return;
  const tl = gsap.timeline();
  tl.from('.poster-copy .eyebrow', { autoAlpha: 0, duration: 0.6, ease: 'pulseFade' }, 0)
    .from('.poster-copy .poster-h1 .line', { y: 40, autoAlpha: 0, duration: 0.6, ease: 'pulsePop', stagger: 0.3 }, 0.3)
    .from('.poster-copy .poster-body, .poster-copy .poster-cta-row, .poster-copy .microcopy', { autoAlpha: 0, duration: 0.6, ease: 'pulseFade' }, 1.2);
}

function posterReset(): void {
  poster.style.display = '';
  poster.hidden = false;
  gsap.set(poster, { yPercent: 0, autoAlpha: 1 });
  gsap.set('.poster-copy .poster-h1 .line', { scale: 1, autoAlpha: 1, y: 0, transformOrigin: '0 50%' });
  gsap.set('.poster-copy .eyebrow, .poster-copy .poster-body, .poster-copy .poster-cta-row, .poster-copy .microcopy', { autoAlpha: 1 });
  poster.classList.remove('is-curtain');
}

// ── FSM driver ──
let currentStation = 0;

const fsm = createFsm({
  enter(s) {
    document.body.dataset.state = s.name;
    switch (s.name) {
      case 'poster':
        toPoster();
        break;
      case 'reveal':
        runCurtain();
        break;
      case 'station':
        enterStation(s.station, s.station === 1 && firstArrival);
        break;
      case 'travel':
        dialogHide();
        hall?.travelTo(s.station, () => fsm.dispatch('ARRIVED'));
        if (!hall) {
          // rung-3: cut to the station after a beat
          gsap.delayedCall(reduced ? 0.1 : 0.7, () => fsm.dispatch('ARRIVED'));
        }
        break;
      case 'finale':
        enterFinale();
        break;
    }
  },
});

let firstArrival = true;

function enterStation(n: number, fromCurtain = false): void {
  currentStation = n;
  visited.add(n);
  dotsTo(n);
  tagTo(String(n));
  if (hall) {
    if (!hall.isLive) {
      hall.renderStill(n);
    }
    if (fromCurtain) {
      hall.stationPose(1, true);
      hall.birthPulse();
      dialogShow(n, reduced ? 0 : 0.6);
    } else {
      gsap.delayedCall(reduced ? 0 : 1.0, () => hall?.beat(n));
      dialogShow(n, reduced ? 0 : 1.2);
    }
  } else {
    diaTo(n);
    dialogShow(n, reduced ? 0 : 0.3);
  }
  firstArrival = false;
}

function jumpToStation(n: number): void {
  dialogHide(() => {
    currentStation = n;
    dotsTo(n);
    tagTo(String(n));
    if (hall) {
      hall.stationPose(n);
      if (!hall.isLive) hall.renderStill(n);
    } else {
      diaTo(n);
    }
    dialogShow(n, 0.1);
  });
}

// ── The curtain: the poster layer itself, 2s linear, wave on its edge ──
function runCurtain(): void {
  const copyExit = gsap.timeline();
  if (!reduced) {
    copyExit
      .to('.poster-copy .eyebrow, .poster-copy .poster-body, .poster-copy .poster-cta-row, .poster-copy .microcopy', {
        autoAlpha: 0,
        duration: 0.45,
        ease: 'pulseExit',
      }, 0)
      .to('.poster-copy .poster-h1 .line', {
        scale: 1.5,
        autoAlpha: 0,
        duration: 0.9,
        ease: 'pulseExit',
        transformOrigin: '0 50%',
        stagger: 0.06,
      }, 0.3);
    copyExit.add(() => {
      poster.classList.add('is-curtain');
      gsap.to(poster, {
        yPercent: 140,
        duration: 2,
        ease: 'none',
        onComplete: () => {
          poster.style.display = 'none';
          fsm.dispatch('ARRIVED');
        },
      });
    }, 0.9);
  } else {
    copyExit.to(poster, {
      autoAlpha: 0,
      duration: 0.6,
      ease: 'pulseFade',
      onComplete: () => {
        poster.style.display = 'none';
        posterReset();
        fsm.dispatch('ARRIVED');
      },
    });
  }
  hall?.run(); // the hall takes over the frame clock
}

function toPoster(): void {
  currentStation = 0;
  finale.hidden = true;
  gsap.set(finale, { autoAlpha: 0 });
  dialogHide();
  posterReset();
  if (!reduced) gsap.from(poster, { autoAlpha: 0, duration: 1.4, ease: 'pulseFade' });
  dotsTo(null);
  tagTo('poster');
  visited.clear();
  dotsTo(null);
  if (!hall) diaTo(1);
}

// ── Finale ──
function enterFinale(): void {
  dialogHide();
  tagTo('finale');
  dotsTo(null);
  hall?.finale();
  finale.hidden = false;
  if (reduced) {
    gsap.set(finale, { autoAlpha: 1 });
    return;
  }
  const circle = document.querySelector<SVGCircleElement>('.stamp-circle')!;
  const check = document.querySelector<SVGPathElement>('.stamp-check')!;
  const cl = circle.getTotalLength();
  const kl = check.getTotalLength();
  gsap.set(circle, { strokeDasharray: cl, strokeDashoffset: cl });
  gsap.set(check, { strokeDasharray: kl, strokeDashoffset: kl });
  const tl = gsap.timeline();
  tl.to(finale, { autoAlpha: 1, duration: 1.4, ease: 'pulseFade' }, 0)
    .to(circle, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }, 0)
    .to(check, { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' }, 0.45)
    .from('.finale-copy .eyebrow', { autoAlpha: 0, duration: 0.6 }, 0.3)
    .from('.finale-copy .poster-h1 .line', { y: 40, autoAlpha: 0, duration: 0.6, ease: 'pulsePop', stagger: 0.3 }, 0.6)
    .from('.finale-copy .poster-body, .finale-pills', { autoAlpha: 0, duration: 0.6 }, 1.2);
}

// ── Buttons ──
document.querySelector('#start-btn')!.addEventListener('click', () => fsm.dispatch('START'));
document.querySelector('#next-btn')!.addEventListener('click', () => fsm.dispatch('NEXT'));
document.querySelector('#again-btn')!.addEventListener('click', () => {
  hall?.reset();
  visited.clear();
  tagTo('poster');
  fsm.dispatch('AGAIN');
});
document.querySelector('#roundel')!.addEventListener('click', () => fsm.dispatch('EXIT'));

// ── Keyboard: the page is the button ──
addEventListener('keydown', (e) => {
  const el = document.activeElement;
  const isForm = el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement;
  if (e.key === 'Escape') {
    fsm.dispatch('EXIT');
    return;
  }
  if (e.key !== 'Enter' && e.key !== ' ') return;
  if (isForm) return; // native activation fires — no double-trigger
  e.preventDefault();
  const st = fsm.state();
  if (st.name === 'poster') fsm.dispatch('START');
  else if (st.name === 'station') fsm.dispatch('NEXT');
  else if (st.name === 'finale') document.querySelector<HTMLButtonElement>('#again-btn')?.click();
});

// ── Theme toggle: the thesis in miniature ──
document.querySelector('#theme-toggle')!.addEventListener('click', () => {
  const bite = document.querySelector('.moon-bite');
  const next = document.documentElement.dataset.theme === 'night' ? 'day' : 'night';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('hub-theme', next);
  if (bite && !reduced) {
    gsap.fromTo(bite, { scaleX: next === 'night' ? 0 : 1 }, { scaleX: next === 'night' ? 1 : 0, duration: 0.4, ease: 'pulsePop', transformOrigin: '26px 14px' });
  }
  hall?.setTheme(next as 'day' | 'night');
});

// ── Idle loops ──
if (!reduced) {
  gsap.fromTo('#hangtag', { rotation: -2.5 }, { rotation: 2.5, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% -20px' });
}

// ── Boot ──
posterEntrance();
if (hall) {
  hall.warmup();
  setInterval(() => {
    if (fsm.state().name === 'poster') hall?.warmup();
  }, 2000);
}
if (!hall) diaTo(1);
tagTo('poster');

if (import.meta.hot) {
  import.meta.hot.dispose(() => hall?.dispose());
}
