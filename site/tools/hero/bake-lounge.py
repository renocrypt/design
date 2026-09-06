"""Bake the original lounge and batch fine details that cannot hold atlas texels.
Run after build-lounge.py, with the same output directory after --.
"""
import bpy
import sys
sys.dont_write_bytecode = True
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from lighting import apply_lighting

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
OUT=Path(args[0] if args else '/tmp/design-lounge')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lounge.blend'))
scene=bpy.context.scene
scene.render.resolution_percentage=100
scene.cycles.samples=80
if '--skip-render' not in args:
    for night in (False,True):
        apply_lighting(scene,night)
        scene.render.filepath=str(OUT/('lounge-still-night.png' if night else 'lounge-still.png'))
        bpy.ops.render.render(write_still=True)
apply_lighting(scene,False)

# Fine wirework stays in flat-color batches. Its subpixel UV islands would
# otherwise introduce dark seams when the lighting atlas is minified.
bpy.ops.object.select_all(action='DESELECT')
meshes=[obj for obj in scene.objects if obj.type in {'MESH','CURVE'}]
for obj in meshes: obj.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.object.convert(target='MESH')
meshes=[obj for obj in scene.objects if obj.type=='MESH']
detail_prefixes=('Wire cube','Floor joint','Pendant cable','Cushion piping','Leaf midrib','Opal pendant')
detail_groups={}
for obj in meshes:
    if obj.name.startswith(detail_prefixes):
        name=obj.data.materials[0].name
        detail_groups.setdefault(name,[]).append(obj)
details=[]
for name,objects in detail_groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    obj=bpy.context.object
    obj.name='Detail_'+name
    obj['unbaked']=True
    obj['luminous']=name=='Opal glass globe'
    details.append(obj)
bpy.ops.object.select_all(action='DESELECT')
meshes=[obj for obj in scene.objects if obj.type=='MESH' and obj not in details]
for obj in meshes: obj.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.object.join()
room=bpy.context.object
room.name='Lounge'
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
# Baking uses a second UV layer so procedural coordinates remain undisturbed.
uv=room.data.uv_layers.new(name='LightingAtlas')
room.data.uv_layers.active=uv
uv.active_render=True
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.0012,area_weight=.5,correct_aspect=True,scale_to_bounds=True)
bpy.ops.object.mode_set(mode='OBJECT')
image=bpy.data.images.new('Lounge lighting',width=4096,height=4096,alpha=False,float_buffer=True)
image.colorspace_settings.name='Linear Rec.709'
for mat in room.data.materials:
    if not mat: continue
    mat.use_nodes=True
    node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
    mat.node_tree.nodes.active=node
scene.cycles.samples=96
scene.render.bake.margin=6
scene.render.bake.use_clear=True
scene.render.bake.use_pass_direct=True
scene.render.bake.use_pass_indirect=True
scene.render.bake.use_pass_diffuse=True
scene.render.bake.use_pass_glossy=True
scene.render.bake.use_pass_transmission=True
scene.render.bake.use_pass_emit=True
scene.render.bake.use_pass_color=True
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGB'
scene.render.image_settings.color_depth='8'
for night in (False,True):
    apply_lighting(scene,night)
    bpy.ops.object.bake(type='COMBINED')
    image.save_render(str(OUT/('lounge-atlas-night.png' if night else 'lounge-atlas.png')),scene=scene)
apply_lighting(scene,False)
# The browser supplies the optimized atlas as an unlit map. All baked colors
# already include the view transform, so runtime does not apply another one.
material=bpy.data.materials.new('Baked lounge');material.diffuse_color=(1,1,1,1)
room.data.materials.clear();room.data.materials.append(material)
for polygon in room.data.polygons: polygon.material_index=0
# Make the lighting atlas the exported TEXCOORD_0.
for layer in list(room.data.uv_layers):
    if layer.name!='LightingAtlas':room.data.uv_layers.remove(layer)
room.data.uv_layers.active_index=0
bpy.ops.object.select_all(action='DESELECT')
room.select_set(True);scene.camera.select_set(True)
for obj in details: obj.select_set(True)
bpy.context.view_layer.objects.active=room
bpy.ops.export_scene.gltf(filepath=str(OUT/'lounge.glb'),export_format='GLB',use_selection=True,export_cameras=True,export_lights=False,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_animations=False,export_yup=True,export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=7,export_draco_position_quantization=16,export_draco_texcoord_quantization=16)
print('LOUNGE_EXPORT',len(room.data.vertices),'vertices',len(room.data.polygons),'polygons')
