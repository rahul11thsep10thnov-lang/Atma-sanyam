"""Category A: forests (15 designs)."""
from __future__ import annotations

from .env_kit import (FLOOR, SKY_COLOURS, TILE, At, BOB, L, L_far, L_fg, L_fx, L_ground, L_items, L_mid, L_sky, Row, Scatter, Shape, SCROLL, SWAY, ground_anchors,
                      water_anchors)
from .env_kit import build_ground  # noqa: F401  (re-exported for recipes that need a custom ground)
from .environments import reeds, ripples, water_body, water_front
from .scene_lib import haze, make_env, std_roles
from .svg import mix


def forest(*, sky="day", clouds=4, sun=None, moon=None, stars=0, far=None, back=("tree-oak",), back_n=14, back_s=(0.42, 0.62), back_haze=0.42,
           mid=("tree-oak",), mid_n=7, mid_s=(0.85, 1.15), mid_y=(335, 372), under=("bush-round",), under_n=10, under_s=(0.7, 1.1), flowers=(), flower_n=0,
           ground="grass", ground_top=FLOOR, fg=("bush-fern",), fg_n=5, fg_s=(1.1, 1.8), extras=(), fx=(), seat=None, river=None, pal=None, mid_pal=None,
           scare_fx=(), vines=0, framing=None, rocks=(), rock_n=0, mid_extra=(), seed=1):
    """Compose a forest from the common layers. Returns (layers, anchors)."""
    bottom = SKY_COLOURS[sky][1]
    layers = [L_sky(sky, seed, clouds=clouds, sun=sun, moon=moon, stars=stars)]
    if far:
        layers.append(L_far([At(cid, x, y, s) for cid, x, y, s in far], 0.3, "far_hills"))
    back_pal = haze(pal, bottom, back_haze)
    layers.append(L_far([Scatter(list(back), back_n, (-300, 2220), (392, 430), back_s, seed + 1, pal=back_pal)], 0.55, "back_trees", 2, tint="foliage"))
    mid_items = [Scatter(list(mid), mid_n, (-250, 2200), mid_y, mid_s, seed + 2, pal=mid_pal or pal or {})]
    mid_items += list(mid_extra)
    layers.append(L_ground(ground, ground_top, 10, seed + 3))
    if rocks:
        mid_items.append(Scatter(list(rocks), rock_n, (-100, 2100), (210, 330), (0.6, 1.1), seed + 4))
    if under:
        mid_items.append(Scatter(list(under), under_n, (-200, 2150), (250, 335), under_s, seed + 5, pal=pal or {}))
    if flowers:
        mid_items.append(Scatter(list(flowers), flower_n, (-100, 2050), (215, 330), (0.5, 0.95), seed + 6))
    mid_items += list(extras)
    layers.append(L_mid(mid_items, 1.0, "main_scenery", 40))
    anchors = ground_anchors(215.0)
    if seat:
        sx, sy, sw = seat
        layers.append(L("branch", "middle", 1.0, 62, items=[Shape("branch", sx, sy, sw)], scale=1.0, tint="foliage"))
        anchors["branch"] = {"x": sx - 140.0, "y": sy + 8.0, "order": 100, "features": ["tree", "seat"], "description": "sitting on a thick branch"}
    items = []
    if vines:
        items.append(Shape("vines", vines))
    if framing:
        for x, w in framing:
            items.append(Shape("trunk_wall", x, w))
    if items:
        layers.append(L("framing", "foreground", 1.15, 700, items=items, scale=0.8, tint="foliage", motion=SWAY(0.5, 5.0, (960, 1280))))
    if fg:
        layers.append(L_fg([Scatter(list(fg), fg_n, (-250, 2200), (-120, 40), fg_s, seed + 7)]))
    if fx:
        layers.append(L_fx(list(fx), "atmosphere", 920))
    if scare_fx:
        layers.append(L_fx(list(scare_fx), "spooky", 925, scare=1))
    return layers, anchors


def river_forest(**kw):
    """A forest seen across a river: far bank behind, water, near bank in front."""
    layers, anchors = forest(**kw)
    water = [L("river", "middle", 1.0, 8, special=("water", "#7fd6e8", "#2f8fc4", 430.0), cover_x=True, scale=0.5),
             L("ripples", "middle", 1.0, 12, art=ripples(250, 420, 21, 26, opacity=0.45), scale=0.9, motion=[SCROLL(30), BOB(3, 3)])]
    ids = [l["id"] for l in layers]
    i = ids.index("main_scenery")
    layers[i:i] = water
    return layers, water_anchors(110.0, 215.0)


def build() -> list:
    E = []
    add = E.append

    # 1 dense tropical forest
    ly, an = forest(sky="day", clouds=2, back=("tree-mango", "tree-banana", "tree-coconut", "tree-banyan"), back_n=18, back_s=(0.45, 0.7), mid=("tree-mango", "tree-jamun", "tree-banyan", "tree-banana"),
                    mid_n=9, mid_s=(1.0, 1.4), under=("bush-dark", "bush-fern", "bush-hibiscus"), under_n=16, flowers=("flower-orchid", "flower-hibiscus"), flower_n=8,
                    ground="forest", fg=("bush-fern", "bush-dark"), fg_n=6, fx=(Shape("shafts", [420, 900, 1380]), Shape("mist", 380, 5)), seed=11)
    add(make_env("env-for-0001", "Dense tropical forest", "FOR", "dense", "A thick tropical forest of mango, banana and banyan trees with ferns and hanging light.", ly, an, std_roles(an), ["ground", "arboreal"],
                 ["forest", "tree", "jungle", "tropical", "dense"], ["घना जंगल", "tropical forest", "jungle"], ["panchatantra", "jataka"], seed=11))
    # 2 open green forest
    ly, an = forest(sky="morning", clouds=4, far=[("mountain-green-hills", 600, 395, 1.1), ("mountain-green-hills", 1500, 380, 1.3)], back=("tree-oak", "tree-neem"), back_n=12,
                    mid=("tree-oak", "tree-neem", "tree-peepal"), mid_n=5, mid_s=(0.85, 1.15), under=("bush-round", "bush-lantana"), under_n=7, flowers=("flower-daisy", "flower-patch", "flower-buttercup"),
                    flower_n=12, ground="meadow", fg=("grass-tall", "bush-round"), fg_n=5, seed=12)
    add(make_env("env-for-0002", "Open green forest", "FOR", "open", "A bright, open woodland with space between the trees and a meadow floor.", ly, an, std_roles(an), ["ground", "arboreal"],
                 ["forest", "tree", "meadow", "open", "green"], ["खुला जंगल", "woodland", "forest"], ["panchatantra", "aesop", "jataka"], seed=12))
    # 3 bamboo forest
    ly, an = forest(sky="noon", clouds=2, back=("tree-bamboo", "tree-bamboo-gold"), back_n=22, back_s=(0.5, 0.8), mid=("tree-bamboo", "tree-bamboo-gold"), mid_n=8, mid_s=(0.9, 1.3),
                    under=("bush-fern", "bush-pampas"), under_n=8, ground="forest", fg=("grass-tall", "bush-fern"), fg_n=5, fx=(Shape("shafts", [360, 840, 1300, 1720], bottom=250, w=90),), seed=13)
    add(make_env("env-for-0003", "Bamboo forest", "FOR", "bamboo", "Tall green and golden bamboo groves with soft shafts of light.", ly, an, std_roles(an), ["ground"],
                 ["forest", "bamboo", "tree", "green"], ["बाँस का जंगल", "bamboo grove"], ["jataka", "panchatantra"], seed=13))
    # 4 ancient banyan forest
    ly, an = forest(sky="mist", clouds=1, back=("tree-banyan-ancient", "tree-peepal"), back_n=8, back_s=(0.5, 0.75), mid=("tree-banyan-ancient", "tree-banyan"), mid_n=4, mid_s=(0.9, 1.2),
                    under=("bush-fern", "bush-dark", "grass-moss"), under_n=12, rocks=("rock-mossy", "rock-lichen"), rock_n=5, ground="moss", fg=("bush-fern",), fg_n=4,
                    fx=(Shape("shafts", [700, 1200], w=160), Shape("mist", 350, 4)), seed=14, pal={"leaf": "#3a8a42", "leaf2": "#2a6a32"})
    add(make_env("env-for-0004", "Ancient banyan forest", "FOR", "ancient", "Enormous old banyan trees with aerial roots and moss-covered stones.", ly, an, std_roles(an), ["ground"],
                 ["forest", "banyan", "ancient", "tree", "moss"], ["पुराना बरगद का जंगल", "banyan forest"], ["jataka", "vikram_betal", "panchatantra"], seed=14))
    # 5 mango orchard
    ly, an = forest(sky="morning", clouds=3, far=[("mountain-green-hills", 500, 395, 1.0), ("mountain-green-hills", 1400, 395, 1.2)], back=("tree-mango",), back_n=15, back_s=(0.45, 0.6),
                    mid=("tree-mango",), mid_n=0, under=("grass-tuft",), under_n=12, flowers=("flower-marigold",), flower_n=6, ground="grass", fg=("grass-tall",), fg_n=5, seed=15,
                    extras=(Row("tree-mango", 150, 1800, 360, 345, 1.0, 12, seed=15), At("fence-picket", 600, 210, 0.9), At("fence-picket", 1500, 215, 0.9)))
    add(make_env("env-for-0005", "Mango orchard", "FOR", "orchard", "Neat rows of fruiting mango trees with a low fence and marigolds.", ly, an, std_roles(an), ["ground", "arboreal"],
                 ["forest", "orchard", "mango", "tree", "fruit", "garden"], ["आम का बाग़", "mango orchard"], ["tenali_raman", "folk", "panchatantra"], seed=15))
    # 6 pine and deodar forest
    ly, an = forest(sky="day", clouds=3, far=[("mountain-himalaya", 900, 385, 1.3), ("mountain-blue-range", 1750, 385, 1.0)], back=("tree-pine", "tree-deodar", "tree-fir-tall"), back_n=20,
                    back_s=(0.4, 0.62), mid=("tree-pine", "tree-deodar", "tree-fir-tall"), mid_n=7, mid_s=(0.85, 1.2), under=("bush-round", "grass-moss"), under_n=7,
                    rocks=("rock-boulder", "rock-boulder-angular"), rock_n=4, ground="forest", fg=("grass-tall",), fg_n=4, seed=16, pal={})
    add(make_env("env-for-0006", "Pine and deodar forest", "FOR", "conifer", "Tall pines and deodars below distant Himalayan peaks.", ly, an, std_roles(an), ["ground"],
                 ["forest", "pine", "deodar", "mountain", "himalaya", "tree"], ["देवदार का जंगल", "pine forest"], ["jataka", "folk"], seed=16))
    # 7 autumn forest
    ly, an = forest(sky="golden", clouds=3, back=("tree-autumn", "tree-bare"), back_n=14, mid=("tree-autumn", "tree-bare", "tree-oak"), mid_n=7, mid_s=(0.85, 1.2),
                    under=("bush-dry", "grass-dry"), under_n=8, ground="autumn", fg=("grass-dry",), fg_n=5, seed=17, mid_pal={},
                    fx=(Shape("leaf_leaf" if False else "leaf_litter", 70, y0=-180, y1=640),))
    add(make_env("env-for-0007", "Autumn forest", "FOR", "autumn", "Orange and golden leaves drifting down in a quiet autumn wood.", ly, an, std_roles(an), ["ground"],
                 ["forest", "autumn", "tree", "golden", "leaves"], ["पतझड़ का जंगल", "autumn woods"], ["aesop", "folk"], seed=17))
    # 8 flowering forest
    ly, an = forest(sky="spring", clouds=4, back=("tree-blossom", "tree-oak"), back_n=13, mid=("tree-blossom", "tree-blossom", "tree-oak"), mid_n=6, mid_s=(0.85, 1.1),
                    under=("bush-rose", "bush-jasmine", "bush-hibiscus"), under_n=9, flowers=("flower-daisy", "flower-tulip", "flower-lily", "flower-patch", "flower-bluebell"), flower_n=16,
                    ground="meadow", fg=("flower-patch", "bush-jasmine"), fg_n=6, fx=(Shape("petals", 70),), seed=18)
    add(make_env("env-for-0008", "Flowering forest", "FOR", "flowering", "Blossom trees, rose and jasmine bushes and wildflowers with drifting petals.", ly, an, std_roles(an), ["ground", "arboreal"],
                 ["forest", "flowering", "spring", "blossom", "garden", "tree"], ["फूलों वाला जंगल", "flower forest"], ["panchatantra", "arabian_nights", "folk"], seed=18))
    # 9 dark haunted forest
    ly, an = forest(sky="haunted", clouds=3, moon=(1480, 1010, 95), stars=60, back=("tree-gnarled", "tree-haunted", "tree-bare"), back_n=14, back_s=(0.5, 0.72), back_haze=0.5,
                    mid=("tree-gnarled", "tree-haunted", "tree-hollow"), mid_n=6, mid_s=(0.9, 1.25), under=("bush-dry", "grass-dry"), under_n=6, ground="haunted", rocks=("rock-volcanic",), rock_n=3,
                    fg=("grass-weeds",), fg_n=5, pal={"leaf": "#3a3a48", "leaf2": "#24242e", "bark": "#3a2a3a"}, mid_pal={"bark": "#3a2a3a"},
                    fx=(Shape("mist", 330, 6, col="#b8a8d8", op=0.3),), scare_fx=(Shape("eyes", 7), Shape("bats", 7), At("rock-volcanic", 300, 215, 0.5)), seed=19)
    add(make_env("env-for-0009", "Dark haunted forest", "FOR", "haunted", "Twisted dead trees under a pale moon, with mist. Glowing eyes and bats appear only at higher scare levels.", ly, an, std_roles(an), ["ground"],
                 ["forest", "haunted", "dark", "night", "spooky", "tree", "gnarled"], ["भूतिया जंगल", "haunted woods"], ["vikram_betal", "folk"], seed=19, scare_levels=True,
                 lighting=["night", "moonlight", "evening", "overcast"]))
    # 10 magical enchanted forest
    ly, an = forest(sky="magic", clouds=3, stars=40, back=("tree-magic", "tree-blossom"), back_n=13, mid=("tree-magic", "tree-magic", "tree-willow"), mid_n=6, mid_s=(0.9, 1.25),
                    under=("bush-magic", "bush-fern"), under_n=9, flowers=("flower-orchid", "flower-lily"), flower_n=8, rocks=("rock-crystal-cluster", "rock-crystal-spikes"), rock_n=4, ground="moss",
                    fg=("bush-magic", "bush-fern"), fg_n=5, extras=(At("lamp-magic-orb", 760, 330, 1.2), At("lamp-magic-orb", 1380, 400, 1.0)), fx=(Shape("fireflies", 40), Shape("mist", 300, 4, col="#d8c8ff", op=0.25)), seed=20)
    add(make_env("env-for-0010", "Magical enchanted forest", "FOR", "magical", "Glowing teal trees, crystals, floating lights and fireflies.", ly, an, std_roles(an), ["ground"],
                 ["forest", "magic", "enchanted", "fantasy", "glow", "tree", "crystal"], ["जादुई जंगल", "enchanted forest"], ["arabian_nights", "vikram_betal", "folk"], seed=20))
    # 11 riverside forest
    ly, an = river_forest(sky="day", clouds=4, far=[("mountain-green-hills", 700, 400, 1.2)], back=("tree-oak", "tree-willow", "tree-neem"), back_n=13, mid=("tree-willow", "tree-oak", "tree-bamboo"), mid_n=5, mid_s=(0.85, 1.1),
                          under=("bush-round",), under_n=5, ground="meadow", ground_top=170.0, fg=("grass-reed-tall", "grass-cattail"), fg_n=7, seed=21, mid_y=(180, 215))
    add(make_env("env-for-0011", "Riverside forest", "FOR", "riverside", "A wide river with forest on both banks, willows and reeds.", ly, an, std_roles(an), ["ground", "aquatic"],
                 ["forest", "river", "riverside", "water", "tree", "willow"], ["नदी किनारे का जंगल", "river forest"], ["panchatantra", "jataka"], seed=21))
    # 12 mountain forest
    ly, an = forest(sky="overcast", clouds=3, far=[("mountain-snow-peak", 700, 380, 1.4), ("mountain-rocky", 1650, 380, 1.2), ("mountain-blue-range", 150, 380, 1.0)], back=("tree-pine", "tree-deodar"), back_n=16,
                    mid=("tree-pine", "tree-deodar", "tree-oak"), mid_n=6, under=("bush-round", "grass-moss"), under_n=6, rocks=("rock-boulder-angular", "rock-big", "rock-mossy"), rock_n=7, ground="rock", fg=("rock-big",), fg_n=2, seed=22)
    add(make_env("env-for-0012", "Mountain forest", "FOR", "mountain", "Forest on a rocky mountainside below snow-capped peaks.", ly, an, std_roles(an), ["ground"],
                 ["forest", "mountain", "rocky", "pine", "tree", "hills"], ["पहाड़ी जंगल", "mountain woods"], ["jataka", "folk"], seed=22))
    # 13 rainforest with hanging vines
    ly, an = forest(sky="overcast", clouds=2, back=("tree-banyan", "tree-fanpalm", "tree-banana"), back_n=16, back_s=(0.5, 0.75), mid=("tree-banyan", "tree-fanpalm", "tree-jamun"), mid_n=7, mid_s=(1.0, 1.4),
                    under=("bush-fern", "bush-dark"), under_n=16, flowers=("flower-orchid",), flower_n=6, ground="wet", fg=("bush-fern", "bush-dark"), fg_n=7, fg_s=(1.4, 2.2), vines=22,
                    fx=(Shape("mist", 400, 7, col="#d8ecec", op=0.3),), seed=23, pal={"leaf": "#2f8a42", "leaf2": "#1f6a32", "leaf3": "#4aa858"})
    add(make_env("env-for-0013", "Rainforest with hanging vines", "FOR", "rainforest", "A damp rainforest of huge leaves, hanging vines and low mist.", ly, an, std_roles(an), ["ground", "arboreal"],
                 ["forest", "rainforest", "vines", "jungle", "tropical", "wet", "tree"], ["वर्षावन", "rainforest"], ["jataka", "folk"], seed=23))
    # 14 dry deciduous forest
    ly, an = forest(sky="noon", clouds=1, far=[("mountain-mesa-range", 800, 390, 1.2)], back=("tree-acacia", "tree-babul", "tree-bare"), back_n=12, mid=("tree-acacia", "tree-babul", "tree-bare"), mid_n=6, mid_s=(0.9, 1.2),
                    under=("bush-dry", "grass-dry", "bush-agave"), under_n=10, rocks=("rock-sandstone",), rock_n=3, ground="dirt", fg=("grass-dry", "bush-dry"), fg_n=6, seed=24,
                    pal={"leaf": "#8a9a4a", "leaf2": "#6a7a3a", "leaf3": "#aab868"})
    add(make_env("env-for-0014", "Dry deciduous forest", "FOR", "dry", "Sparse acacia and thorn trees on dry, dusty ground.", ly, an, std_roles(an), ["ground"],
                 ["forest", "dry", "deciduous", "acacia", "dusty", "tree", "summer"], ["सूखा जंगल", "dry forest"], ["panchatantra", "folk"], seed=24))
    # 15 moonlit forest
    cool = {"leaf": "#3a5f82", "leaf2": "#2a4668", "leaf3": "#5a82a8", "bark": "#3a3a58"}
    ly, an = forest(sky="night", clouds=2, moon=(1380, 1020, 100), stars=110, back=("tree-oak", "tree-pine", "tree-neem"), back_n=14, back_haze=0.5, mid=("tree-oak", "tree-neem", "tree-pine"), mid_n=6,
                    under=("bush-round", "bush-fern"), under_n=8, flowers=("flower-bluebell",), flower_n=6, ground="forest", fg=("bush-fern",), fg_n=5, pal=cool, mid_pal=cool,
                    fx=(Shape("fireflies", 22, col="#d8f0ff"), Shape("mist", 340, 4, col="#b8c8e8", op=0.25)), seed=25)
    add(make_env("env-for-0015", "Moonlit forest", "FOR", "moonlit", "A calm forest at night under a bright moon, with fireflies.", ly, an, std_roles(an), ["ground", "arboreal"],
                 ["forest", "night", "moon", "moonlit", "tree", "fireflies"], ["चाँदनी रात का जंगल", "forest at night"], ["panchatantra", "vikram_betal", "folk"], seed=25,
                 lighting=["night", "moonlight", "evening"]))
    return E
