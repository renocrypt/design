# Lounge assets

The lounge is original geometry and procedural material work, informed by the spatial composition of [Units](https://units.gr/en/homepage/).
It includes the architecture, modular furniture, wirework, plants, reading material, and laptop.
Props are positioned relative to their supporting surfaces.
The reference photograph is not a runtime asset.

The authoring pipeline uses Blender 4.5 and Python with Pillow.
These tools are optional for normal site development because the selected web assets are included in the repository.

From the repository root:

```sh
blender --background --factory-startup --python site/tools/hero/build-lounge.py -- /tmp/worlds-lounge
blender --background --factory-startup --python site/tools/hero/bake-lounge.py -- /tmp/worlds-lounge
python3 site/tools/hero/pack-lounge.py --input /tmp/worlds-lounge
```

`lighting.py` defines daylight and evening illumination for the same geometry and UV layout.
The bake retains fine wirework and opal lights as separate material batches.
The rest of the room shares a lighting atlas for each appearance.
The packing step compresses the stills and atlases, creates smaller mobile textures, and updates the content fingerprint used by the loader.
Intermediate Blender files and raw renders stay in the temporary output directory.

The Draco decoder files in `site/public/hero/draco/` come from the installed Three.js package and are covered by the accompanying Apache 2.0 license.
The Chrome SVG uses letter outlines from the existing Zodiak font source, covered by the repository's Fontshare license.
The remaining SVG paths are authored for this collection.
