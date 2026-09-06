import { CUES, CHAPTERS, DURATION, formatTime } from "../narrative/cues.js";
import { Ambience } from "./ambience.js";
import { setDesignVoice } from "./design-tokens.js";

const $ = (id) => document.getElementById(id);

export function createUI(timeline, callbacks) {
  const app = $("app"),
    progress = $("progress"),
    ambience = new Ambience();
  let ready = false,
    lastIndex = -1,
    lastTime = -1,
    showChinese = false,
    people = [],
    wasStarted = false,
    scrubbing = false,
    wasPlaying = false;
  try {
    showChinese = localStorage.getItem("a-drop-of-doubt:chinese") === "true";
  } catch {}
  for (const [i, chapter] of CHAPTERS.entries()) {
    const button = document.createElement("button");
    button.className = "chapter-button";
    button.textContent = chapter.name;
    button.setAttribute("aria-label", `Go to ${chapter.name}`);
    button.disabled = true;
    button.addEventListener("click", () => {
      timeline.started = true;
      timeline.exploring = false;
      timeline.seek(chapter.start);
    });
    $("chapters").appendChild(button);
  }
  const chapterButtons = [...$("chapters").children];
  $("enter-button").addEventListener("click", () => {
    timeline.play();
    $("play-button").focus({ preventScroll: true });
  });
  $("play-button").addEventListener("click", () => timeline.toggle());
  $("previous-button").addEventListener("click", () => timeline.step(-1));
  $("next-button").addEventListener("click", () => timeline.step(1));
  $("replay-button").addEventListener("click", () => {
    timeline.seek(0);
    timeline.play();
  });
  $("retry-button").addEventListener("click", () => location.reload());
  $("explore-button").addEventListener("click", () => {
    if (timeline.exploring) {
      timeline.exploring = false;
      timeline.notify();
    } else {
      timeline.explore();
      callbacks.explore();
    }
  });
  $("return-button").addEventListener("click", () => {
    timeline.exploring = false;
    timeline.notify();
  });
  progress.addEventListener("pointerdown", () => {
    scrubbing = true;
    wasPlaying = timeline.playing;
    timeline.pause();
  });
  const finishScrub = () => {
    if (!scrubbing) return;
    scrubbing = false;
    if (wasPlaying) timeline.play();
  };
  window.addEventListener("pointerup", finishScrub);
  window.addEventListener("pointercancel", finishScrub);
  progress.addEventListener("input", () => {
    timeline.started = true;
    timeline.exploring = false;
    timeline.seek(Number(progress.value));
  });
  const language = () => {
    $("language-button").setAttribute("aria-pressed", String(showChinese));
    $("language-button").title = showChinese
      ? "Hide Chinese comparison text"
      : "Show Chinese comparison text";
    $("chinese-line").hidden = !showChinese;
  };
  $("language-button").addEventListener("click", () => {
    showChinese = !showChinese;
    language();
    try {
      localStorage.setItem("a-drop-of-doubt:chinese", String(showChinese));
    } catch {}
  });
  language();
  $("sound-button").addEventListener("click", async () => {
    try {
      const enabled = await ambience.toggle();
      $("sound-button").setAttribute("aria-pressed", String(enabled));
      $("sound-button").setAttribute(
        "aria-label",
        enabled ? "Disable ambient sound" : "Enable quiet ambient sound",
      );
      $("sound-button").querySelector("span").textContent = enabled
        ? "Sound on"
        : "Sound off";
    } catch {
      $("sound-button").querySelector("span").textContent = "Unavailable";
    }
  });
  document.addEventListener("visibilitychange", () =>
    ambience.visibility(document.hidden),
  );
  for (const button of document.querySelectorAll("[data-open]"))
    button.addEventListener("click", () => {
      const dialog = $(button.dataset.open);
      if (dialog.open) return;
      timeline.pause();
      dialog.showModal();
    });
  for (const button of document.querySelectorAll("[data-close]"))
    button.addEventListener("click", () => button.closest("dialog").close());
  for (const dialog of document.querySelectorAll("dialog"))
    dialog.addEventListener("click", (event) => {
      const r = dialog.getBoundingClientRect();
      if (
        event.target === dialog &&
        (event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom)
      )
        dialog.close();
    });
  window.addEventListener("keydown", (event) => {
    if (
      !ready ||
      document.querySelector("dialog[open]") ||
      /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)
    )
      return;
    if (event.code === "Space" && event.target.tagName !== "BUTTON") {
      event.preventDefault();
      timeline.toggle();
    }
    if (event.code === "ArrowRight") {
      event.preventDefault();
      timeline.step(1);
    }
    if (event.code === "ArrowLeft") {
      event.preventDefault();
      timeline.step(-1);
    }
  });

  function update() {
    if (timeline.started !== wasStarted) {
      wasStarted = timeline.started;
      app.classList.toggle("is-started", wasStarted);
      $("intro-copy").hidden = wasStarted;
      $("live-copy").hidden = !wasStarted;
    }
    $("play-symbol").setAttribute(
      "href",
      timeline.playing ? "#pause-mark" : "#play-mark",
    );
    $("play-button").setAttribute(
      "aria-label",
      timeline.playing
        ? "Pause scene"
        : timeline.time >= DURATION
          ? "Replay scene"
          : "Play scene",
    );
    $("explore-button").setAttribute(
      "aria-pressed",
      String(timeline.exploring),
    );
    $("explore-button").querySelector("span").textContent = timeline.exploring
      ? "Return"
      : "Explore";
    $("explore-note").hidden = !timeline.exploring;
    $("ending-copy").hidden = timeline.time < DURATION;
    if (!scrubbing) progress.value = timeline.time;
    progress.style.setProperty(
      "--position",
      `${(timeline.time / DURATION) * 100}%`,
    );
    if (Math.floor(timeline.time) !== lastTime) {
      lastTime = Math.floor(timeline.time);
      $("current-time").textContent = formatTime(timeline.time);
      progress.setAttribute(
        "aria-valuetext",
        `${formatTime(timeline.time)} of ${formatTime(DURATION)}`,
      );
    }
    if (timeline.index !== lastIndex) {
      lastIndex = timeline.index;
      const cue = timeline.cue,
        person = people.find((p) => p.id === cue.speaker);
      setDesignVoice(cue.speaker, lastIndex, CUES.length);
      $("moment-index").textContent = String(lastIndex + 1).padStart(2, "0");
      $("chapter-name").textContent = cue.chapter;
      $("speaker").textContent = person?.name || "The court";
      $("english-line").textContent = cue.en;
      $("chinese-line").textContent = cue.zh;
      $("dialogue-content").classList.remove("changing");
      requestAnimationFrame(() =>
        $("dialogue-content").classList.add("changing"),
      );
      chapterButtons.forEach((b, i) => {
        const selected =
          timeline.time >= CHAPTERS[i].start &&
          (i === CHAPTERS.length - 1 || timeline.time < CHAPTERS[i + 1].start);
        b.classList.toggle("is-active", selected);
        b.setAttribute("aria-current", selected ? "step" : "false");
      });
    }
  }
  timeline.addEventListener("change", update);
  update();
  return {
    progress(value) {
      $("loading-count").textContent = String(Math.round(value * 100)).padStart(
        2,
        "0",
      );
      $("loading-progress").style.width = `${value * 100}%`;
    },
    ready(peopleData) {
      people = peopleData;
      ready = true;
      lastIndex = -1;
      for (const b of document.querySelectorAll(
        "button:disabled,input:disabled",
      ))
        b.disabled = false;
      $("loading").classList.add("is-ready");
      for (const person of people.filter((p) => p.face)) {
        const button = document.createElement("button");
        button.className = "cast-card";
        button.setAttribute("aria-label", `Look closer at ${person.name}`);
        button.innerHTML = `<img src="./assets/portraits/${person.face}.webp" alt="" width="69" height="82" loading="lazy"><span><h3></h3><p class="cast-rank"></p><p class="cast-chinese" lang="zh-Hans"></p></span><svg aria-hidden="true"><use href="#arrow-mark"/></svg>`;
        button.querySelector("h3").textContent = person.name;
        button.querySelector(".cast-rank").textContent = person.rank;
        button.querySelector(".cast-chinese").textContent = person.chinese;
        button.addEventListener("click", () => {
          $("cast-dialog").close();
          timeline.explore();
          callbacks.explore(person.id);
          $("theatre").scrollIntoView({ behavior: "smooth", block: "start" });
        });
        $("cast-list").appendChild(button);
      }
      update();
    },
    error(error) {
      console.error(error);
      document.documentElement.dataset.sceneReady = "error";
      $("loading").hidden = true;
      $("load-error").hidden = false;
      $("error-detail").textContent =
        location.protocol === "file:"
          ? "Serve this folder over HTTP, then open the local address."
          : "Check your connection and reload the scene.";
    },
    setShot(label) {
      $("shot-label").textContent = label;
    },
  };
}
