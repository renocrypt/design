// An original, condensed retelling. The user's opening and final command anchor it.
export const DURATION = 122;

export const CUES = [
  {
    start: 0,
    end: 9,
    speaker: "empress",
    shot: "wide",
    chapter: "The accusation",
    en: "Lady Qi, you insisted on bringing a charge against Noble Consort Xi, and asked me to assemble the court. What is the matter?",
    zh: "祺贵人，你一定要向本宫告发熹贵妃，还要本宫请来后宫众人，到底所为何事啊？",
  },
  {
    start: 9,
    end: 15,
    speaker: "qi",
    shot: "qi",
    chapter: "The accusation",
    en: "Your Majesty, I accuse Noble Consort Xi of adultery.",
    zh: "嫔妾告发熹贵妃私通。",
  },
  {
    start: 15,
    end: 20,
    speaker: "empress",
    shot: "hand",
    chapter: "The accusation",
    en: "Consider what you are asking this court to believe.",
    zh: "这番指控，你可知分量？",
  },
  {
    start: 20,
    end: 26,
    speaker: "qi",
    shot: "qi",
    chapter: "An oath",
    en: "I have staked my life on it.",
    zh: "臣妾愿以性命作保。",
  },
  {
    start: 26,
    end: 37,
    speaker: "ning",
    shot: "ning",
    chapter: "An oath",
    en: "Your life? Then name something we can hold you to.",
    zh: "生死难料。你的誓言，总该有个凭据。",
  },
  {
    start: 37,
    end: 44,
    speaker: "qi",
    shot: "reverse",
    chapter: "An oath",
    en: "Let my family answer for every word.",
    zh: "臣妾愿以全族担保，所言无虚。",
  },
  {
    start: 44,
    end: 49,
    speaker: "empress",
    shot: "empress",
    chapter: "A name",
    en: "And who is this man?",
    zh: "那么，你指的是谁？",
  },
  {
    start: 49,
    end: 57,
    speaker: "qi",
    shot: "qi",
    chapter: "A name",
    en: "The imperial physician, Wen Shichu.",
    zh: "太医温实初。",
  },
  {
    start: 57,
    end: 70,
    speaker: "kang",
    shot: "zhen",
    chapter: "A name",
    en: "He has attended her for years. The palace has a long memory.",
    zh: "他多年侍奉贵妃，这宫里的人总还记得。",
  },
  {
    start: 70,
    end: 77,
    speaker: "qi",
    shot: "empress",
    chapter: "A name",
    en: "Long enough to remember where this began.",
    zh: "那么，这段缘由便有迹可循了。",
  },
  {
    start: 77,
    end: 95,
    speaker: "an",
    shot: "an",
    chapter: "The insinuation",
    en: "An old family friend. A trusted physician. Surely that explains their closeness.",
    zh: "一位故交，一位信得过的太医。彼此亲近，也未必没有缘故。",
  },
  {
    start: 95,
    end: 102,
    speaker: "concubineZhen",
    shot: "reverse",
    chapter: "The insinuation",
    en: "Closeness is precisely the question.",
    zh: "这份亲近，恰恰就是疑处。",
  },
  {
    start: 102,
    end: 109,
    speaker: "jing",
    shot: "jing",
    chapter: "The summons",
    en: "We have heard enough suspicion. What evidence do you have?",
    zh: "疑心已经说了许多。凭证又在何处？",
  },
  {
    start: 109,
    end: 117,
    speaker: "qi",
    shot: "qi",
    chapter: "The summons",
    en: "There is someone who remembers a proposal, before she ever entered the palace.",
    zh: "贵妃入宫以前的一场提亲，自然有人记得。",
  },
  {
    start: 117,
    end: 122,
    speaker: "qi",
    shot: "wide",
    chapter: "The summons",
    en: "Bring in Chen Si’s wife.",
    zh: "把陈四家的带上来！",
  },
];

export const CHAPTERS = [
  { name: "The accusation", start: 0 },
  { name: "An oath", start: 20 },
  { name: "A name", start: 44 },
  { name: "The insinuation", start: 77 },
  { name: "The summons", start: 102 },
];

export const findCue = (time) =>
  CUES.findIndex((c) => time >= c.start && time < c.end);

export function formatTime(time) {
  const total = Math.floor(Math.max(0, time));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
