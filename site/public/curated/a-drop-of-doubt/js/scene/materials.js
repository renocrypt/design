import * as THREE from "three/webgpu";

const names = [
  "amber",
  "coral",
  "citron",
  "jade",
  "celadon",
  "ivory",
  "blue",
  "lilac",
  "rose",
  "attendant",
];

export async function createMaterials(onProgress) {
  const loader = new THREE.TextureLoader();
  const files = [
    "rosewood",
    "court-carpet",
    "lacquer-inlay",
    "embroidered-trim",
    "weave",
    ...names.map((n) => `silk-${n}`),
  ];
  let loaded = 0;
  const textures = Object.fromEntries(
    await Promise.all(
      files.map(async (name) => {
        const tex = await loader.loadAsync(`./assets/textures/${name}.webp`);
        tex.colorSpace =
          name === "weave" ? THREE.NoColorSpace : THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        onProgress?.(++loaded / files.length);
        return [name, tex];
      }),
    ),
  );
  textures.weave.wrapS = textures.weave.wrapT = THREE.RepeatWrapping;
  textures.weave.repeat.set(5, 7);
  const standard = (color, roughness = 0.65, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const silk = {};
  for (const name of names)
    silk[name] = new THREE.MeshPhysicalMaterial({
      map: textures[`silk-${name}`],
      bumpMap: textures.weave,
      bumpScale: 0.0007,
      roughness: 0.52,
      sheen: 0.48,
      sheenColor: "#dbcbb0",
      sheenRoughness: 0.55,
      side: THREE.DoubleSide,
    });
  return {
    silk,
    textures,
    sclera: new THREE.MeshPhysicalMaterial({
      color: "#b6b0a2",
      roughness: 0.48,
      clearcoat: 0.1,
      clearcoatRoughness: 0.25,
      specularIntensity: 0.3,
    }),
    iris: new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      vertexColors: true,
      roughness: 0.38,
      clearcoat: 0.25,
      clearcoatRoughness: 0.15,
      specularIntensity: 0.32,
    }),
    brow: standard("#4c352b", 0.87),
    lash: standard("#261e1b", 0.73),
    mouth: standard("#392022", 0.8),
    teeth: standard("#d7c6a8", 0.46),
    wood: new THREE.MeshStandardMaterial({
      map: textures.rosewood,
      roughness: 0.43,
    }),
    blackwood: standard("#24221e", 0.4),
    red: standard("#762f2e", 0.48),
    redDark: standard("#592624", 0.5),
    wall: standard("#c8bca3", 0.95),
    floor: standard("#626157", 0.79),
    grout: standard("#333b36", 0.94),
    gold: standard("#b7924c", 0.35, 0.76),
    goldLight: standard("#d1b473", 0.33, 0.7),
    silver: standard("#b9b6a8", 0.29, 0.75),
    pearl: new THREE.MeshPhysicalMaterial({
      color: "#e6dfc9",
      roughness: 0.28,
      metalness: 0.08,
      clearcoat: 0.15,
    }),
    turquoise: standard("#4c999b", 0.36, 0.15),
    jade: standard("#729b82", 0.31, 0.12),
    ruby: standard("#713041", 0.24, 0.16),
    lavender: standard("#aa8ba8", 0.63),
    rose: standard("#bd8b94", 0.61),
    peach: standard("#d9b499", 0.72),
    blossom: standard("#bca57d", 0.65),
    leaf: standard("#5d7860", 0.81),
    leafLight: standard("#8b9a70", 0.76),
    hair: new THREE.MeshPhysicalMaterial({
      color: "#17191a",
      roughness: 0.46,
      sheen: 0.14,
      sheenColor: "#6b625c",
    }),
    skin: standard("#b99378", 0.78),
    scarf: standard("#ece5d6", 0.91),
    shoe: standard("#242526", 0.75),
    yellow: standard("#c9a349", 0.72),
    yellowLight: standard("#d6b867", 0.8),
    bluePaint: standard("#4f7773", 0.66),
    porcelain: new THREE.MeshPhysicalMaterial({
      color: "#d7dac5",
      roughness: 0.23,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25,
    }),
    porcelainBlue: standard("#405e7b", 0.38),
    window: new THREE.MeshBasicMaterial({ color: "#e5dec6" }),
    carpet: new THREE.MeshStandardMaterial({
      map: textures["court-carpet"],
      roughness: 1,
      bumpMap: textures.weave,
      bumpScale: 0.004,
    }),
    inlay: new THREE.MeshStandardMaterial({
      map: textures["lacquer-inlay"],
      roughness: 0.51,
      metalness: 0.08,
    }),
    trim: new THREE.MeshStandardMaterial({
      map: textures["embroidered-trim"],
      roughness: 0.6,
      side: THREE.DoubleSide,
    }),
  };
}

export function makeEnvironment() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const c = canvas.getContext("2d");
  const gradient = c.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#908c7d");
  gradient.addColorStop(0.42, "#bdb5a1");
  gradient.addColorStop(0.57, "#75685a");
  gradient.addColorStop(1, "#3f4038");
  c.fillStyle = gradient;
  c.fillRect(0, 0, 1024, 512);
  for (const [x, width] of [
    [110, 105],
    [375, 140],
    [720, 90],
  ]) {
    const g = c.createLinearGradient(x, 0, x + width, 0);
    g.addColorStop(0, "#a4a08e");
    g.addColorStop(0.15, "#eee7d7");
    g.addColorStop(0.85, "#eee7d7");
    g.addColorStop(1, "#a4a08e");
    c.fillStyle = g;
    c.fillRect(x, 110, width, 160);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.mapping = THREE.EquirectangularReflectionMapping;
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
