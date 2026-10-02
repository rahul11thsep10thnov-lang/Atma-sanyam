"""FOCUS photoreal balcony — Blender scene + layer renderer.

Everything the app shows on the Balcony tab is rendered here with Cycles
from one fixed architectural camera, then composited on device:

    sky  →  landscape  →  architecture  →  objects (by depth)  →  foreground

Run through tools/balcony-render/render.py (see README.md there).
"""
