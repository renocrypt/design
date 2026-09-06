"""The two authored lighting states share one room, camera, and UV layout."""
import bpy


def color(value):
    value=value.lstrip('#')
    channels=[int(value[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in channels)


def apply_lighting(scene, night=False):
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=color('#aec9ff' if night else '#d4e8ff')+(1,)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.055 if night else .5
    settings={
        'Window daylight': (45 if night else 850, '#9ebdff' if night else '#edf4ff'),
        'Window daylight rear': (30 if night else 650, '#9ebdff' if night else '#edf4ff'),
        'Front fill': (100 if night else 350, '#b6cdff' if night else '#fff1d4'),
        'Warm rear bounce': (600 if night else 450, '#ffd39a' if night else '#ffe2aa'),
        'Practical room fill': (460 if night else 0, '#ffdeb0'),
    }
    for name,(energy,tint) in settings.items():
        light=bpy.data.lights.get(name)
        if light:
            light.energy=energy
            light.color=color(tint)
    bpy.data.lights['Afternoon sun'].energy=0 if night else 1.65
    bulb=bpy.data.materials.get('Opal glass globe')
    if bulb:
        shader=bulb.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Emission Color'].default_value=color('#ffe1ad' if night else '#fff1d5')+(1,)
        shader.inputs['Emission Strength'].default_value=8 if night else 1.5
    scene.view_settings.exposure=.15 if night else -.35
