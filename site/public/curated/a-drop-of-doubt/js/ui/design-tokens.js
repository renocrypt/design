const voices = {
  empress: "#b7b2e0",
  qi: "#d6bbd3",
  zhen: "#c2d0e8",
  ning: "#b4cecf",
  an: "#c6c1e3",
  jing: "#afc3df",
  kang: "#c8badb",
  concubineZhen: "#c5c4e1",
};

/** Speaker accents stay within the scene's cool palette. */
export function setDesignVoice(speaker) {
  document.documentElement.style.setProperty("--speaker-accent", voices[speaker] || voices.empress);
  document.documentElement.dataset.voice = speaker;
}
