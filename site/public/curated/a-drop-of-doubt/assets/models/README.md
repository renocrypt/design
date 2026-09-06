# Head geometry and credits

`heads.glb` contains sixteen meshes: eight portrait-fitted head studies, each at two resolutions. `head-features.json` supplies positions for the eyes, eyebrows, mouth, and skin color. Both are produced by `tools/make-heads.py`.

The six principal studies are the Empress, Zhen Huan, Qi, Ning, An Lingrong, and Jing. The Jiang Fuhai and Jianqiu studies are reused for the supporting cast and attendants. Reference portraits are not applied as face textures.

## MediaPipe

The template vertex layout and face topology derive from the [MediaPipe canonical face model](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj), provided by the MediaPipe Authors under the Apache License, Version 2.0. A copy is included in [mediapipe-LICENSE.txt](mediapipe-LICENSE.txt).

Modifications made for this project: portrait landmark fitting, pose normalization, partial symmetry, skin color sampling, eye and mouth openings, cranium closure, subdivision, and export as glTF meshes. The feature measurements were prepared with MediaPipe Face Landmarker 1.0.1. The detector and its model are development tools and are not loaded by the website.

The visual source is *Empresses in the Palace*. The [adaptation credits](../../credits.md) identify the episode and reference material. MediaPipe’s license covers the template contribution; it does not confer rights to the drama or its reference photographs.
