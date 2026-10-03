"""What gets rendered where. The app reads the same ids from the manifest.

Slots are fixed places in the photograph (a pre-rendered scene can only
show an object where it was rendered from this camera). Each item lists the
slots it was rendered for; moving it in edit mode snaps between them.
"""
SLOTS = {
    # floor — x, y on the floor plane (metres)
    "focus":       {"kind": "floor", "group": "plant", "pos": (0.6, 0.85, 0.0), "label": "Focus plant"},
    "near_left":   {"kind": "floor", "group": "plant", "pos": (-0.4, 0.9, 0.0), "label": "By the doors"},
    "rail_mid":    {"kind": "floor", "group": "plant", "pos": (1.12, 2.0, 0.0), "label": "Railing"},
    "rail_far":    {"kind": "floor", "group": "plant", "pos": (1.12, 4.6, 0.0), "label": "Far railing"},
    "corner_far":  {"kind": "floor", "group": "plant", "pos": (-0.95, 5.85, 0.0), "label": "Far corner"},
    "seating":     {"kind": "floor", "group": "seating", "pos": (-0.5, 2.7, 0.0), "label": "Seating"},
    "table":       {"kind": "floor", "group": "table", "pos": (0.4, 2.75, 0.0), "label": "Table"},
    "rug":         {"kind": "floor", "group": "rug", "pos": (0.0, 2.75, 0.0), "label": "Rug"},
    "lantern":     {"kind": "floor", "group": "small", "pos": (0.05, 1.95, 0.0), "label": "Beside the table"},
    "lounge":      {"kind": "floor", "group": "lounge", "pos": (-0.85, 4.6, 0.0), "label": "Along the glass"},
    # ceiling hooks — the item origin is the hook
    "hang_near":   {"kind": "hanging", "group": "hanging", "pos": (0.95, 1.6, 3.0), "label": "Hook by the railing"},
    "hang_far":    {"kind": "hanging", "group": "hanging", "pos": (0.6, 3.9, 3.0), "label": "Far hook"},
    # walls — origin on the wall surface
    "art":         {"kind": "wall", "group": "art", "pos": (0.05, 6.39, 1.55), "rot": 0, "label": "Art wall"},
    "shelf":       {"kind": "wall", "group": "shelf", "pos": (-1.17, 3.3, 1.45), "rot": 90, "label": "Wall shelf"},
}

# item id → (builder, kwargs, {slot: [rotation_z degrees per variant]}, meta)
ITEMS = {
    "cane_lounge_chair": ("cane_lounge_chair", {}, {"seating": [58, 28]},
                          {"name": "Cane lounge chair", "category": "FURNITURE"}),
    "teak_coffee_table": ("teak_coffee_table", {}, {"table": [0]},
                          {"name": "Teak coffee table", "category": "TABLES"}),
    "dhurrie_rug": ("dhurrie_rug", {}, {"rug": [90]}, {"name": "Handwoven dhurrie", "category": "RUGS", "flat": True}),
    "lantern": ("lantern", {}, {"lantern": [20]}, {"name": "Iron lantern", "category": "LIGHTING"}),
    "daybed": ("daybed", {}, {"lounge": [90]}, {"name": "Teak daybed", "category": "FURNITURE"}),
    "study_set": ("study_set", {}, {"lounge": [90]}, {"name": "Study corner", "category": "FURNITURE"}),
    "snake_plant": ("snake_plant", {}, {"near_left": [0], "rail_mid": [0], "rail_far": [0], "corner_far": [0]},
                    {"name": "Snake plant", "category": "PLANTS", "growable": True}),
    "tulsi": ("tulsi", {}, {"near_left": [0], "rail_mid": [0], "rail_far": [0]},
              {"name": "Tulsi", "category": "PLANTS", "growable": True}),
    "areca_palm": ("areca_palm", {}, {"corner_far": [0], "rail_far": [0]},
                   {"name": "Areca palm", "category": "PLANTS", "growable": True}),
    "pothos_hanging": ("pothos_hanging", {}, {"hang_near": [0], "hang_far": [0]},
                       {"name": "Hanging money plant", "category": "PLANTS", "growable": True}),
    "wind_chime": ("wind_chime", {}, {"hang_near": [0], "hang_far": [0]}, {"name": "Brass wind chime", "category": "DECOR"}),
    "wall_shelf": ("wall_shelf", {}, {"shelf": [0]}, {"name": "Teak wall shelf", "category": "DECOR"}),
    "art_frame": ("art_frame", {}, {"art": [0]}, {"name": "Teak frame", "category": "WALL_ART"}),
    "dead_sapling": ("dead_sapling", {}, {"near_left": [0], "corner_far": [0]}, {"name": "Wilted sapling", "category": "PENALTY"}),
    "broken_frame": ("broken_frame", {}, {"lantern": [0], "near_left": [0]}, {"name": "Broken picture", "category": "PENALTY"}),
}

FOCUS_SLOT = "focus"
