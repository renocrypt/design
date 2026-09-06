const voices = {
  empress: { accent: "#c5a16e", paper: "#171815", pressure: 0.28 },
  qi: { accent: "#d99a9f", paper: "#1c1718", pressure: 0.84 },
  zhen: { accent: "#b8be90", paper: "#181b17", pressure: 0.34 },
  ning: { accent: "#9bbfac", paper: "#141a18", pressure: 0.62 },
  an: { accent: "#a6b49a", paper: "#171b18", pressure: 0.25 },
  jing: { accent: "#a6bbc8", paper: "#151a1d", pressure: 0.52 },
  kang: { accent: "#c2a7bc", paper: "#1b171c", pressure: 0.47 },
  concubineZhen: { accent: "#c5a1b1", paper: "#1c181c", pressure: 0.57 },
};

export function setDesignVoice(speaker, moment, total) {
  const voice = voices[speaker] || voices.empress,
    style = document.documentElement.style;
  style.setProperty("--speaker-accent", voice.accent);
  style.setProperty("--paper", voice.paper);
  style.setProperty("--voice-pressure", voice.pressure);
  style.setProperty("--chapter-progress", moment / Math.max(1, total - 1));
  document.documentElement.dataset.voice = speaker;
}
