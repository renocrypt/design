"""Prepare the selected hero assets for delivery after the Blender bake.
Requires Pillow. Intermediate renders and Blender files remain outside the repo.
"""
import argparse
import shutil
from pathlib import Path
from PIL import Image

site=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser()
parser.add_argument('--input',type=Path,default=Path('/tmp/design-lounge'))
parser.add_argument('--output',type=Path,default=site/'public/hero')
args=parser.parse_args()
args.output.mkdir(parents=True,exist_ok=True)
for suffix in ('','-night'):
    Image.open(args.input/f'lounge-still{suffix}.png').convert('RGB').save(args.output/f'lounge-still{suffix}.webp',quality=86,method=6)
    atlas=Image.open(args.input/f'lounge-atlas{suffix}.png').convert('RGB')
    atlas.save(args.output/f'lounge-atlas{suffix}.webp',quality=85,method=6)
    atlas.resize((2048,2048),Image.Resampling.LANCZOS).save(args.output/f'lounge-atlas{suffix}-mobile.webp',quality=83,method=6)
shutil.copyfile(args.input/'lounge.glb',args.output/'lounge.glb')
# The fixed geometry and matching atlases must be invalidated together.
import hashlib
revision=hashlib.sha256()
for name in ['lounge.glb','lounge-atlas.webp','lounge-atlas-night.webp']:
    revision.update((args.output/name).read_bytes())
(site/'src/hub/lounge/revision.ts').write_text("// Content fingerprint of the mesh and its matching lighting atlases.\nexport const HERO_REVISION = '"+revision.hexdigest()[:12]+"';\n")
for asset in sorted(args.output.glob('*')):
    if asset.is_file():print(asset.name,asset.stat().st_size)
