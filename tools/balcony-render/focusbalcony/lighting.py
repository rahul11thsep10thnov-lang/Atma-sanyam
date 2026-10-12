"""Lighting states shared by the garden and the room: morning, afternoon,
sunset, evening, night and rain. Each state sets the sun, the sky and the
colour of the haze; scenes add their own lamps for the dark states."""
import math
import bpy
from mathutils import Vector

from .common import DEG

STATES = {
    # name: sun elevation, sun azimuth (deg from +Y toward +X), sun strength, sun colour,
    #       sky strength, sky (air, aerosol, ozone), overcast colour or None, lamps on
    "morning": dict(el=17.0, az=112.0, sun=5.5, sun_col=(1.0, 0.82, 0.6), sky=0.45, air=1.3, aero=3.5, lamps=False, overcast=None),
    "afternoon": dict(el=58.0, az=170.0, sun=7.5, sun_col=(1.0, 0.97, 0.92), sky=0.6, air=1.0, aero=1.5, lamps=False, overcast=None),
    "sunset": dict(el=5.0, az=262.0, sun=3.2, sun_col=(1.0, 0.55, 0.3), sky=0.5, air=1.6, aero=5.0, lamps=False, overcast=None),
    "evening": dict(el=-5.0, az=270.0, sun=0.0, sun_col=(1.0, 0.6, 0.4), sky=0.55, air=1.6, aero=4.0, lamps=True, overcast=None),
    "night": dict(el=-25.0, az=300.0, sun=0.0, sun_col=(1, 1, 1), sky=0.0, air=1.0, aero=1.0, lamps=True, overcast=(0.006, 0.01, 0.03), moon=True),
    "rain": dict(el=30.0, az=180.0, sun=0.0, sun_col=(1, 1, 1), sky=0.0, air=1.0, aero=1.0, lamps=False, overcast=(0.32, 0.35, 0.4), wet=True),
}

# how the haze reads in each state (used by scenes' hazed materials)
HAZE = {
    "morning": (0.72, 0.64, 0.52),
    "afternoon": (0.75, 0.78, 0.82),
    "sunset": (0.85, 0.5, 0.32),
    "evening": (0.35, 0.3, 0.38),
    "night": (0.03, 0.04, 0.08),
    "rain": (0.5, 0.52, 0.55),
}


def sun_direction(state, azimuth=None):
    s = STATES[state]
    el, az = s["el"] * DEG, (azimuth if azimuth is not None else s["az"]) * DEG
    return Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))


def build(state="morning", azimuth=None, sky_scale=1.0):
    """World + sun for the state. Returns the sun object (or None).
    `azimuth` maps state → sun azimuth for scenes facing another way."""
    s = dict(STATES[state])
    if azimuth and state in azimuth:
        s["az"] = azimuth[state]
    sc = bpy.context.scene
    world = bpy.data.worlds.new(f"world_{state}")
    sc.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    if s["overcast"]:
        bg.inputs["Color"].default_value = (*s["overcast"], 1)
        bg.inputs["Strength"].default_value = 1.0 * sky_scale
    else:
        sky = nt.nodes.new("ShaderNodeTexSky")
        sky.sky_type = "MULTIPLE_SCATTERING"
        sky.sun_disc = False
        sky.sun_elevation = max(-6.0, s["el"]) * DEG
        sky.sun_rotation = (180.0 - s["az"]) * DEG
        sky.air_density = s["air"]
        sky.aerosol_density = s["aero"]
        sky.altitude = 30.0
        bg.inputs["Strength"].default_value = s["sky"] * sky_scale
        nt.links.new(sky.outputs[0], bg.inputs[0])
    nt.links.new(bg.outputs[0], out.inputs[0])

    sun = None
    if s["sun"] > 0:
        data = bpy.data.lights.new("sun", "SUN")
        data.energy = s["sun"]
        data.angle = (0.6 if state != "sunset" else 1.2) * DEG
        data.color = s["sun_col"]
        sun = bpy.data.objects.new("sun", data)
        d = sun_direction(state, s["az"])
        sun.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        sc.collection.objects.link(sun)
    elif s.get("moon"):
        data = bpy.data.lights.new("moon", "SUN")
        data.energy = 0.05
        data.angle = 2.0 * DEG
        data.color = (0.62, 0.72, 1.0)
        sun = bpy.data.objects.new("moon", data)
        el, az = 38 * DEG, 300 * DEG
        d = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))
        sun.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        sc.collection.objects.link(sun)
    return sun


def point_lamp(col, name, location, energy=25.0, color=(1.0, 0.72, 0.45), radius=0.08):
    data = bpy.data.lights.new(name, "POINT")
    data.energy = energy
    data.color = color
    data.shadow_soft_size = radius
    lamp = bpy.data.objects.new(name, data)
    lamp.location = location
    col.objects.link(lamp)
    return lamp


def wet(state):
    return bool(STATES[state].get("wet"))


def lamps_on(state):
    return bool(STATES[state]["lamps"])
