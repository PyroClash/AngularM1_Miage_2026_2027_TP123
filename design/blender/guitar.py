"""Build the original GPC guitar in Blender; export the web mesh and a still.

Run in Blender's Python context. Existing scenes are preserved. All dimensions
are art-direction units; the glTF exporter converts Blender Z-up to web Y-up.
"""
from pathlib import Path
from math import pi, sin, cos
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'frontend-starter' / 'public' / 'models'
ASSETS.mkdir(parents=True, exist_ok=True)

scene = bpy.data.scenes.get('GPC — Obsidian')
if scene:
    for obj in list(scene.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
else:
    scene = bpy.data.scenes.new('GPC — Obsidian')
bpy.context.window.scene = scene


def material(name, color, metal=0, rough=.3, coat=0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Coat Weight'].default_value = coat
    shader.inputs['Coat Roughness'].default_value = .16
    mat.diffuse_color = (*color, 1)
    return mat


lacquer = material('GPC / Obsidian lacquer', (.004, .005, .009), .22, .20, .9)
edge = material('GPC / Graphite binding', (.055, .058, .065), .85, .28)
chrome = material('GPC / Nickel hardware', (.58, .62, .68), .95, .19)
dark = material('GPC / Black polymer', (.009, .008, .012), .1, .35)
wood = material('GPC / Ebony fretboard', (.010, .005, .006), .0, .48)
pearl = material('GPC / Pearl inlays', (.72, .69, .68), .35, .25)
steel = material('GPC / Steel strings', (.42, .45, .50), .9, .28)


def finish(obj, name, mat, bevel=0):
    obj.name = name
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Machined edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def box(name, location, size, mat, bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, bevel)


def cylinder(name, location, radius, depth, mat, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                     location=location, rotation=(pi/2, 0, 0))
    return finish(bpy.context.object, name, mat, .006)


def wire(name, points, radius, mat):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new('POLY')
    spline.points.add(len(points)-1)
    for point, co in zip(spline.points, points):
        point.co = (*co, 1)
    obj = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object, name, mat)


def outline(name, points, depth, bevel, mat, y=0, smooth=True):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '2D'
    curve.fill_mode = 'BOTH'
    curve.resolution_u = 12
    curve.extrude = depth
    curve.bevel_depth = bevel
    curve.bevel_resolution = 4
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for point, co in zip(spline.bezier_points, points):
        point.co = (*co, 0)
        point.handle_left_type = 'AUTO' if smooth else 'VECTOR'
        point.handle_right_type = 'AUTO' if smooth else 'VECTOR'
    spline.use_cyclic_u = True
    obj = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(obj)
    obj.rotation_euler.x = pi/2
    obj.location.y = y
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object, name, mat)


# A carved, asymmetric double-cutaway silhouette, with a fine inset binding.
silhouette = [(0,.05),(-.64,.12),(-.94,.42),(-1,.77),(-.85,1.18),
              (-.78,1.49),(-.83,1.88),(-.66,2.28),(-.43,2.53),
              (-.40,2.18),(-.29,1.92),(0,1.90),(.29,1.92),
              (.40,2.12),(.48,2.37),(.69,2.15),(.79,1.84),
              (.73,1.49),(.88,1.16),(1,.73),(.92,.39),(.61,.12)]
outline('Carved solid body', silhouette, .12, .075, lacquer)
outline('Fine nickel body binding', [(x*.97, z*.98+.02) for x,z in silhouette],
        .004, .012, edge, -.18)
outline('Contoured ebony top', [(x*.945, z*.955+.045) for x,z in silhouette],
        .018, .06, lacquer, -.193)

# Neck and tapered fingerboard. Front faces point toward negative Y.
box('Set neck', (0,.005,3.33), (.40,.24,3.1), lacquer, .085)
outline('Fingerboard', [(-.242,1.89),(-.20,4.89),(.20,4.89),(.242,1.89)],
        .018, .009, wood, -.185, smooth=False)
wire('Left neck binding', [(-.248,-.204,1.9),(-.205,-.204,4.9)], .008, pearl)
wire('Right neck binding', [(.248,-.204,1.9),(.205,-.204,4.9)], .008, pearl)

nut_z = 4.86
scale_length = 4.16
box('Bone nut', (0,-.227,nut_z), (.414,.062,.043), pearl, .007)
for fret in range(1,25):
    z = nut_z - scale_length * (1 - 2**(-fret/12))
    width = .2 + (nut_z-z)/3*.042
    wire('Fret %02d' % fret, [(-width,-.228,z),(width,-.228,z)], .011, chrome)
    if fret in (3,5,7,9,12,15,17,19,21):
        prev_z = nut_z - scale_length * (1 - 2**(-(fret-1)/12))
        mid = (z+prev_z)/2
        inlay = box('Pearl fret marker %02d' % fret, (0,-.208,mid),
                    (.17 if fret != 12 else .23,.012,min((prev_z-z)*.4,.07)), pearl, .006)
        cylinder('Side fret dot', (-width-.008,-.18,mid), .012,.01,pearl,12)

# An original three-a-side headstock: no third-party logo.
outline('Headstock', [(-.18,4.86),(-.24,5.08),(-.29,5.72),(-.19,5.94),
                     (0,5.89),(.19,5.94),(.29,5.72),(.24,5.08),(.18,4.86)],
        .07,.024,lacquer,.015)
box('Truss rod cover', (0,-.09,5.06), (.13,.02,.24), dark, .025)
outline('Lightning pearl emblem', [(.035,5.66),(-.085,5.49),(-.005,5.49),
                                  (-.045,5.35),(.085,5.54),(.012,5.54)],
        .002,.002,pearl,-.086,smooth=False)
for side in (-1,1):
    for index in range(3):
        z = 5.2 + index*.235
        x = side*(.23 + index*.014)
        cylinder('Tuning washer', (x,-.092,z), .061,.018,chrome)
        cylinder('String tuning post', (x,-.13,z), .029,.075,chrome)
        box('Tuner shaft', (x+side*.09,.02,z), (.15,.052,.052),chrome,.014)
        box('Tuning key', (x+side*.18,.02,z), (.12,.092,.15),chrome,.04)

for z in (.99,1.61):
    box('Pickup surround', (0,-.276,z), (.68,.055,.31),dark,.028)
    box('Nickel humbucker', (0,-.317,z), (.56,.067,.245),chrome,.028)
    wire('Pickup separation', [(-.265,-.354,z),(.265,-.354,z)], .005,dark)
    for index in range(6):
        x = (index-2.5)*.083
        cylinder('Pickup pole', (x,-.356,z+.068), .018,.008,edge,12)
    for x in (-.31,.31):
        cylinder('Pickup mounting screw', (x,-.31,z), .019,.012,chrome,12)

box('Tune-o-matic bridge', (0,-.325,.70), (.65,.12,.11),chrome,.026)
box('Stop tailpiece', (0,-.31,.43), (.66,.10,.105),chrome,.035)
for x in (-.29,.29):
    cylinder('Bridge stud', (x,-.34,.70), .033,.028,edge)
    cylinder('Tailpiece stud', (x,-.34,.43), .036,.026,edge)

for index in range(6):
    x = (index-2.5)*.081
    box('Bridge saddle', (x,-.397,.70), (.055,.021,.072),edge,.007)
    tuner_index = index if index < 3 else 5-index
    tuner_x = (-1 if index<3 else 1)*(.23+tuner_index*.014)
    tuner_z = 5.2+tuner_index*.235
    nut_x = (index-2.5)*.065
    wire('String %d' % (index+1), [(x,-.37,.43),(x,-.418,.70),
         (nut_x,-.268,nut_z),(tuner_x,-.169,tuner_z)], .0032+(5-index)*.0006,steel)

for x,z in ((.58,.91),(.73,.61),(.38,.40),(.57,.25)):
    cylinder('Control seat', (x,-.274,z), .109,.025,chrome)
    cylinder('Knurled black control', (x,-.32,z), .09,.08,dark,32)
    cylinder('Control cap', (x,-.366,z), .075,.009,edge,32)
    wire('Control indicator', [(x,-.374,z+.04),(x,-.374,z+.07)],.004,pearl)
    for a in range(20):
        angle = a*2*pi/20
        wire('Knurl',[(x+.088*cos(angle),-.30,z+.088*sin(angle)),
                      (x+.088*cos(angle),-.35,z+.088*sin(angle))],.002,edge)
cylinder('Toggle switch base', (.58,-.26,1.36),.055,.03,chrome)
wire('Toggle switch',[(.58,-.28,1.36),(.58,-.38,1.40)],.016,chrome)
cylinder('Strap pin', (0,.01,.00),.045,.06,chrome)

# Merge by material for a small number of draw calls; preserve component names
# in this script, rather than shipping hundreds of individual hardware meshes.
for mat in (lacquer,edge,chrome,dark,wood,pearl,steel):
    group = [o for o in scene.objects if o.type == 'MESH' and o.data.materials[0] == mat]
    bpy.ops.object.select_all(action='DESELECT')
    for obj in group:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = group[0]
    if len(group) > 1:
        bpy.ops.object.join()
    group[0].name = mat.name

guitar = [o for o in scene.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for obj in guitar:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ASSETS/'obsidian-guitar.glb'),
                          export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True)

# Studio setup stays in the .blend; only the guitar is in the GLB.
scene.world = bpy.data.worlds.new('GPC / Dark studio')
scene.world.use_nodes = True
background = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
background.inputs['Color'].default_value = (.09,.07,.12,1)
background.inputs['Strength'].default_value = .25

def area(name, position, energy, color, size, target=(0,0,2.7), size_y=None):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.color = color
    data.shape = 'RECTANGLE'
    data.size = size
    data.size_y = size_y or size
    obj = bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location = position
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

area('White softbox',(-3,-4,5),650,(.85,.88,1),3,size_y=5)
area('Lavender rim',(3,1,4),950,(.59,.30,1),2,size_y=6)
area('Vertical reflection',(-2,-1,2),350,(.77,.52,1),.5,size_y=5)
area('Neck light',(1,-3,7),500,(1,.89,.78),2)
camera_data = bpy.data.cameras.new('GPC / Portrait camera')
camera = bpy.data.objects.new('GPC / Portrait camera',camera_data)
scene.collection.objects.link(camera)
camera.location = (3,-12,4.7)
camera.rotation_euler = (Vector((0,0,2.95))-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 6.6
scene.camera = camera
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 800
scene.render.resolution_y = 1100
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'WEBP'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.quality = 90
scene.render.filepath = str(ASSETS/'obsidian-guitar.webp')
scene.view_settings.view_transform = 'AgX'

for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type == 'VIEW_3D':
            view = a.spaces.active.region_3d
            view.view_location = Vector((0,0,2.95))
            view.view_distance = 8
            view.view_rotation = camera.rotation_euler.to_quaternion()
            view.view_perspective = 'ORTHO'
            view.update()
            a.spaces.active.shading.type = 'MATERIAL'
            a.spaces.active.overlay.show_overlays = False
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'design'/'blender'/'obsidian-guitar.blend'),compress=True)
print({'meshes':len(guitar),'vertices':sum(len(o.data.vertices) for o in guitar),
       'glb_bytes':(ASSETS/'obsidian-guitar.glb').stat().st_size})
