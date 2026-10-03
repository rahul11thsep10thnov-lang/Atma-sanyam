"""Where things can go in the room and what gets rendered where.

Surface slots `requires` the furniture that carries them: when that piece is
put away, the app returns whatever stood on it to the inventory.
"""
from .room import HD, HW, H

FOCUS_SLOT = "focus_pot"


def _floor(x, y, group, label, rot=0.0, requires=None, z=0.0):
    d = {"pos": (x, y, z), "kind": "floor", "group": group, "label": label, "rot": rot}
    if requires:
        d["requires"] = requires
    return d


def _wall(x, y, z, rot, label):
    return {"pos": (x, y, z), "kind": "wall", "group": "wall", "label": label, "rot": rot}


SLOTS = {
    FOCUS_SLOT: _floor(-0.05, 0.9, "plant", "Beside the bed"),
    # floor
    "bedside": _floor(0.15, 2.3, "bedside", "Beside the bed head", rot=0),
    "corner_door": _floor(1.25, 1.3, "floor", "By the door"),
    "desk": _floor(1.05, 2.3, "desk", "Under the art wall", rot=0),
    "chair": _floor(0.65, 1.3, "chair", "Middle of the room", rot=35),
    "table": _floor(1.0, 0.45, "table", "Near the window light", rot=0),
    "floor_mid": _floor(0.3, 0.1, "floor", "On the floor, centre"),
    "floor_near": _floor(0.5, -0.9, "floor", "On the floor, near"),
    "lean_wall": _floor(0.3, HD - 0.03, "lean", "Leaning on the far wall", rot=0),
    "rug": _floor(0.5, 0.6, "rug", "The rug", rot=0),
    "bed_foot": _floor(-0.8, 0.9, "bed", "Foot of the bed", z=0.56),
    # surfaces
    "bedside_top": _floor(0.15, 2.3, "small", "On the bedside table", z=0.6, requires="bedside"),
    "bedside_top_b": _floor(0.27, 2.2, "small", "On the bedside table, front", z=0.6, requires="bedside"),
    "table_top": _floor(1.0, 0.45, "small", "On the small table", z=0.5125, requires="table"),
    "desk_top": _floor(1.3, 2.3, "small", "On the desk", z=0.76, requires="desk"),
    "desk_top_b": _floor(0.75, 2.35, "small", "On the desk, left", z=0.76, requires="desk"),
    "sill": _floor(-HW + 0.03, 2.05, "small", "On the window sill", z=0.985),
    "sill_b": _floor(-HW + 0.03, 1.7, "small", "On the window sill, near", z=0.985),
    # walls
    "art_main": _wall(1.0, HD - 0.005, 1.65, 0, "The art wall"),
    "art_side": _wall(-0.3, HD - 0.005, 1.5, 0, "Beside the bed head"),
    "art_bed": _wall(-1.0, HD - 0.005, 1.85, 0, "Above the bed"),
    "wall_right": _wall(1.5, HD - 0.005, 1.5, 0, "The far wall, right"),
    # ceiling
    "ceiling": {"pos": (0.6, 1.0, H), "kind": "hanging", "group": "hanging", "label": "The ceiling hook"},
}

ITEMS = {
    # furniture
    "bedside_table": ("bedside_table", {}, {"bedside": [0]}, {"name": "Bedside table", "category": "FURNITURE", "carries": ["bedside_top", "bedside_top_b"]}),
    "table_lamp": ("table_lamp", {}, {"bedside_top": [0], "desk_top": [0], "table_top": [0]}, {"name": "Table lamp", "category": "LIGHTING", "lit": True}),
    "side_chair": ("side_chair", {}, {"chair": [0, -40], "corner_door": [20]}, {"name": "Cane chair", "category": "FURNITURE"}),
    "small_table": ("small_table", {}, {"table": [0], "floor_mid": [0]}, {"name": "Small table", "category": "FURNITURE", "carries": ["table_top"]}),
    "study_desk": ("study_desk", {}, {"desk": [0]}, {"name": "Study desk", "category": "FURNITURE", "carries": ["desk_top", "desk_top_b"]}),
    "bookshelf": ("bookshelf", {}, {"corner_door": [0], "desk": [0]}, {"name": "Bookshelf", "category": "FURNITURE"}),
    "lounge_chair": ("lounge_chair", {}, {"chair": [30], "corner_door": [40]}, {"name": "Lounge chair", "category": "FURNITURE"}),
    "floor_cushions": ("floor_cushions", {}, {"floor_mid": [0], "floor_near": [0]}, {"name": "Floor cushions", "category": "TEXTILES"}),
    "cabinet": ("cabinet", {}, {"desk": [0], "corner_door": [0]}, {"name": "Teak cabinet", "category": "FURNITURE"}),
    "floor_lamp": ("floor_lamp", {}, {"corner_door": [0], "floor_mid": [0]}, {"name": "Floor lamp", "category": "LIGHTING", "lit": True}),
    "pouf": ("pouf", {}, {"floor_mid": [0], "floor_near": [0]}, {"name": "Pouf", "category": "TEXTILES"}),
    "dhurrie_rug": ("dhurrie_rug", {"length": 2.0, "width": 1.4}, {"rug": [90]}, {"name": "Dhurrie rug", "category": "RUGS", "flat": True}),
    # plants
    "monstera": ("monstera", {}, {"corner_door": [0], "floor_mid": [0]}, {"name": "Monstera", "category": "PLANTS"}),
    "bonsai": ("bonsai", {}, {"table_top": [0], "desk_top": [0], "sill": [0]}, {"name": "Bonsai", "category": "PLANTS"}),
    "fiddle_fig": ("fiddle_fig", {}, {"corner_door": [0], "floor_mid": [0]}, {"name": "Fiddle-leaf fig", "category": "PLANTS"}),
    "rubber_plant": ("rubber_plant", {}, {"corner_door": [0], "floor_mid": [0]}, {"name": "Rubber plant", "category": "PLANTS"}),
    "snake_plant": ("snake_plant", {"height": 0.7}, {"corner_door": [0], "floor_near": [0]}, {"name": "Snake plant", "category": "PLANTS"}),
    "pothos_table": ("pothos_hanging", {"drop": 0.0}, {"ceiling": [0]}, {"name": "Hanging pothos", "category": "PLANTS"}),
    "succulent": ("succulent", {}, {"sill": [0], "sill_b": [0], "bedside_top_b": [0]}, {"name": "Succulent", "category": "PLANTS"}),
    "aloe": ("aloe", {}, {"sill": [0], "sill_b": [0], "table_top": [0]}, {"name": "Aloe vera", "category": "PLANTS"}),
    "dried_branches": ("dried_branches", {}, {"corner_door": [0], "lean_wall": [0]}, {"name": "Dried branches", "category": "FLOWERS"}),
    "pampas": ("pampas", {}, {"corner_door": [0], "floor_near": [0]}, {"name": "Pampas grass", "category": "FLOWERS"}),
    "orchid": ("orchid", {}, {"table_top": [0], "desk_top": [0], "bedside_top": [0]}, {"name": "Orchid", "category": "FLOWERS"}),
    "fresh_flowers": ("fresh_flowers", {}, {"table_top": [0], "desk_top_b": [0], "sill": [0]}, {"name": "Fresh flowers", "category": "FLOWERS"}),
    # vessels
    "ceramic_vase": ("ceramic_vase", {}, {"table_top": [0], "desk_top_b": [0], "sill_b": [0]}, {"name": "Ceramic vase", "category": "VASES"}),
    "brass_vase": ("brass_vase", {}, {"bedside_top_b": [0], "desk_top": [0], "sill": [0]}, {"name": "Brass vase", "category": "VASES"}),
    "terracotta_vase": ("terracotta_vase", {}, {"floor_near": [0], "corner_door": [0]}, {"name": "Terracotta floor vase", "category": "VASES"}),
    "glass_vase": ("glass_vase", {}, {"table_top": [0], "sill": [0], "desk_top": [0]}, {"name": "Glass vase with eucalyptus", "category": "VASES"}),
    "ceramic_bowl": ("ceramic_bowl", {}, {"table_top": [0], "bedside_top": [0], "desk_top_b": [0]}, {"name": "Ceramic bowl", "category": "BOWLS"}),
    "marble_bowl": ("marble_bowl", {}, {"table_top": [0], "desk_top": [0]}, {"name": "Marble bowl", "category": "BOWLS"}),
    "brass_tray": ("brass_tray", {}, {"table_top": [0], "bed_foot": [0]}, {"name": "Brass tray", "category": "BOWLS"}),
    "fruit_bowl": ("fruit_bowl", {}, {"table_top": [0], "desk_top": [0]}, {"name": "Fruit bowl", "category": "BOWLS"}),
    "rattan_basket": ("rattan_basket", {}, {"floor_near": [0], "floor_mid": [0], "corner_door": [0]}, {"name": "Rattan basket", "category": "NATURAL"}),
    # candles and lights
    "pillar_candles": ("pillar_candles", {}, {"table_top": [0], "sill_b": [0], "bedside_top_b": [0]}, {"name": "Pillar candles", "category": "CANDLES", "lit": True}),
    "scented_candle": ("scented_candle", {}, {"bedside_top_b": [0], "sill": [0], "table_top": [0]}, {"name": "Scented candle", "category": "CANDLES", "lit": True}),
    "hurricane_lantern": ("hurricane_lantern", {}, {"floor_near": [0], "sill": [0], "desk_top": [0]}, {"name": "Hurricane lantern", "category": "CANDLES", "lit": True}),
    "ceramic_lamp": ("ceramic_lamp", {}, {"bedside_top": [0], "desk_top": [0]}, {"name": "Ceramic lamp", "category": "LIGHTING", "lit": True}),
    "brass_lamp": ("brass_lamp", {}, {"bedside_top": [0], "desk_top": [0]}, {"name": "Brass lamp", "category": "LIGHTING", "lit": True}),
    "wall_sconce": ("wall_sconce", {}, {"art_side": [0], "wall_right": [0]}, {"name": "Wall sconce", "category": "LIGHTING", "lit": True}),
    "pendant_light": ("pendant_light", {}, {"ceiling": [0]}, {"name": "Rattan pendant", "category": "LIGHTING", "lit": True}),
    "lantern": ("lantern", {}, {"floor_near": [0], "corner_door": [0]}, {"name": "Iron lantern", "category": "CANDLES", "lit": True}),
    # objects
    "book_stack": ("book_stack", {}, {"bedside_top": [0], "table_top": [0], "desk_top_b": [0]}, {"name": "Stack of books", "category": "BOOKS"}),
    "bookends": ("bookends", {}, {"desk_top": [0], "sill": [0]}, {"name": "Books with bookends", "category": "BOOKS"}),
    "globe": ("globe", {}, {"desk_top": [0], "table_top": [0]}, {"name": "Miniature globe", "category": "BOOKS"}),
    "mantel_clock": ("mantel_clock", {}, {"desk_top": [0], "bedside_top": [0]}, {"name": "Mantel clock", "category": "VINTAGE"}),
    "vintage_camera": ("vintage_camera", {}, {"desk_top_b": [0], "bedside_top_b": [0]}, {"name": "Vintage camera", "category": "VINTAGE"}),
    "gramophone": ("gramophone", {}, {"table_top": [0], "desk_top": [0]}, {"name": "Gramophone", "category": "VINTAGE"}),
    "vintage_telephone": ("vintage_telephone", {}, {"desk_top": [0], "bedside_top": [0]}, {"name": "Vintage telephone", "category": "VINTAGE"}),
    "brass_diya": ("brass_diya", {}, {"sill_b": [0], "table_top": [0], "bedside_top_b": [0]}, {"name": "Brass diya", "category": "INDIAN", "lit": True}),
    "kalash": ("kalash", {}, {"table_top": [0], "sill": [0]}, {"name": "Kalash", "category": "INDIAN"}),
    "wooden_elephant": ("wooden_elephant", {}, {"floor_near": [0], "table_top": [0], "desk_top_b": [0]}, {"name": "Carved elephant", "category": "INDIAN"}),
    "jharokha": ("jharokha", {}, {"art_side": [0], "art_bed": [0]}, {"name": "Jharokha", "category": "INDIAN"}),
    "urli_bowl": ("urli_bowl", {}, {"floor_near": [0], "floor_mid": [0]}, {"name": "Brass urli", "category": "INDIAN"}),
    "marble_sculpture": ("marble_sculpture", {}, {"desk_top": [0], "table_top": [0]}, {"name": "Marble sculpture", "category": "LUXURY"}),
    "round_mirror": ("round_mirror", {}, {"art_side": [0], "art_bed": [0]}, {"name": "Round mirror", "category": "MIRRORS"}),
    "arched_mirror": ("arched_mirror", {}, {"lean_wall": [0]}, {"name": "Arched mirror", "category": "MIRRORS"}),
    "knitted_blanket": ("knitted_blanket", {}, {"bed_foot": [0]}, {"name": "Knitted blanket", "category": "TEXTILES"}),
    "old_map": ("old_map", {}, {"art_main": [0], "art_bed": [0]}, {"name": "Antique map", "category": "ART"}),
    # art frames for the jigsaw artworks (one per wall slot)
    "art_frame": ("art_frame", {}, {"art_main": [0], "art_bed": [0], "art_side": [0]}, {"name": "Teak frame", "category": "WALL_ART", "art": True}),
    "dead_sapling": ("dead_sapling", {}, {"floor_near": [0], "corner_door": [0]}, {"name": "Wilted sapling", "category": "PENALTY"}),
    "broken_frame": ("broken_frame", {}, {"lean_wall": [0], "floor_near": [0]}, {"name": "Broken picture", "category": "PENALTY"}),
}

LIT_ITEMS = {k for k, v in ITEMS.items() if v[3].get("lit")}
