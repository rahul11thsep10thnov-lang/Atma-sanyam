"""Where things can stand in the garden and what gets rendered where.

SLOTS: id → position (metres, floor z from the terrain), kind, group, label.
ITEMS: id → (builder, kwargs, {slot: [rotations]}, meta).
"""
from .garden import ground_height

FOCUS_SLOT = "focus_tree"


def _floor(x, y, group, label, rot=0.0):
    return {"pos": (x, y, ground_height(x, y)), "kind": "floor", "group": group, "label": label, "rot": rot}


SLOTS = {
    # the camera looks up the garden from the house steps; the frame is a wedge that is only
    # ~2.5 m wide at the near end, so everything lives to the right of the path or well back
    FOCUS_SLOT: _floor(-0.7, 6.6, "tree", "Your tree"),
    "lawn_near_l": _floor(0.55, 3.9, "plant", "Lawn, by the path"),
    "lawn_near_r": _floor(1.0, 2.0, "plant", "Lawn, near right"),
    "lawn_mid_r": _floor(1.5, 7.0, "plant", "Lawn, mid right"),
    "lawn_far_l": _floor(-0.9, 9.6, "plant", "Lawn, far side"),
    "lawn_far_r": _floor(1.3, 11.0, "plant", "Lawn, by the gate"),
    "bed_l": _floor(-1.0, 11.0, "bed", "Back bed", rot=0),
    "bed_r": _floor(2.9, 6.6, "bed", "Right bed", rot=0),
    "path_near": _floor(1.1, 0.45, "small", "Beside the path"),
    "path_far": _floor(-2.3, 12.6, "small", "Further along the path"),
    "seat": _floor(1.6, 5.1, "seat", "The seat", rot=-115),
    "seat_far": _floor(0.0, 12.6, "seat", "By the back fence", rot=-10),
    "feature": _floor(0.6, 9.0, "feature", "The lawn's focal point"),
    "arch": _floor(-2.1, 8.0, "arch", "Over the path", rot=-22),
    "corner_far": _floor(-4.3, 13.4, "big", "Far corner", rot=20),
    "corner_far_r": _floor(5.0, 12.6, "big", "Far right corner", rot=-20),
    "house_l": _floor(-0.1, 5.4, "fixture", "Mid lawn, by the path", rot=0),
    "house_r": _floor(1.6, 1.2, "fixture", "Lawn edge, right", rot=0),
    "easel": _floor(2.55, 4.1, "art", "The easel", rot=-150),
    "branch": {"pos": (2.1, 3.2, 2.0), "kind": "hanging", "group": "hanging", "label": "The frangipani branch"},
}

PLANT_SLOTS = {"lawn_near_l": [0], "lawn_near_r": [0], "lawn_mid_r": [0], "lawn_far_l": [0], "bed_l": [0], "bed_r": [0]}

ITEMS = {
    # growable plants render every stage, healthy and wilted, in each of their slots
    "marigold": ("marigold", {}, {"bed_r": [0], "path_near": [0]}, {"name": "Marigold", "category": "PLANTS", "growable": True}),
    "hibiscus": ("hibiscus", {}, {"lawn_near_l": [0], "lawn_mid_r": [0]}, {"name": "Hibiscus", "category": "PLANTS", "growable": True}),
    "rose_bush": ("rose_bush", {}, {"bed_l": [0], "lawn_near_r": [0]}, {"name": "Rose bush", "category": "PLANTS", "growable": True}),
    "jasmine": ("jasmine", {}, {"lawn_far_l": [0], "bed_l": [0]}, {"name": "Jasmine", "category": "PLANTS", "growable": True}),
    "bougainvillea": ("bougainvillea", {}, {"lawn_mid_r": [0], "corner_far_r": [0]}, {"name": "Bougainvillea", "category": "PLANTS", "growable": True}),
    "croton": ("croton", {}, {"lawn_near_r": [0], "bed_r": [0], "house_r": [0]}, {"name": "Croton", "category": "PLANTS"}),
    "banana_plant": ("banana_plant", {}, {"lawn_far_l": [0], "corner_far_r": [0], "house_l": [0]}, {"name": "Banana plant", "category": "PLANTS"}),
    "lemon_tree": ("lemon_tree", {}, {"lawn_mid_r": [0], "lawn_far_r": [0], "corner_far": [0]}, {"name": "Lemon tree", "category": "TREES"}),
    "ornamental_grass": ("ornamental_grass", {}, {"path_near": [0], "path_far": [0], "lawn_near_l": [0]}, {"name": "Fountain grass", "category": "PLANTS"}),
    "frangipani_small": ("frangipani_small", {}, {"lawn_far_r": [0], "corner_far": [0]}, {"name": "Frangipani", "category": "TREES"}),
    "mango_sapling": ("mango_sapling", {}, {"lawn_far_l": [0], "lawn_far_r": [0], "corner_far_r": [0]}, {"name": "Mango sapling", "category": "TREES"}),
    "ashoka_tree": ("ashoka_tree", {}, {"corner_far": [0], "corner_far_r": [0], "house_l": [0]}, {"name": "Ashoka tree", "category": "TREES"}),
    "tulsi": ("tulsi", {}, {"path_near": [0], "path_far": [0], "house_r": [0]}, {"name": "Tulsi", "category": "PLANTS"}),
    "areca_palm": ("areca_palm", {}, {"house_l": [0], "house_r": [0], "corner_far": [0]}, {"name": "Areca palm", "category": "PLANTS"}),
    "garden_bench": ("garden_bench", {}, {"seat": [0], "seat_far": [0]}, {"name": "Teak bench", "category": "FURNITURE"}),
    "wooden_swing": ("wooden_swing", {}, {"seat_far": [0], "corner_far_r": [0]}, {"name": "Wooden swing", "category": "FURNITURE"}),
    "cafe_set": ("cafe_set", {}, {"seat": [0], "lawn_mid_r": [0]}, {"name": "Café set", "category": "FURNITURE"}),
    "wooden_cart": ("wooden_cart", {}, {"house_r": [0], "lawn_far_r": [0]}, {"name": "Flower cart", "category": "FURNITURE"}),
    "garden_table": ("garden_table", {}, {"lawn_mid_r": [0], "seat_far": [0]}, {"name": "Garden table", "category": "FURNITURE"}),
    "brass_lantern": ("brass_lantern", {}, {"path_near": [0], "path_far": [0]}, {"name": "Brass lantern", "category": "LIGHTING", "lit": True}),
    "stone_lantern": ("stone_lantern", {}, {"path_far": [0], "lawn_near_l": [0]}, {"name": "Stone lantern", "category": "LIGHTING", "lit": True}),
    "fountain": ("fountain", {}, {"feature": [0]}, {"name": "Stone fountain", "category": "DECOR", "water": True}),
    "birdbath": ("birdbath", {}, {"feature": [0], "lawn_mid_r": [0]}, {"name": "Birdbath", "category": "DECOR"}),
    "birdhouse_post": ("birdhouse_post", {}, {"lawn_far_l": [0], "corner_far": [0]}, {"name": "Birdhouse", "category": "DECOR"}),
    "bird_feeder": ("bird_feeder", {}, {"branch": [0]}, {"name": "Bird feeder", "category": "DECOR"}),
    "wind_chime": ("wind_chime", {}, {"branch": [0]}, {"name": "Wind chime", "category": "DECOR"}),
    "hanging_basket": ("hanging_basket", {}, {"branch": [0]}, {"name": "Hanging basket", "category": "PLANTS"}),
    "decorative_rocks": ("decorative_rocks", {}, {"path_far": [0], "lawn_near_r": [0]}, {"name": "Decorative rocks", "category": "DECOR"}),
    "stone_urn": ("stone_urn", {}, {"path_near": [0], "house_l": [0], "feature": [0]}, {"name": "Stone urn", "category": "DECOR"}),
    "pergola": ("pergola", {}, {"corner_far": [0], "corner_far_r": [0]}, {"name": "Pergola", "category": "STRUCTURE"}),
    "flower_arch": ("flower_arch", {}, {"arch": [0]}, {"name": "Flower arch", "category": "STRUCTURE"}),
    "trellis_climber": ("trellis_climber", {}, {"house_l": [0], "house_r": [0]}, {"name": "Trellis", "category": "STRUCTURE"}),
    "string_lights": ("string_lights", {}, {"lawn_far_l": [0], "corner_far_r": [0]}, {"name": "String lights", "category": "LIGHTING", "lit": True}),
    "urli_bowl": ("urli_bowl", {}, {"path_near": [0], "feature": [0]}, {"name": "Brass urli", "category": "DECOR"}),
    "diya_stand": ("diya_stand", {}, {"path_near": [0], "path_far": [0]}, {"name": "Diya stand", "category": "LIGHTING", "lit": True}),
    "matka_cluster": ("matka_cluster", {}, {"house_l": [0], "house_r": [0], "path_far": [0]}, {"name": "Matkas", "category": "DECOR"}),
    "terracotta_trio": ("terracotta_trio", {}, {"house_r": [0], "path_near": [0], "lawn_near_r": [0]}, {"name": "Terracotta pots", "category": "PLANTS"}),
    # fixtures of the garden itself
    "dustbin": ("dustbin", {}, {"house_r": [0]}, {"name": "Dustbin", "category": "FIXTURE", "fixed": True}),
    "image_rack": ("image_rack", {}, {"house_l": [0]}, {"name": "Picture rack", "category": "FIXTURE", "fixed": True, "stack": True}),
    "easel": ("easel", {}, {"easel": [0]}, {"name": "Easel", "category": "WALL_ART", "art": True}),
    "dead_sapling": ("dead_sapling", {}, {"lawn_near_r": [0], "lawn_far_l": [0], "path_far": [0]}, {"name": "Wilted sapling", "category": "PENALTY"}),
    "broken_frame": ("broken_frame", {}, {"house_l": [0], "path_near": [0]}, {"name": "Broken picture", "category": "PENALTY"}),
}

# items whose look depends on the lighting state (lamps)
LIT_ITEMS = {k for k, v in ITEMS.items() if v[3].get("lit")}
