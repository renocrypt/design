"""Author the lounge and render a proof. Run with Blender 4.5 in background mode.

Outputs go to the directory supplied after --, never to a user's Blender files.
The room is original geometry, informed by the Units lounge's spatial language.
"""
import bpy
import math
import random
import sys
sys.dont_write_bytecode = True
from pathlib import Path
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).parent))
from lighting import apply_lighting

random.seed(27)
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = Path(args[0] if args else '/tmp/design-lounge')
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.cycles.diffuse_bounces = 5
scene.render.resolution_x = 1600
scene.render.resolution_y = 1100
scene.render.resolution_percentage = 70
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = -.35
scene.render.image_settings.file_format = 'PNG'


def rgba(value):
    h = value.lstrip('#')
    rgb = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb) + (1,)


def material(name, color, rough=.6, metal=0, grain=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = rgba(color)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metal
    if grain:
        noise = m.node_tree.nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 135
        noise.inputs['Detail'].default_value = 2
        bump = m.node_tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = grain
        bump.inputs['Distance'].default_value = .003
        m.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
        m.node_tree.links.new(bump.outputs['Normal'], bs.inputs['Normal'])
    return m


blue = material('Cobalt painted timber', '#1865b7', .5, 0, .12)
blue_dark = material('Blue ceiling recess', '#154881', .78, 0, .1)
green = material('Malachite painted plaster', '#258565', .8, 0, .16)
yellow = material('Saffron powder-coated steel', '#f2bf24', .43, .15, .03)
cream = material('Warm porcelain laminate', '#f4efde', .55, 0, .05)
orange = material('Burnt orange plaster', '#bd5927', .82, 0, .12)
clay = material('Terracotta', '#935236', .9, 0, .15)
black = material('Graphite steel', '#252c2c', .48, .2)
navy = material('Blue upholstery', '#6386a8', .95, 0, .32)
purple = material('Ink blue enamel', '#3e4ab5', .38, .25)
grout = material('Pale grout', '#cac8bd', .9)
tile = material('Deep green ceramic', '#284c42', .26, 0, .06)
wood = material('Oak end grain', '#b5844c', .7, 0, .22)
page = material('Paper edges', '#e8e1c9', .98)
leaf_mats = [material('Leaf %02d' % i, col, .49, 0, .14) for i, col in enumerate(['#477b34', '#326c3a', '#638d38', '#437c49', '#255c30'])]
stem_mat = material('Leaf stems', '#618539', .65)
soil = material('Soil', '#332a20', 1, 0, .8)

floor = material('Fine limestone terrazzo', '#c3c5bd', .74, 0, .16)
nodes = floor.node_tree.nodes
noise = nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 1800; noise.inputs['Detail'].default_value = 1.4
ramp = nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position = .29; ramp.color_ramp.elements[0].color = rgba('#b2b7af')
ramp.color_ramp.elements[1].position = .58; ramp.color_ramp.elements[1].color = rgba('#c4c8bf')
floor.node_tree.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
floor.node_tree.links.new(ramp.outputs['Color'], nodes.get('Principled BSDF').inputs['Base Color'])


def finish(obj, name, mat, bevel=0, smooth=False):
    obj.name = name
    if mat: obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Soft manufactured edges', 'BEVEL')
        mod.width = bevel; mod.segments = 3
    if smooth:
        for poly in obj.data.polygons: poly.use_smooth = True
    if bevel:
        obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    return obj


def box(name, loc, dims, mat, bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object; obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, bevel)


def cyl(name, loc, radius, depth, mat, bevel=.008, vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    return finish(bpy.context.object, name, mat, bevel, True)


def ball(name, loc, radius, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=radius, location=loc)
    return finish(bpy.context.object, name, mat, 0, True)


def rod(name, a, b, radius, mat, vertices=8):
    direction = Vector(b) - Vector(a)
    obj = cyl(name, (Vector(a)+Vector(b))*.5, radius, direction.length, mat, 0, vertices)
    obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    return obj


def curve(name, points, radius, mat):
    data = bpy.data.curves.new(name, 'CURVE'); data.dimensions = '3D'
    spline = data.splines.new('BEZIER'); spline.bezier_points.add(len(points)-1)
    for p, co in zip(spline.bezier_points, points):
        p.co = co; p.handle_left_type = p.handle_right_type = 'AUTO'
    data.bevel_depth = radius; data.bevel_resolution = 2; data.resolution_u = 8
    obj = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


# Architecture: a long room framed by glass on the left and warm plaster on the right.
box('Limestone floor', (0, 2, -.1), (13, 19, .2), floor)
for x in [-4, -2, 0, 2, 4]: box('Floor joint', (x, 2, .001), (.006, 18, .002), grout, 0)
for y in [-4, -2, 0, 2, 4, 6, 8, 10]: box('Floor joint', (0, y, .001), (12, .006, .002), grout, 0)
box('Right plaster wall', (5.8, 3, 2.3), (.25, 14, 4.6), orange)
box('Back plaster wall', (0, 9.4, 2.3), (11.8, .25, 4.6), orange)
box('Ceiling recess', (0, 2.7, 4.65), (11.8, 14, .18), blue_dark)
for x in [-5.7 + i*1.425 for i in range(9)]:
    box('Coffer longitudinal', (x, 2.7, 4.48), (.105, 14, .24), blue)
for y in [-4.1 + i*1.42 for i in range(11)]:
    box('Coffer cross member', (0, y, 4.48), (11.7, .105, .24), blue)
for x, y, w in [(2.95, 1.55, .96), (-5.6, .25, .46), (-5.6, 6.6, .46)]:
    box('Green structural pier', (x, y, 2.25), (w, .8, 4.5), green)
box('Green low plinth', (0, 6.8, .22), (9.4, .55, .44), green)

# Glazing is represented by its precise framing; open daylight is the hero's light source.
for y in [-3.7, -.3, 3.1, 6.5, 9.25]:
    box('Window mullion', (-5.6, y, 2.2), (.075, .055, 4.4), black, .004)
for z in [.12, 3.65, 4.4]: box('Window transom', (-5.6, 2.7, z), (.08, 13.2, .055), black, .004)
box('Window seat ledge', (-5.4, 2.6, .48), (.56, 12.8, .12), cream)
box('Outside terrace', (-8, 2, -.12), (5, 19, .2), cream)
for y in [-3.3, 1.1, 5.5, 9.9]: box('Outside sun screen', (-7.7, y, 2.25), (.24, .24, 4.5), cream)

# Deep-tiled rear wall and a narrow illuminated reveal.
box('Tiled inset backing', (-.7, 9.2, 2.35), (6.6, .08, 3.4), grout)
for i in range(22):
    for j in range(11):
        box('Glazed wall tile', (-3.85 + i*.3, 9.14, .85 + j*.3), (.289, .045, .289), tile, .004)
for x in [-4.08, 2.78]: box('Yellow reveal', (x, 9.04, 2.35), (.095, .11, 3.6), yellow)
box('Yellow lintel', (-.65, 9.04, 4.1), (6.95, .11, .12), yellow)
# A framed opening gives the right-hand wall a believable destination.
box('Studio door inset', (5.64, 5.6, 1.53), (.08, 2.2, 3.06), black)
for y in [4.48, 6.72]: box('Studio door jamb', (5.53, y, 1.62), (.16, .07, 3.24), wood)
box('Studio door lintel', (5.53, 5.6, 3.26), (.16, 2.3, .1), wood)
box('Studio door panel', (5.47, 5.6, 1.53), (.04, 1.95, 2.85), green)
rod('Door pull', (5.38, 4.88, 1.0), (5.38, 4.88, 1.42), .017, cream, 16)

# Right-hand internal glazing repeats the ceiling rhythm at human scale.
glass_tint=material('Internal glazing tint','#695f39',.3,.15)
for y in [-2.65,-.1,2.45]:
    box('Inner studio glazing',(5.63,y,2.1),(.035,2.38,2.7),glass_tint,.004)
    for z in [.72,3.48]: box('Glazing horizontal rail',(5.56,y,z),(.075,2.48,.055),black,.004)
    for yy in [y-1.22,y+1.22]: box('Glazing vertical rail',(5.56,yy,2.1),(.075,.055,2.82),black,.004)
    box('Glazing reflected daylight',(5.60,y-.7,2.16),(.015,.22,2.58),orange,0)

# Globes and cables are part of the coffer rhythm, with warm integrated lighting.
lamp = material('Opal glass globe', '#fff4dd', .35)
bs = lamp.node_tree.nodes.get('Principled BSDF')
bs.inputs['Emission Color'].default_value = rgba('#fff1d5'); bs.inputs['Emission Strength'].default_value = 1.5
for y in [-2.3, .55, 3.4, 6.25, 9.1]:
    for x in [-3.55, -.7, 2.15, 5.0]:
        drop = .18 if y < 1 else .12
        rod('Pendant cable', (x,y,4.52), (x,y,4.16-drop), .006, black)
        cyl('Pendant cap', (x,y,4.17-drop), .045, .055, cream)
        ball('Opal pendant', (x,y,3.99-drop), .19, lamp)


def bench(x, y, width=1.38, depth=1.05, height=.63, cushion=True):
    box('Modular saffron frame', (x,y,height/2), (width,depth,height), yellow, .018)
    box('Porcelain drawer front', (x,y-depth/2-.007,height/2+.012), (width-.06,.027,height-.06), cream, .006)
    box('Porcelain seat top', (x,y,height+.005), (width-.06,depth-.06,.035), cream, .006)
    # Recessed inset handle, with rounded ends and a narrow pale center.
    handle = box('Inset drawer pull', (x,y-depth/2-.026,height-.18), (.28,.012,.075), black, .033)
    box('Pull inner face', (x,y-depth/2-.034,height-.18), (.252,.006,.054), cream, .025)
    if cushion:
        c = cyl('Tailored seat cushion', (x-.07,y,height+.09), .385, .14, navy, .047, 48)
        c.scale.y = .92
        # Stitched piping lies along the seam, rather than a flat painted circle.
        pts=[(x-.07+.373*math.cos(a*math.tau/32), y+.343*math.sin(a*math.tau/32),height+.1) for a in range(33)]
        curve('Cushion piping',pts,.004,navy)


front_left = (-3.8,-1.65,1.72,.66)
for x,y,w,h in [front_left,(-1.78,-.65,1.64,.62),(.5,-.55,1.54,.62),(2.24,-.25,1.46,.62),(4.42,-1.45,1.54,.64),(-3.08,1.4,1.42,.98),(-1.53,1.4,1.55,.98),(.15,1.4,1.5,.98),(1.77,1.4,1.52,.98)]:
    bench(x,y,w,1.0,h)


def wire_cube(x,y,size=.86,height=.65):
    for z in [.02,height]:
        for a,b in [((-size/2,-size/2),(size/2,-size/2)),((size/2,-size/2),(size/2,size/2)),((size/2,size/2),(-size/2,size/2)),((-size/2,size/2),(-size/2,-size/2))]:
            rod('Wire cube edge',(x+a[0],y+a[1],z),(x+b[0],y+b[1],z),.01,yellow)
    n=7
    for i in range(n+1):
        s=-size/2+i*size/n
        for side in [-1,1]:
            rod('Wire cube vertical',(x+s,y+side*size/2,.02),(x+s,y+side*size/2,height),.0045,yellow,6)
            rod('Wire cube vertical',(x+side*size/2,y+s,.02),(x+side*size/2,y+s,height),.0045,yellow,6)
        rod('Wire cube top',(x+s,y-size/2,height),(x+s,y+size/2,height),.0045,yellow,6)
        rod('Wire cube top',(x-size/2,y+s,height),(x+size/2,y+s,height),.0045,yellow,6)
    for i in range(1,5):
        z=.02+i*height/5
        for side in [-1,1]:
            rod('Wire cube horizontal',(x-size/2,y+side*size/2,z),(x+size/2,y+side*size/2,z),.0045,yellow,6)
            rod('Wire cube horizontal',(x+side*size/2,y-size/2,z),(x+side*size/2,y+size/2,z),.0045,yellow,6)


for x,y in [(-4.4,-2.0),(-2.97,-.0),(3.3,-1.5),(4.43,.7)]: wire_cube(x,y)


def side_table(x,y):
    cyl('Round enamel table', (x,y,.72), .29, .028, purple, .01,48)
    rod('Table upright', (x+.17,y,.05),(x+.17,y,.705),.014,purple,12)
    pts=[(x+.245*math.cos(i*math.tau/40),y+.245*math.sin(i*math.tau/40),.025) for i in range(41)]
    curve('Table ring foot',pts,.018,purple)
    rod('Table foot brace',(x-.245,y,.025),(x+.245,y,.025),.014,purple,12)


for x,y in [(-2.35,-1.8),(1.5,-1.55),(4.83,-1.8)]: side_table(x,y)


def plant(x,y,scale=1):
    cyl('Terracotta planter',(x,y,.3*scale),.31*scale,.57*scale,clay,.026,40)
    cyl('Dark soil',(x,y,.589*scale),.287*scale,.012*scale,soil,0,32)
    for i in range(11):
        a = i*2.399+random.uniform(-.2,.2)
        stem_h = random.uniform(.9,1.7)*scale
        spread = random.uniform(.12,.44)*scale
        tip=(x+math.cos(a)*spread,y+math.sin(a)*spread,.55*scale+stem_h)
        curve('Arching petiole',[(x,y,.54*scale),(x+math.cos(a)*spread*.15,y+math.sin(a)*spread*.15,1.1*scale),tip],.011*scale,stem_mat)
        length=random.uniform(.66,1.02)*scale; width=random.uniform(.14,.23)*scale
        verts=[]; faces=[]; along=18; across=8
        for j in range(along+1):
            t=j/along
            for k in range(across+1):
                u=k/across*2-1
                leaf_w=width*math.sin(math.pi*t)**.7
                verts.append((u*leaf_w, t*length, .1*scale*math.sin(math.pi*t)-.13*scale*u*u*math.sin(math.pi*t)+.012*scale*math.sin(t*math.pi*9)*abs(u)))
                if j<along and k<across:
                    q=j*(across+1)+k; faces.append((q,q+1,q+across+2,q+across+1))
        mesh=bpy.data.meshes.new('Curved leaf');mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new('Strelitzia leaf',mesh);bpy.context.collection.objects.link(obj)
        obj.location=tip;obj.rotation_euler=(random.uniform(.1,.65),random.uniform(-.15,.15),a-math.pi/2)
        mesh.materials.append(leaf_mats[i%len(leaf_mats)])
        for p in mesh.polygons:p.use_smooth=True
        solid=obj.modifiers.new('Leaf thickness','SOLIDIFY');solid.thickness=.0018*scale
        vein=curve('Leaf midrib',[(0,0,.003), (0,length*.5,.1*scale+.003),(0,length,.003)],.003*scale,stem_mat)
        vein.location=tip;vein.rotation_euler=obj.rotation_euler.copy()


plant(3.48,.25,1.25)
plant(-4.72,.7,1.10)
plant(4.55,7.5,1.05)
plant(-6.9,6.4,1.18)

# Small signs of occupation: reading material, a sketchbook, a cup, and a laptop.
for i,(seat_x,seat_y,width,height,mat) in enumerate([(-1.78,-.65,1.64,.62,purple),(2.24,-.25,1.46,.62,orange),(-1.53,1.4,1.55,.98,green)]):
    x=seat_x+width/2-.25
    y=seat_y+.04
    support=height+.0225
    root=bpy.data.objects.new('Book group',None)
    bpy.context.collection.objects.link(root)
    root.location=(x,y,support)
    root.rotation_euler.z=.13*(i-1)
    for name,z,dims,tint in [('Design book',.0175,(.32,.43,.035),mat),('Book page block',.0405,(.305,.407,.018),page),('Book cover',.0535,(.32,.43,.008),mat)]:
        obj=box(name,(0,0,z),dims,tint,.002)
        obj.parent=root
cup=cyl('Ceramic cup',(-2.35,-1.8,.805),.046,.14,cream,.008,32)
pts=[(-2.29+.035*math.cos(i*math.tau/16),-1.8,.82+.041*math.sin(i*math.tau/16)) for i in range(17)]
curve('Cup handle',pts,.008,cream)
# Laptop placement is derived from the supporting bench, including its top panel.
laptop_x=front_left[0]+front_left[2]/2-.29
laptop_y=front_left[1]-.08
support_z=front_left[3]+.0225
box('Laptop base',(laptop_x,laptop_y,support_z+.011),(.44,.31,.022),black,.008)
screen_angle=math.radians(-14)
hinge_y=laptop_y+.145
hinge_z=support_z+.020
screen_y=hinge_y-math.sin(screen_angle)*.145
screen_z=hinge_z+math.cos(screen_angle)*.145
screen=box('Laptop screen',(laptop_x,screen_y,screen_z),(.44,.02,.29),black,.01)
screen.rotation_euler.x=screen_angle
display=material('Screen glow','#8eb5ad',.5)
bs=display.node_tree.nodes.get('Principled BSDF')
bs.inputs['Emission Color'].default_value=rgba('#598f85')
bs.inputs['Emission Strength'].default_value=.25
panel=box('Laptop display',(laptop_x,screen_y-.012,screen_z),(.395,.006,.248),display,.003)
panel.rotation_euler.x=screen_angle


# Large soft sources provide bounce and material separation; sun supplies the floor pattern.
world=bpy.data.worlds.new('Soft daylight');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=rgba('#d4e8ff')
world.node_tree.nodes['Background'].inputs[1].default_value=.5
scene.world=world

def area(name,loc,target,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=rgba(color)[:3]
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=loc
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    return obj

area('Window daylight',(-6.7,-.7,3.0),(1,3,1.3),850,7,'#edf4ff')
area('Window daylight rear',(-6.7,6.6,3.3),(0,5,1.4),650,5,'#edf4ff')
area('Front fill',(0,-7,3.4),(0,3,2),350,8,'#fff1d4')
area('Warm rear bounce',(0,8.7,3.8),(0,2.5,1),450,4,'#ffe2aa')
area('Practical room fill',(0,1.5,4.12),(0,2,0),0,7,'#ffdeb0')
sun_data=bpy.data.lights.new('Afternoon sun','SUN');sun_data.energy=1.65;sun_data.angle=math.radians(4)
sun_obj=bpy.data.objects.new('Afternoon sun',sun_data);bpy.context.collection.objects.link(sun_obj)
sun_obj.rotation_euler=(math.radians(31),math.radians(-35),math.radians(-48))

camera_data=bpy.data.cameras.new('Hero camera');camera=bpy.data.objects.new('Hero camera',camera_data)
bpy.context.collection.objects.link(camera)
camera.location=(.05,-8.8,2.25)
camera.rotation_euler=(Vector((.05,2.6,2.25))-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.lens=24
camera_data.clip_end=150
scene.camera=camera
apply_lighting(scene,False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lounge.blend'))
scene.render.filepath=str(OUT/'proof.png')
bpy.ops.render.render(write_still=True)
apply_lighting(scene,True)
scene.render.filepath=str(OUT/'proof-night.png')
bpy.ops.render.render(write_still=True)
print('LOUNGE_PROOFS',str(OUT))
