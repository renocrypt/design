# S5 cipher assets

- `enigma.glb` (served at `/lab/cipher/enigma.glb`, 1.9 MB) — "Enigma Machine" by ASHISH,
  https://sketchfab.com/3d-models/enigma-machine-30b85c037a164174a109ad6f002b9c47, CC BY 4.0.
  Source was 171 MB; pipeline was island-split (52 movable nodes: 26 keys, 26 lamps), then
  resize 512 + WebP q85 + meshopt via @gltf-transform. The split tooling lives in the
  gitignored `research/shots/enigma-staging/`.
- `enigma-wire.glb` (1.4 MB) — same model with textures and materials stripped, for the
  headless verifier (`scene.verify.mjs`); never served.
