"""The extended character roster. Every entry is an original design (no franchise characters); adding one is data.

Categories: human archetypes (CHAR-HUM), animals (CHAR-ANI), birds (CHAR-BRD), mythological/supernatural (CHAR-MYT).
Existing characters (monkey_001, lion_001, rabbit_001, jackal_001, jackal_blue_001, farmer_001, rich_man_001, crocodile_001, crocodile_wife_001)
are not redrawn; the roster only adds species and archetypes they do not cover.
"""
from __future__ import annotations

from .characters_ext import SKIN, FigSpec

ST = {"p": "panchatantra", "j": "jataka", "h": "hitopadesha", "a": "akbar_birbal", "t": "tenali_raman", "v": "vikram_betal", "s": "singhasan_battisi",
      "n": "arabian_nights", "e": "aesop", "f": "folk"}
_stories = lambda keys: [ST[k] for k in keys]
ROSTER: list[FigSpec] = []
_count = {"human": 0, "animal": 0, "bird": 0, "mythological": 0}
_CODE = {"human": "HUM", "animal": "ANI", "bird": "BRD", "mythological": "MYT"}


def _add(category: str, sub: str, slug: str, name: str, hi: list[str], desc: str, voice: str, stories: str = "", **kw) -> FigSpec:
    _count[category] += 1
    n = _count[category]
    code = f"CHAR-{_CODE[category]}-{n:04d}"
    kw.setdefault("fur", "#d99a63")
    kw.setdefault("belly", kw["fur"])
    spec = FigSpec(id=code.lower(), name=name, species=slug, aliases=[*hi, name.lower(), slug.replace("_", " ")], description=desc, voice=voice,
                   category=category, subcategory=sub, code=code, stories=_stories(stories), **kw)
    ROSTER.append(spec)
    return spec


def C(top, bottom="#f3e9c8", trim=None, shoes="#6b4226", jewel="#e6b93c"):
    return {"top": top, "bottom": bottom, "trim": trim or "#e6b93c", "shoes": shoes, "jewel": jewel}


def human(sub, slug, name, hi, desc, voice, stories, skin, clothes, **kw):
    kw.setdefault("ears", "human")
    kw.setdefault("muzzle", None)
    kw.setdefault("stage_scale", 0.66)
    kw.setdefault("hair", None)
    return _add("human", sub, slug, name, hi, desc, voice, stories, fur=SKIN[skin], belly=SKIN[skin], clothes=clothes, feet="bare" if kw.pop("barefoot", False) else "paw", **kw)


# ---------------------------------------------------------------------------------------------- humans: royal
human("royal", "king", "King", ["राजा", "महाराज", "नरेश"], "A dignified king in a crimson robe with a gold crown and a trimmed beard.", "king_hi", "pahsvtn", "wheat",
      C("#a8322a", "#e8d8a8", "#e6b93c", "#3b2414", "#3a6ad8"), outfit="robe", headwear="crown", beard="short", moustache=True, hair_colour="#2b2019", belly_scale=1.1,
      identity_notes=["Gold crown with red and blue jewels", "Crimson robe with gold trim", "Short black beard"])
human("royal", "emperor", "Emperor", ["सम्राट", "बादशाह", "शहंशाह", "emperor"], "An emperor in a deep green and gold robe and a tall plumed turban.", "king_hi", "an", "light",
      C("#1f6a4a", "#f0e8d0", "#e6b93c", "#3b2414", "#d8362a"), outfit="robe", hair="turban", hair_colour="#f3ead0", moustache=True, beard="goatee", belly_scale=1.15, headwear=None,
      held="sword", identity_notes=["White-gold turban with a ruby", "Green and gold robe", "Pointed beard"])
human("royal", "queen", "Queen", ["रानी", "महारानी", "queen"], "A queen in a royal-blue dress with a gold tiara and long dark hair.", "queen_hi", "pahsvtn", "light",
      C("#2a4aa8", "#f0e0e0", "#e6b93c", "#7a3a6a", "#d8362a"), outfit="dress", headwear="tiara", hair_colour="#1a1210", long_hair=True, ears="human", belly_scale=1.0,
      identity_notes=["Gold tiara with a ruby", "Blue dress with a gold sash"])
human("royal", "prince", "Prince", ["राजकुमार", "शहज़ादा", "prince"], "A young prince in an orange jacket with a small gold cap.", "young_m_hi", "pahvsn", "wheat",
      C("#e07a2a", "#f3e9c8", "#e6b93c", "#6b4226", "#3a6ad8"), headwear="cap", headwear_colour="#e6b93c", hair_colour="#1a1210", stage_scale=0.62,
      identity_notes=["Small gold cap", "Orange jacket"])
human("royal", "princess", "Princess", ["राजकुमारी", "शहज़ादी", "princess"], "A princess in a rose-pink dress with a jewelled band and long braided hair.", "young_f_hi", "pahsvn", "light",
      C("#d8587a", "#f8e0e8", "#e6b93c", "#7a3a6a", "#3a6ad8"), outfit="dress", headwear="hair_long", hair_colour="#2b1a14", stage_scale=0.62,
      identity_notes=["Long dark hair", "Rose-pink dress with gold trim"])
human("royal", "minister", "Minister", ["मंत्री", "वज़ीर", "दीवान", "minister", "vizier"], "A wise minister in a teal robe and a white turban, with a grey moustache.", "elder_m_hi", "pahsvtn", "tan",
      C("#2a7a8a", "#eadfc0", "#c9a030", "#3b2414", "#d8a23a"), outfit="robe", hair="turban", hair_colour="#efe8d8", moustache=True, belly_scale=1.05,
      identity_notes=["White turban", "Teal robe", "Grey moustache"])
human("royal", "courtier", "Courtier", ["दरबारी", "courtier"], "A courtier in a plum jacket with a feathered cap, always bowing a little.", "young_m_hi", "ant", "wheat",
      C("#7a3a8a", "#e8dcc0", "#e6b93c", "#3b2414", "#e6b93c"), headwear="plume", headwear_colour="#e8d040", hair_colour="#1a1210", moustache=True,
      identity_notes=["Yellow plume in a plum cap"])
human("royal", "royal_guard", "Royal Guard", ["सिपाही", "पहरेदार", "royal guard", "guard"], "A tall guard in a steel breastplate and a plumed helmet, spear-straight.", "soldier_hi", "pahsvnt", "brown",
      C("#a8322a", "#2a3a6a", "#c9a030", "#3b2414", "#e6b93c"), outfit="armor", headwear="helmet", headwear_colour="#aeb4c0", moustache=True, hair_colour="#1a1210", stage_scale=0.7,
      held="staff", identity_notes=["Steel helmet with a red knob", "Breastplate over red tunic"])
human("royal", "commander", "Commander", ["सेनापति", "कमांडर", "commander", "general"], "A battle commander in dark armour with gold edging and a red plume.", "soldier_hi", "pavn", "tan",
      C("#2a2a3a", "#3a2a2a", "#e6b93c", "#2a1a10", "#d8362a"), outfit="armor", headwear="helmet", headwear_colour="#6a6e7a", moustache=True, beard="stubble", hair_colour="#1a1210", stage_scale=0.72,
      held="sword", identity_notes=["Dark steel helmet", "Gold-edged armour", "Sword"])
human("royal", "royal_messenger", "Royal Messenger", ["दूत", "संदेशवाहक", "messenger", "herald"], "A lean messenger in a yellow tunic and red cap, a rolled letter in hand.", "young_m_hi", "ansvph", "brown",
      C("#e6b93c", "#a8322a", "#a8322a", "#6b4226", "#a8322a"), headwear="cap", headwear_colour="#c0392b", hair_colour="#1a1210", stage_scale=0.62,
      held="scroll", identity_notes=["Red cap", "Yellow tunic", "Scroll"])
# ---------------------------------------------------------------------------------------------- humans: scholarly and religious
human("scholarly", "sage", "Sage", ["ऋषि", "मुनि", "महर्षि", "sage", "rishi"], "An aged sage in saffron robes with a long white beard and matted hair.", "sage_hi", "pjvsn", "wheat",
      C("#e8902a", "#e8902a", "#b8601a", "#6b4226", "#8a5a33"), outfit="robe", headwear="jata", hair_colour="#efe8e0", beard="long", beard_colour="#f2efe8", held="staff", tilak="#c0392b", barefoot=True,
      identity_notes=["Long white beard", "Matted hair bun", "Saffron robe", "Staff"])
human("scholarly", "saint", "Saint", ["संत", "साधु", "महात्मा", "saint", "sadhu"], "A gentle saint in plain white with a shaved head, a necklace of beads and a calm face.", "sage_hi", "pjhfa", "tan",
      C("#f4f0e8", "#f4f0e8", "#c9b98f", "#6b4226", "#8a5a33"), outfit="robe", tilak="#e8902a", beard="stubble", beard_colour="#8a8a8a", barefoot=True, held="bowl",
      identity_notes=["Bare head", "White robe", "Orange tilak"])
human("scholarly", "monk", "Monk", ["भिक्षु", "बौद्ध भिक्षु", "monk", "bhikkhu"], "A shaven-headed monk in a maroon and saffron robe with an almsbowl.", "sage_hi", "jf", "wheat",
      C("#9a2a1a", "#e8902a", "#e8a030", "#6b4226", "#8a5a33"), outfit="robe", held="bowl", barefoot=True, stage_scale=0.64,
      identity_notes=["Bare head", "Maroon robe with an orange sash", "Almsbowl"])
human("scholarly", "brahmin", "Brahmin", ["ब्राह्मण", "पंडित", "पण्डित", "brahmin", "pandit"], "A learned brahmin with a topknot, a white dhoti, a sacred thread and a sandal-paste mark.", "elder_m_hi", "ptvhasn", "light",
      C("#f4f0e8", "#f4f0e8", "#e8902a", "#6b4226", "#8a5a33"), outfit="vest", headwear="topknot", hair_colour="#1a1210", tilak="#e8a030", moustache=True, barefoot=True,
      identity_notes=["Topknot", "Bare chest with a white vest-cloth", "Sandal mark"])
human("scholarly", "priest", "Priest", ["पुजारी", "पुरोहित", "priest"], "A temple priest with a saffron wrap, marigold garland and a smear of red tilak.", "elder_m_hi", "vfp", "tan",
      C("#e8902a", "#f4f0e8", "#c0392b", "#6b4226", "#e8a030"), outfit="vest", headwear="topknot", hair_colour="#1a1210", tilak="#c0392b", barefoot=True, belly_scale=1.1,
      identity_notes=["Orange vest-cloth", "Marigold-coloured trim", "Red tilak"])
human("scholarly", "teacher", "Teacher", ["गुरु", "शिक्षक", "आचार्य", "उस्ताद", "teacher", "guru"], "A patient teacher in an indigo kurta with round cap, holding a pointing stick.", "elder_m_hi", "ptvhsa", "wheat",
      C("#2a3a8a", "#f4f0e8", "#c9b98f", "#6b4226", "#e6b93c"), headwear="cap", headwear_colour="#f4f0e8", moustache=True, held="staff", hair_colour="#6a6a6a",
      identity_notes=["White round cap", "Indigo kurta", "Pointer"])
human("scholarly", "scholar", "Scholar", ["विद्वान", "पंडित", "scholar", "learned man"], "A bookish scholar in a green robe with a scroll and a short turban.", "elder_m_hi", "htvsa", "light",
      C("#2a7a4a", "#e8dcc0", "#c9a030", "#3b2414", "#e6b93c"), outfit="robe", hair="turban", hair_colour="#c9b090", beard="goatee", beard_colour="#7a7a7a", held="scroll",
      identity_notes=["Sand-coloured turban", "Green robe", "Scroll"])
human("scholarly", "student", "Student", ["शिष्य", "विद्यार्थी", "छात्र", "student", "pupil"], "A young student in a plain white tunic with a bright topknot.", "child_hi", "pjhvt", "wheat",
      C("#f0ece0", "#f0ece0", "#c9b98f", "#6b4226", "#8a5a33"), headwear="topknot", hair_colour="#1a1210", stage_scale=0.52, barefoot=True, held="scroll",
      identity_notes=["Topknot", "White tunic"])
human("scholarly", "hermit", "Hermit", ["तपस्वी", "वनवासी", "hermit", "ascetic"], "A thin hermit in a brown bark-cloth wrap with a tangled grey beard and a bun of hair.", "sage_hi", "pjvf", "brown",
      C("#8a6a3a", "#8a6a3a", "#6a4a2a", "#6b4226", "#6a4a2a"), outfit="vest", headwear="jata", hair_colour="#8a8a8a", beard="long", beard_colour="#8a8a8a", barefoot=True, held="staff", belly_scale=0.85,
      identity_notes=["Grey matted hair", "Bark-brown cloth", "Thin build"])
human("scholarly", "storyteller", "Storyteller", ["कथावाचक", "किस्सागो", "सूत्रधार", "storyteller"], "A warm storyteller in a patterned shawl and a wrapped red turban, one hand raised mid-tale.", "narrator_hi", "pjhatvsnf", "tan",
      C("#c07a2a", "#e8dcc0", "#a8322a", "#6b4226", "#e6b93c"), hair="turban", hair_colour="#c0392b", moustache=True, belly_scale=1.05, held="flute",
      identity_notes=["Red turban", "Ochre shawl", "Wide smile"])
# ---------------------------------------------------------------------------------------------- humans: ordinary people
human("ordinary", "merchant", "Merchant", ["व्यापारी", "सौदागर", "वणिक", "merchant"], "A prosperous merchant in a mustard kurta and an embroidered cap, with a heavy coin purse.", "rich_man_hi", "pahtsn", "wheat",
      C("#d8a02a", "#f4eed8", "#8a5a1a", "#3b2414", "#e6b93c"), headwear="cap", headwear_colour="#8a2a2a", moustache=True, hair_colour="#1a1210", belly_scale=1.2,
      identity_notes=["Embroidered maroon cap", "Mustard kurta", "Round belly"])
human("ordinary", "trader", "Travelling Trader", ["फेरीवाला", "बनजारा", "trader", "pedlar", "peddler"], "A travelling trader with a wide hat, a patched blue coat and a pack on his back.", "young_m_hi", "ant", "tan",
      C("#3a5a8a", "#6a5a3a", "#c9a030", "#3b2414", "#c9a030"), headwear="hat_wide", headwear_colour="#c9a060", moustache=True, hair_colour="#2b2019", held="staff",
      identity_notes=["Wide straw hat", "Patched blue coat", "Walking staff"])
human("ordinary", "villager_man", "Villager", ["गाँव वाला", "ग्रामीण", "villager"], "A cheerful villager in a plain kurta with a checked cloth wrapped around his head.", "farmer_hi", "pjfta", "brown",
      C("#8aa8c8", "#f0ece0", "#6a8aa8", "#6b4226", "#8aa8c8"), hair="turban", hair_colour="#c8a040", moustache=True, barefoot=True,
      identity_notes=["Yellow head wrap", "Light blue kurta"])
human("ordinary", "villager_woman", "Village Woman", ["गाँव की औरत", "ग्रामीण महिला", "village woman", "villager woman"], "A village woman in a bright green sari with red border, hair tied back and a nose-ring.", "young_f_hi", "pjfta", "brown",
      C("#3aa85a", "#3aa85a", "#c0392b", "#6b4226", "#e6b93c"), outfit="dress", headwear="hair_long", hair_colour="#1a1210", tilak="#c0392b",
      identity_notes=["Green sari with a red border", "Red bindi"])
human("ordinary", "woodcutter", "Woodcutter", ["लकड़हारा", "woodcutter"], "A strong woodcutter in a torn vest and brown cloth, an axe-sized club on his shoulder.", "farmer_hi", "pjvf", "dark",
      C("#8a6a3a", "#5a4a3a", "#6a4a2a", "#3b2414", "#6a4a2a"), outfit="vest", hair="short", hair_colour="#1a1210", beard="stubble", held="club", barefoot=True, stage_scale=0.68,
      identity_notes=["Bare-chested with a brown vest", "Heavy club or axe", "Stubble"])
human("ordinary", "hunter", "Hunter", ["शिकारी", "बहेलिया", "व्याध", "hunter"], "A hunter in a leaf-green vest with a feathered cap and a bow.", "young_m_hi", "pjvfn", "tan",
      C("#4a7a3a", "#6a5a3a", "#3a5a2a", "#3b2414", "#8a5a33"), outfit="vest", headwear="plume", headwear_colour="#c0392b", hair_colour="#1a1210", held="bow", moustache=True,
      identity_notes=["Feather in the cap", "Green vest", "Bow"])
human("ordinary", "fisherman", "Fisherman", ["मछुआरा", "केवट", "fisherman"], "A fisherman in a rolled turban and a short blue wrap, a fishing pole in hand.", "farmer_hi", "pjf", "deep",
      C("#3a8ab8", "#e8e0c0", "#2a5a88", "#6b4226", "#2a5a88"), outfit="vest", hair="turban", hair_colour="#f0e8d8", held="staff", barefoot=True,
      identity_notes=["White rolled turban", "Blue vest-cloth", "Fishing pole"])
human("ordinary", "shepherd", "Shepherd", ["चरवाहा", "गडरिया", "shepherd"], "A young shepherd in a tan wool vest and a brown cap, carrying a crook.", "young_m_hi", "peftj", "tan",
      C("#c8a070", "#a08a60", "#7a5a30", "#6b4226", "#7a5a30"), outfit="vest", headwear="cap", headwear_colour="#8a5a33", hair_colour="#2b2019", held="staff", stage_scale=0.62,
      identity_notes=["Brown cap", "Tan vest", "Shepherd's crook"])
human("ordinary", "artisan", "Artisan", ["कारीगर", "शिल्पकार", "artisan", "craftsman"], "A skilled craftsman in a green apron-vest with a small turban, a tool in hand.", "farmer_hi", "tfp", "wheat",
      C("#7a8a3a", "#e0d4b0", "#4a5a22", "#3b2414", "#4a5a22"), outfit="vest", hair="turban", hair_colour="#a8501a", moustache=True, held="club", barefoot=True,
      identity_notes=["Rust-orange turban", "Olive apron-vest", "Mallet"])
human("ordinary", "potter", "Potter", ["कुम्हार", "potter"], "A potter in a rust-red dhoti and a mud-spattered vest with a clay pot on his hand.", "farmer_hi", "ftp", "brown",
      C("#b8683a", "#e0d4b0", "#8a4a22", "#3b2414", "#8a4a22"), outfit="vest", hair="short", hair_colour="#2b2019", barefoot=True, moustache=True, held="bowl",
      identity_notes=["Clay-stained vest", "Pot"])
human("ordinary", "blacksmith", "Blacksmith", ["लोहार", "blacksmith", "smith"], "A burly blacksmith in a leather apron with a soot-dark face and a heavy hammer.", "rich_man_hi", "pft", "deep",
      C("#5a4a3a", "#3a3a4a", "#2a2a2a", "#2a1a10", "#6a6a6a"), outfit="vest", hair="short", hair_colour="#1a1210", beard="short", held="club", barefoot=False, belly_scale=1.25, stage_scale=0.7,
      identity_notes=["Dark leather apron", "Heavy hammer", "Broad build"])
human("ordinary", "soldier", "Soldier", ["सैनिक", "योद्धा", "soldier"], "A foot soldier in a quilted red coat and a round iron cap, sword at the side.", "soldier_hi", "pansv", "brown",
      C("#b83a2a", "#3a4a6a", "#e6b93c", "#3b2414", "#e6b93c"), headwear="helmet", headwear_colour="#8a8e9a", moustache=True, hair_colour="#1a1210", held="sword",
      identity_notes=["Round iron helmet", "Red quilted coat"])
human("ordinary", "thief", "Thief", ["चोर", "thief"], "A sly thief in a dark hood and a grey wrap, with a shifty sideways look.", "villain_hi", "pavsnft", "tan",
      C("#3a3a4a", "#2a2a3a", "#5a5a6a", "#1a1a1a", "#5a5a6a"), headwear="hood", headwear_colour="#2a2a3a", moustache=True, hair_colour="#1a1210", stage_scale=0.62,
      identity_notes=["Dark hood", "Slate grey wrap", "Thin moustache"])
human("ordinary", "child_boy", "Boy", ["बालक", "लड़का", "बच्चा", "boy", "child"], "A cheerful young boy in a red shirt with a spiky tuft of hair.", "child_hi", "pjhatfnv", "wheat",
      C("#d8362a", "#3a5a8a", "#a8221a", "#6b4226", "#d8362a"), hair="tuft", barefoot=True, stage_scale=0.48, hair_colour="#1a1210",
      identity_notes=["Spiky tuft of hair", "Red shirt, blue shorts"])
human("ordinary", "child_girl", "Girl", ["बालिका", "लड़की", "बच्ची", "girl"], "A bright young girl in a yellow frock with two black plaits.", "child_hi", "pjhatfn", "wheat",
      C("#f2c230", "#f2c230", "#e0a020", "#c0392b", "#d8362a"), outfit="dress", headwear="hair_long", hair_colour="#1a1210", stage_scale=0.48, barefoot=False,
      identity_notes=["Long black plaits", "Yellow frock"])
human("ordinary", "elderly_man", "Elderly Man", ["बूढ़ा", "वृद्ध", "बुज़ुर्ग", "बूढ़ा आदमी", "elderly man", "old man"], "A kindly old man in a patched dhoti with a white moustache, bald head and a walking stick.", "elder_m_hi", "pjftahs", "tan",
      C("#d8d0c0", "#d8d0c0", "#a89a7a", "#6b4226", "#a89a7a"), outfit="vest", moustache=True, hair_colour="#f2efe8", held="staff", barefoot=True, stage_scale=0.58, belly_scale=0.9,
      identity_notes=["White moustache", "Bald head", "Walking stick"])
human("ordinary", "elderly_woman", "Elderly Woman", ["बुढ़िया", "वृद्धा", "दादी", "बूढ़ी औरत", "elderly woman", "old woman", "grandmother"], "A kindly old woman in a pale grey sari with white hair in a bun and a stick.", "elder_f_hi", "pjftahs", "tan",
      C("#a8a8b8", "#a8a8b8", "#6a6a8a", "#6b4226", "#6a6a8a"), outfit="dress", headwear="jata", hair_colour="#efeae0", held="staff", stage_scale=0.56, belly_scale=0.9,
      identity_notes=["White hair bun", "Grey sari", "Stick"])
# ---------------------------------------------------------------------------------------------- humans: additional
human("additional", "magician", "Magician", ["जादूगर", "magician", "conjurer"], "A magician in a midnight-blue cloak with silver stars and a tall pointed hat.", "villain_hi", "nvf", "light",
      C("#2a2a6a", "#1a1a4a", "#c0c8e8", "#1a1a1a", "#c0c8e8"), outfit="robe", headwear="hat_pointed", headwear_colour="#2a2a6a", beard="goatee", beard_colour="#1a1210", moustache=True, hair_colour="#1a1210", held="staff",
      identity_notes=["Tall star-dotted hat", "Midnight-blue cloak", "Wand"])
human("additional", "sorcerer", "Sorcerer", ["तांत्रिक", "ओझा", "sorcerer", "tantric"], "A sorcerer in a black and red robe with wild hair, a skull-bead necklace and a red tilak.", "villain_hi", "vnf", "brown",
      C("#2a1a1a", "#6a1a1a", "#c0392b", "#1a1a1a", "#c0392b"), outfit="robe", headwear="jata", hair_colour="#1a1210", beard="long", beard_colour="#1a1210", tilak="#c0392b", held="staff", fangs=False,
      identity_notes=["Wild black hair", "Black robe with red trim", "Red tilak"])
human("additional", "musician", "Musician", ["संगीतकार", "गायक", "वादक", "musician", "singer"], "A musician in a violet kurta and a coloured cap, with a flute at his lips-ready hand.", "young_m_hi", "ansvtf", "wheat",
      C("#7a3aa8", "#f0e8d0", "#e6b93c", "#6b4226", "#e6b93c"), headwear="cap", headwear_colour="#e8902a", moustache=True, hair_colour="#1a1210", held="flute",
      identity_notes=["Orange cap", "Violet kurta", "Flute"])
human("additional", "dancer", "Dancer", ["नर्तकी", "नर्तक", "dancer"], "A dancer in a teal and gold costume with a jewelled headpiece and a long braid.", "young_f_hi", "nsa", "light",
      C("#18a8a0", "#d8362a", "#e6b93c", "#d8362a", "#e6b93c"), outfit="dress", headwear="tiara", hair_colour="#1a1210", long_hair=True,
      identity_notes=["Gold headpiece", "Teal top with red skirt"])
human("additional", "physician", "Physician", ["वैद्य", "हकीम", "physician", "healer", "doctor"], "A physician in a green coat and a white turban with a bag of herbs and a grey beard.", "elder_m_hi", "ptahn", "wheat",
      C("#3a8a5a", "#f0e8d0", "#2a5a3a", "#6b4226", "#2a5a3a"), outfit="robe", hair="turban", hair_colour="#f0ece0", beard="short", beard_colour="#8a8a8a", held="bowl",
      identity_notes=["White turban", "Green coat", "Herb bowl"])
human("additional", "judge", "Judge", ["न्यायाधीश", "काज़ी", "क़ाज़ी", "judge", "qazi"], "A stern judge in a dark robe and a tall white cap with a thick moustache and a scroll of law.", "elder_m_hi", "ansta", "tan",
      C("#2a2a3a", "#2a2a3a", "#c9a030", "#3b2414", "#c9a030"), outfit="robe", headwear="cap", headwear_colour="#f4f0e8", moustache=True, hair_colour="#6a6a6a", held="scroll", belly_scale=1.1,
      identity_notes=["Tall white cap", "Dark robe", "Scroll"])
human("additional", "scribe", "Scribe", ["मुंशी", "लेखक", "scribe", "clerk"], "A scribe in a pale-grey robe with a cap and a writing board, ink on his fingers.", "young_m_hi", "ant", "wheat",
      C("#8a8a9a", "#e0d8c0", "#5a5a6a", "#6b4226", "#5a5a6a"), outfit="robe", headwear="cap", headwear_colour="#6a4a2a", moustache=True, hair_colour="#2b2019", held="scroll",
      identity_notes=["Brown cap", "Grey robe", "Scroll"])

# ---------------------------------------------------------------------------------------------- animals
def animal(slug, name, hi, desc, voice, stories, **kw):
    kw.setdefault("belly", kw["fur"])
    kw.setdefault("ears", "round_top")
    kw.setdefault("muzzle", "round")
    kw.setdefault("stage_scale", 0.6)
    return _add("animal", kw.pop("sub", "mammal"), slug, name, hi, desc, voice, stories, **kw)


animal("tiger", "Tiger", ["बाघ", "शेर", "tiger"], "A powerful orange tiger with black stripes and a white muzzle.", "lion_hi", "pjhaf", fur="#e8902a", belly="#fbeed0", pattern="stripes", tail="tuft", tail_tip="#2a1a10", ear_inner="#f4d8b0", nose="#6b3a1e", stage_scale=0.72, sub="big cat", identity_notes=["Black stripes on face and body", "White muzzle"])
animal("leopard", "Leopard", ["तेंदुआ", "चीता", "leopard"], "A sleek golden leopard dotted with dark spots.", "jackal_hi", "pjf", fur="#e8c060", belly="#fbeed0", pattern="spots", tail="tuft", tail_tip="#3a2a10", ear_inner="#f4d8b0", stage_scale=0.64, sub="big cat", identity_notes=["Dark rosette spots", "Cream muzzle"])
animal("elephant", "Elephant", ["हाथी", "गज", "elephant"], "A gentle grey elephant with big ears, a curled trunk and small tusks.", "crocodile_hi", "pjhatsf", fur="#9aa0b0", belly="#b8bcc8", ears_ext="elephant", ear_inner="#e8b8b8", muzzle=None, muzzle_ext="trunk", fangs=True, tail="puff", stage_scale=0.85, belly_scale=1.2, sub="large mammal", identity_notes=["Large round ears", "Long trunk", "Small ivory tusks"])
animal("deer", "Deer", ["हिरण", "मृग", "deer"], "A graceful spotted deer with a cream belly and branching antlers.", "rabbit_hi", "pjhf", fur="#c98a50", belly="#f8e8c8", pattern="spots", pattern_colour="#fff4dc", horns="antlers", horn_colour="#8a5a33", ears="pointed", ear_inner="#f0c9a0", tail="puff", feet="hoof", foot_colour="#3a2a1a", stage_scale=0.64, sub="deer", identity_notes=["Branching antlers", "White spots"])
animal("fox", "Fox", ["लोमड़ी", "fox"], "A clever red fox with a white chest and a bushy white-tipped tail.", "jackal_hi", "pjhaef", fur="#d8661a", belly="#fbf0e0", ears="pointed", ear_inner="#2a1a10", muzzle="pointed", tail="bushy", face="#fbf0e0", stage_scale=0.58, sub="canine", identity_notes=["White face mask", "White-tipped tail"])
animal("wolf", "Wolf", ["भेड़िया", "wolf"], "A lean grey wolf with pale eyes and a thick tail.", "lion_hi", "pjhef", fur="#8a8e98", belly="#d8dce4", ears="pointed", ear_inner="#c0b0b0", muzzle="pointed", tail="bushy", tail_tip="#6a6e78", iris="#c8a020", stage_scale=0.66, sub="canine", identity_notes=["Grey coat", "Pale yellow eyes"])
animal("bear", "Bear", ["भालू", "रीछ", "bear"], "A big, slow brown bear with a cream muzzle and round ears.", "crocodile_hi", "pjhaf", fur="#6a4a30", belly="#a8845a", ears="round_top", ear_inner="#a8845a", muzzle="round", nose="#1a1210", tail="puff", belly_scale=1.25, stage_scale=0.75, sub="bear", identity_notes=["Brown coat", "Round ears", "Wide body"])
animal("horse", "Horse", ["घोड़ा", "अश्व", "horse"], "A chestnut horse with a dark mane, a white blaze and hooves.", "lion_hi", "pjhtasn", fur="#a8602a", belly="#a8602a", ears="pointed", ear_inner="#c8905a", muzzle_ext="wide", ridge="#2a1a10", long_tail="horse", feet="hoof", foot_colour="#2a1a10", stage_scale=0.75, sub="equine", identity_notes=["Dark mane", "Long dark tail", "Hooves"])
animal("donkey", "Donkey", ["गधा", "donkey"], "A grey donkey with very long ears and a pale muzzle.", "jackal_hi", "pjhtaef", fur="#8a8a90", belly="#c8c8d0", ears="long", ear_inner="#e0c0c0", muzzle_ext="wide", ridge="#5a5a62", long_tail="horse", feet="hoof", foot_colour="#3a3a40", stage_scale=0.64, sub="equine", identity_notes=["Very long ears", "Pale muzzle"])
animal("camel", "Camel", ["ऊँट", "camel"], "A tall tan camel with a hump, a long neck-ruff and gentle drooping lashes.", "crocodile_hi", "an", fur="#c8a070", belly="#e8d0a8", ears="round_top", ear_inner="#a8845a", muzzle_ext="wide", tail="puff", feet="hoof", foot_colour="#6a4a2a", belly_scale=1.1, stage_scale=0.82, sub="camelid", ridge="#a88050", identity_notes=["Hump-coloured tuft", "Tan coat"])
animal("cow", "Cow", ["गाय", "गौ", "cow"], "A mild white cow with brown patches, small horns and a pink muzzle.", "rabbit_hi", "pjftsh", fur="#f4efe8", belly="#ffffff", pattern="patches", pattern_colour="#6a4a30", horns="short", ears_ext="floppy", muzzle_ext="wide", long_tail="cow", feet="hoof", foot_colour="#4a3a2a", stage_scale=0.7, belly_scale=1.2, sub="cattle", identity_notes=["Brown patches", "Small horns", "Pink muzzle"])
animal("bull", "Bull", ["बैल", "सांड", "bull", "ox"], "A strong brown bull with curved horns and a white face patch.", "lion_hi", "pjft", fur="#8a5a30", belly="#c8a070", horns="bull", ears_ext="floppy", muzzle_ext="wide", long_tail="cow", feet="hoof", foot_colour="#2a1a10", face="#f0e0c8", stage_scale=0.75, belly_scale=1.2, sub="cattle", identity_notes=["Curved horns", "Pale face"])
animal("buffalo", "Buffalo", ["भैंस", "buffalo"], "A heavy dark buffalo with swept-back horns and a wide muzzle.", "crocodile_hi", "pjf", fur="#3a3a44", belly="#5a5a64", horns="bull", horn_colour="#8a8a8a", ears_ext="floppy", muzzle_ext="wide", long_tail="cow", feet="hoof", foot_colour="#1a1a20", stage_scale=0.78, belly_scale=1.3, sub="cattle", identity_notes=["Dark grey coat", "Swept horns"])
animal("goat", "Goat", ["बकरी", "बकरा", "goat"], "A white goat with a little beard and curved horns.", "rabbit_hi", "pjhaf", fur="#f4efe8", belly="#ffffff", horns="short", ears_ext="floppy", muzzle="round", beard="goatee", beard_colour="#e8e4dc", tail="puff", feet="hoof", foot_colour="#4a3a2a", stage_scale=0.58, sub="caprine", identity_notes=["Goatee", "Short horns"])
animal("sheep", "Sheep", ["भेड़", "मेंढ़ा", "sheep"], "A woolly white sheep with a black face.", "rabbit_hi", "pjhe", fur="#f8f4ee", belly="#ffffff", face="#4a4a50", ears_ext="floppy", ear_inner="#4a4a50", muzzle="round", tail="puff", feet="hoof", foot_colour="#2a2a2a", stage_scale=0.58, belly_scale=1.2, sub="caprine", identity_notes=["Fluffy cream wool", "Dark face"])
animal("dog", "Dog", ["कुत्ता", "श्वान", "dog"], "A friendly tan dog with floppy brown ears and a wagging tail.", "jackal_hi", "pjhae", fur="#c8905a", belly="#f4e0c0", ears_ext="floppy", muzzle="round", nose="#2a1a10", tail="tuft", tail_tip="#c8905a", stage_scale=0.56, sub="canine", identity_notes=["Floppy ears", "Tan coat"])
animal("cat", "Cat", ["बिल्ली", "बिलार", "cat"], "A small grey tabby cat with pointed ears and white whiskers.", "rabbit_hi", "pjhaf", fur="#8a8a96", belly="#e0e0e8", ears_ext="cat_small", muzzle_ext="cat", whiskers=True, pattern="stripes", pattern_colour="#5a5a66", ear_inner="#f4b8c0", tail="curl", stage_scale=0.5, sub="feline", identity_notes=["Stripes", "Pink nose", "Whiskers"])
animal("rat", "Rat", ["चूहा", "मूषक", "rat"], "A brown rat with big round ears and a long thin tail.", "rabbit_hi", "pjhaf", fur="#9a7a5a", belly="#e8d8c0", ears="round_top", ear_inner="#f4b8c0", muzzle="pointed", nose="#f09aa8", long_tail="rat", stage_scale=0.46, sub="rodent", identity_notes=["Pink tail", "Round ears"])
animal("mouse", "Mouse", ["चुहिया", "छोटा चूहा", "mouse", "field mouse"], "A tiny grey mouse with huge pink ears.", "rabbit_hi", "pjhae", fur="#b8b8c0", belly="#f0f0f4", ears="round_top", ear_inner="#f4b8c0", muzzle="pointed", nose="#f09aa8", long_tail="rat", stage_scale=0.4, sub="rodent", identity_notes=["Oversized pink ears", "Tiny"])
animal("squirrel", "Squirrel", ["गिलहरी", "squirrel"], "A small squirrel with three dark back-stripes and a big fluffy tail.", "rabbit_hi", "pjhe", fur="#b8804a", belly="#f4e8d0", ears="pointed", ear_inner="#f0c9a0", muzzle="round", tail="bushy", tail_tip="#e8c898", pattern="stripes", pattern_colour="#4a2a14", stage_scale=0.44, habitat="arboreal", sub="rodent", identity_notes=["Big fluffy tail", "Dark stripes"])
animal("mongoose", "Mongoose", ["नेवला", "न्यौला", "mongoose"], "A quick, brave mongoose with grizzled brown fur and a thin tail.", "jackal_hi", "pjhf", fur="#8a7a5a", belly="#d8c8a0", ears="round_top", ear_inner="#c0a070", muzzle="pointed", long_tail="rat", stage_scale=0.5, sub="small carnivore", identity_notes=["Grizzled brown coat", "Pointed snout"])
animal("pig", "Pig", ["सूअर", "पिग", "pig"], "A round pink pig with a wide snout and floppy ears.", "rich_man_hi", "pjef", fur="#f4b0a8", belly="#f8d0c8", ears_ext="floppy", muzzle_ext="snout", tail="curl", feet="hoof", foot_colour="#c88078", belly_scale=1.3, stage_scale=0.58, sub="swine", identity_notes=["Pink skin", "Flat snout", "Curly tail"])
animal("boar", "Wild Boar", ["जंगली सूअर", "वराह", "boar", "wild boar"], "A dark wild boar with white tusks and a bristly mane.", "lion_hi", "pjhf", fur="#5a4a3a", belly="#8a7a6a", ears="pointed", ear_inner="#8a7a6a", muzzle_ext="snout", fangs=True, ridge="#3a2a1a", tail="puff", feet="hoof", foot_colour="#2a1a10", belly_scale=1.2, stage_scale=0.64, sub="swine", identity_notes=["Tusks", "Bristly mane"])
animal("rhinoceros", "Rhinoceros", ["गैंडा", "rhinoceros", "rhino"], "A heavy grey rhinoceros with a single horn and armoured skin folds.", "crocodile_hi", "pjf", fur="#7a7e88", belly="#a0a4ae", ears="round_top", ear_inner="#b8a0a0", muzzle_ext="wide", horns="nose", tail="puff", feet="hoof", foot_colour="#4a4e58", belly_scale=1.25, stage_scale=0.78, sub="large mammal", identity_notes=["Single horn", "Armoured grey skin"])
animal("turtle", "Turtle", ["कछुआ", "समुद्री कछुआ", "turtle"], "A green turtle with a patterned shell and flipper-like hands.", "crocodile_hi", "pjhaef", fur="#6aa84a", belly="#e8e0a0", ears="none", muzzle=None, pattern="spots", pattern_colour="#3a6a2a", stage_scale=0.5, belly_scale=1.2, sub="reptile", identity_notes=["Green skin", "Shell-patterned belly"])
animal("tortoise", "Tortoise", ["कच्छप", "धीमा कछुआ", "tortoise"], "A slow, wise old tortoise with a brown domed shell and a wrinkled face.", "elder_m_hi", "pjhae", fur="#a8a060", belly="#d8d0a0", ears="none", muzzle=None, pattern="spots", pattern_colour="#6a5a2a", stage_scale=0.46, belly_scale=1.25, sub="reptile", identity_notes=["Brown shell pattern", "Wrinkled face"])
animal("snake", "Snake", ["साँप", "नाग", "सर्प", "snake", "cobra"], "A green snake with a pale belly and a flared hood, coiled on its tail.", "villain_hi", "pjhaf", fur="#5a9a4a", belly="#e8e0a0", ears_ext="hood", ear_inner="#7ab85a", muzzle=None, long_tail="snake", pattern="stripes", pattern_colour="#3a6a2a", stage_scale=0.6, sub="reptile", identity_notes=["Flared hood", "Coiled tail"])
animal("lizard", "Lizard", ["छिपकली", "गिरगिट", "lizard"], "A small spotted lizard with a long curved tail.", "rabbit_hi", "pjf", fur="#8aa850", belly="#e0e8a8", ears="none", muzzle="round", long_tail="lizard", pattern="spots", pattern_colour="#5a7a2a", stage_scale=0.44, sub="reptile", identity_notes=["Spotted skin", "Long tail"])
animal("frog", "Frog", ["मेंढक", "दादुर", "frog"], "A bright green frog with a wide mouth and pale throat.", "rabbit_hi", "pjhaef", fur="#5ab84a", belly="#e8f0a8", ears="none", muzzle_ext="wide", pattern="spots", pattern_colour="#2a7a2a", stage_scale=0.44, habitat="aquatic", sub="amphibian", identity_notes=["Wide mouth", "Spotted back"])

# ---------------------------------------------------------------------------------------------- birds
def bird(slug, name, hi, desc, voice, stories, **kw):
    kw.setdefault("belly", kw["fur"])
    kw.setdefault("stage_scale", 0.5)
    kw.setdefault("wings", True)
    kw.setdefault("muzzle_ext", "beak_short")
    kw.setdefault("habitat", "arboreal")
    kw.setdefault("long_tail", "feather")
    return _add("bird", kw.pop("sub", "bird"), slug, name, hi, desc, voice, stories, **kw)


bird("crow", "Crow", ["कौआ", "काग", "crow"], "A glossy black crow with a heavy beak and sharp bright eyes.", "jackal_hi", "pjhaef", fur="#2a2a34", belly="#3a3a46", beak="#1a1a1a", iris="#8a6a2a", stage_scale=0.52, identity_notes=["Glossy black feathers", "Strong black beak"])
bird("peacock", "Peacock", ["मोर", "मयूर", "peacock"], "A peacock in iridescent blue-green with a fan of eyed tail feathers and a small crest.", "monkey_hi", "pjhaf", fur="#2a7ab8", belly="#2a9a88", headwear="crest", headwear_colour="#2a9a88", long_tail="fan", beak="#d8c060", stage_scale=0.6, identity_notes=["Blue neck", "Fan of eyed feathers", "Crest"])
bird("parrot", "Parrot", ["तोता", "शुक", "parrot"], "A green parrot with a red hooked beak and a pink collar ring.", "monkey_hi", "pjhaan", fur="#4ab84a", belly="#7ad86a", muzzle_ext="beak_hook", beak="#d8362a", wing_colour="#2a8a3a", stage_scale=0.5, identity_notes=["Red hooked beak", "Green body"])
bird("pigeon", "Pigeon", ["कबूतर", "pigeon"], "A grey pigeon with an iridescent green-purple neck and a pink foot.", "rabbit_hi", "pjhaf", fur="#8a90a0", belly="#a8aec0", beak="#6a6a6a", foot_colour="#d8788a", wing_colour="#6a7080", stage_scale=0.48, habitat="ground", identity_notes=["Grey body", "Glossy neck"])
bird("owl", "Owl", ["उल्लू", "घुग्घू", "owl"], "A wise brown owl with a pale heart-shaped face and big amber eyes.", "elder_m_hi", "pjhaef", fur="#8a6a4a", belly="#d8c8a8", face="#f0e0c8", ears_ext="cat_small", ear_inner="#8a6a4a", muzzle_ext="beak_hook", beak="#d8a840", iris="#d8a020", wing_colour="#6a4a30", stage_scale=0.52, identity_notes=["Pale facial disc", "Ear tufts"])
bird("eagle", "Eagle", ["गरुड़", "बाज़", "चील", "eagle"], "A proud brown eagle with a white head and a strong yellow hooked beak.", "lion_hi", "pjhaef", fur="#6a4a2a", belly="#8a6a4a", face="#f4f0e8", muzzle_ext="beak_hook", beak="#f0b820", iris="#d8a020", wing_colour="#4a3018", feet="claw", foot_colour="#f0b820", stage_scale=0.62, identity_notes=["White head", "Hooked yellow beak"])
bird("hawk", "Hawk", ["बाज़", "शिकरा", "hawk"], "A sleek barred hawk with a dark brown back and hooked beak.", "jackal_hi", "pjhaf", fur="#7a5a3a", belly="#e0d0b0", pattern="stripes", pattern_colour="#4a3018", muzzle_ext="beak_hook", beak="#d8b030", iris="#d8a020", stage_scale=0.56, identity_notes=["Barred chest", "Hooked beak"])
bird("swan", "Swan", ["हंस", "राजहंस", "swan"], "A white swan with a graceful bearing and an orange beak.", "queen_hi", "pjhan", fur="#fafafa", belly="#ffffff", beak="#f09a20", wing_colour="#e8ecf4", long_tail="feather", stage_scale=0.58, habitat="aquatic", identity_notes=["Pure white feathers", "Orange beak"])
bird("duck", "Duck", ["बत्तख", "बतख", "duck"], "A yellow-brown duck with a wide flat orange bill.", "rabbit_hi", "pjhaef", fur="#e8c05a", belly="#f4e0a0", muzzle_ext="beak_flat", beak="#f08a20", wing_colour="#c8a040", foot_colour="#f08a20", stage_scale=0.48, habitat="aquatic", identity_notes=["Wide orange bill"])
bird("crane", "Crane", ["सारस", "बगुला", "क्रेन", "crane"], "A tall white crane with a long grey beak and a red cap patch.", "elder_m_hi", "pjhae", fur="#f0f0f4", belly="#ffffff", muzzle_ext="beak_long", beak="#8a8a8a", headwear="plume", headwear_colour="#d8362a", wing_colour="#c0c4d0", foot_colour="#6a6a6a", stage_scale=0.7, habitat="aquatic", identity_notes=["Long grey bill", "Red head plume"])
bird("heron", "Heron", ["बगुला", "heron"], "A slim grey heron with a long yellow bill and a crest of dark plumes.", "elder_m_hi", "pjh", fur="#8a9ab0", belly="#d8e0e8", muzzle_ext="beak_spear", beak="#e8c040", headwear="plume", headwear_colour="#2a3a4a", wing_colour="#6a7a90", foot_colour="#c8a030", stage_scale=0.68, habitat="aquatic", identity_notes=["Dagger bill", "Dark crest"])
bird("sparrow", "Sparrow", ["गौरैया", "चिड़िया", "sparrow"], "A small brown-streaked sparrow with a grey cap and a black bib.", "rabbit_hi", "pjhaef", fur="#9a7a5a", belly="#d8c8b0", beak="#6a5a4a", pattern="stripes", pattern_colour="#5a4030", stage_scale=0.38, identity_notes=["Streaked back", "Small and round"])
bird("hen", "Hen", ["मुर्गी", "हंसी", "hen"], "A plump brown hen with a small red comb.", "rabbit_hi", "pjhaef", fur="#b8783a", belly="#d8a060", headwear="crest", headwear_colour="#d8362a", beak="#f0b030", foot_colour="#e8a030", stage_scale=0.5, habitat="ground", belly_scale=1.2, long_tail="feather", identity_notes=["Red comb", "Plump body"])
bird("rooster", "Rooster", ["मुर्गा", "कुक्कुट", "rooster"], "A proud rooster with a bright red comb, copper-gold feathers and a green tail.", "lion_hi", "pjhaef", fur="#c8602a", belly="#e8a030", headwear="crest", headwear_colour="#d8362a", beak="#f0b030", foot_colour="#e8a030", wing_colour="#8a3a1a", stage_scale=0.56, habitat="ground", identity_notes=["Tall red comb", "Gold-copper feathers"])
bird("vulture", "Vulture", ["गिद्ध", "vulture"], "A bald-headed vulture with a dark ruff and a hooked pink-grey beak.", "villain_hi", "pjhaf", fur="#4a3a30", belly="#6a5a4a", face="#d8b8a8", muzzle_ext="beak_hook", beak="#c0a090", wing_colour="#3a2a20", feet="claw", foot_colour="#b09080", stage_scale=0.62, identity_notes=["Bald pink head", "Dark ruff"])
bird("dove", "Dove", ["फ़ाख़्ता", "पंडुक", "dove"], "A soft white dove with a small pink beak.", "queen_hi", "jhaef", fur="#f8f8fc", belly="#ffffff", beak="#f0a0a8", wing_colour="#e4e8f0", foot_colour="#e08898", stage_scale=0.44, identity_notes=["Pure white", "Small pink beak"])
bird("kingfisher", "Kingfisher", ["किलकिला", "रामचिरैया", "kingfisher"], "A kingfisher in vivid blue and orange with a long dagger bill.", "monkey_hi", "pjhf", fur="#2a8ae0", belly="#f08a2a", muzzle_ext="beak_spear", beak="#2a2a2a", wing_colour="#1a6ac0", foot_colour="#d8362a", stage_scale=0.4, habitat="aquatic", identity_notes=["Orange breast", "Blue back"])
bird("woodpecker", "Woodpecker", ["कठफोड़वा", "woodpecker"], "A black and white woodpecker with a bright red crest and a chisel bill.", "monkey_hi", "pjf", fur="#2a2a30", belly="#f4f4f0", muzzle_ext="beak_spear", beak="#4a4a50", headwear="crest", headwear_colour="#d8362a", wing_colour="#1a1a20", stage_scale=0.44, identity_notes=["Red crest", "Black and white pattern"])
bird("mynah", "Mynah", ["मैना", "सारिका", "mynah", "myna"], "A glossy brown mynah with yellow eye-patches and a bright yellow beak.", "monkey_hi", "pjhaf", fur="#5a3a2a", belly="#7a5a3a", muzzle_ext="beak_short", beak="#f0c820", face="#f0d030", wing_colour="#3a2418", foot_colour="#f0c820", stage_scale=0.44, identity_notes=["Yellow face patch", "Yellow beak"])
bird("koel", "Koel", ["कोयल", "कोकिला", "koel", "cuckoo"], "A glossy black koel with a red eye and a pale green-grey beak, famed for song.", "queen_hi", "pjhf", fur="#2a2a38", belly="#3a3a4a", beak="#a8b890", iris="#d8362a", wing_colour="#1a1a28", stage_scale=0.46, identity_notes=["Red eye", "Glossy black feathers"])

# ---------------------------------------------------------------------------------------------- mythological and supernatural
def myth(slug, name, hi, desc, voice, stories, **kw):
    kw.setdefault("belly", kw["fur"])
    kw.setdefault("stage_scale", 0.66)
    if kw.get("clothes") or kw.get("outfit"):
        kw.setdefault("ears", "human")
        kw.setdefault("muzzle", None)
    if kw.pop("barefoot", False):
        kw["feet"] = "bare"
    return _add("mythological", kw.pop("sub", "supernatural"), slug, name, hi, desc, voice, stories, **kw)


myth("yaksha", "Yaksha", ["यक्ष", "yaksha"], "A broad yaksha guardian of treasure in a gold-trimmed blue waistcloth, with tiny tusks and a glowing amber aura.", "villain_hi", "vnf", fur="#7a9ad8", clothes=C("#3a4a8a", "#3a4a8a", "#e6b93c", "#6a4a2a", "#e6b93c"), outfit="vest", ears_ext="elf", headwear="crown", headwear_colour="#e6b93c", fangs=True, belly_scale=1.2, glow="#e6b93c", stage_scale=0.74, sub="nature spirit", identity_notes=["Blue skin", "Gold crown", "Amber glow"])
myth("gandharva", "Gandharva", ["गंधर्व", "gandharva"], "A celestial musician in a pearl-white robe with a flower crown and a flute, lightly glowing.", "young_m_hi", "vsn", fur="#f0c8a0", clothes=C("#f0f0f8", "#d8e0f4", "#a8c8f0", "#d8e0f4", "#a8c8f0"), outfit="robe", headwear="tiara", headwear_colour="#a8c8f0", hair_colour="#1a1210", held="flute", glow="#a8c8f0", halo="#d8e8ff", sub="celestial", identity_notes=["Pale halo", "Flute"])
myth("apsara", "Apsara", ["अप्सरा", "apsara"], "A celestial dancer in a lilac and gold costume with a jewelled headdress and a soft glow.", "young_f_hi", "vsn", fur="#e8b887", clothes=C("#a87ad8", "#f4d8f4", "#e6b93c", "#a87ad8", "#e6b93c"), outfit="dress", headwear="tiara", headwear_colour="#e6b93c", hair_colour="#1a1210", long_hair=True, glow="#f4c8f4", halo="#f8e8ff", sub="celestial", identity_notes=["Lilac costume", "Gold headdress", "Halo"])
myth("rakshasa", "Rakshasa", ["राक्षस", "rakshasa"], "A huge green rakshasa with curved horns, tusks and a scowl, wearing a tattered black wrap.", "villain_hi", "pjvnf", fur="#5a8a4a", clothes=C("#2a2a2a", "#4a2a2a", "#8a2a1a", "#1a1a1a", "#c0392b"), outfit="vest", ears_ext="elf", horns="demon", horn_colour="#d8d0c0", fangs=True, pattern="stripes", pattern_colour="#2a4a2a", belly_scale=1.3, stage_scale=0.9, identity_notes=["Curved horns", "Tusks", "Green skin"])
myth("rakshasi", "Rakshasi", ["राक्षसी", "rakshasi"], "A tall rakshasi with blue-grey skin, a wild mane of black hair, short horns and a crimson sari.", "villain_hi", "pvnf", fur="#7a8ab0", clothes=C("#a8221a", "#a8221a", "#e6b93c", "#3a1a1a", "#e6b93c"), outfit="dress", ears_ext="elf", horns="short", horn_colour="#2a2a2a", headwear="hair_long", hair_colour="#1a1a22", fangs=True, stage_scale=0.76, identity_notes=["Short black horns", "Wild hair", "Crimson sari"])
myth("asura", "Demon King", ["असुर", "दैत्य", "दानव", "demon", "asura"], "A towering red demon king with ram-curled horns, a spiked crown and a black cape-robe.", "villain_hi", "pvn", fur="#c0392b", clothes=C("#1a1a2a", "#2a1a2a", "#e6b93c", "#1a1a1a", "#3a6ad8"), outfit="robe", ears_ext="elf", horns="ram", horn_colour="#2a2a2a", headwear="crown", headwear_colour="#3a3a3a", fangs=True, beard="goatee", beard_colour="#1a1a1a", belly_scale=1.25, stage_scale=0.92, identity_notes=["Red skin", "Ram horns", "Dark spiked crown"])
myth("vetala", "Vetala", ["वेताल", "बेताल", "vetala", "betal"], "A pale, lean vetala in a grey shroud with long black hair, a sly grin and glowing eyes who hangs from trees.", "villain_hi", "v", fur="#c8c8d8", clothes=C("#8a8a9a", "#6a6a7a", "#4a4a5a", "#4a4a5a", "#4a4a5a"), outfit="robe", headwear="hair_long", hair_colour="#1a1a22", fangs=True, glow="#8a8ad8", belly_scale=0.85, stage_scale=0.64, identity_notes=["Pale skin", "Grey shroud", "Long black hair", "Fangs"])
myth("bhoot", "Ghost", ["भूत", "प्रेत", "ghost", "bhoot"], "A friendly-spooky white ghost with a trailing tail and wide round eyes. Scare level adjusts the expression, not the design.", "villain_hi", "vnf", fur="#e8f0ff", ears="none", muzzle=None, long_tail="snake", glow="#c8d8ff", stage_scale=0.6, belly_scale=1.1, identity_notes=["Translucent-looking white body", "Ragged trailing tail"])
myth("spirit", "Forest Spirit", ["वन देवता", "वनदेवी", "आत्मा", "spirit", "forest spirit"], "A gentle leaf-green forest spirit with a flower crest and a soft glow.", "young_f_hi", "jpnf", fur="#7ad89a", ears_ext="elf", ear_inner="#c8f0d0", headwear="crest", headwear_colour="#f4a8d8", glow="#a8f0c0", sub="nature spirit", stage_scale=0.5, identity_notes=["Leaf-green skin", "Pink flower crest"])
myth("deva", "Celestial Being", ["देवता", "देव", "celestial being", "deva"], "A radiant celestial being in saffron and white with a gold crown, a soft halo and calm eyes.", "sage_hi", "vsjn", fur="#f0c8a0", clothes=C("#f4f0e0", "#e8902a", "#e6b93c", "#e8902a", "#3a6ad8"), outfit="robe", headwear="crown", headwear_colour="#e6b93c", halo="#ffe8a0", glow="#ffe8a0", beard="short", sub="celestial", stage_scale=0.72, identity_notes=["Gold halo", "Saffron and white robes"])
myth("naga", "Naga", ["नाग", "नागराज", "naga"], "A serpent-person with a hooded cobra crown, emerald scales and a long coiled tail.", "villain_hi", "pjvn", fur="#2a9a78", clothes=C("#2a5a8a", "#2a9a78", "#e6b93c", "#2a9a78", "#e6b93c"), outfit="vest", ears_ext="hood", ear_inner="#5ac8a0", long_tail="snake", pattern="spots", pattern_colour="#1a6a4a", stage_scale=0.7, sub="serpent being", identity_notes=["Cobra hood", "Emerald scales"])
myth("jinn", "Genie", ["जिन्न", "जिन", "genie", "jinn"], "A smoky blue genie with a tall topknot, gold armbands and a swirling tail in place of legs.", "villain_hi", "n", fur="#4a8ae0", clothes=C("#8a4ad8", "#8a4ad8", "#e6b93c", "#8a4ad8", "#e6b93c"), outfit="vest", headwear="topknot", hair_colour="#2a2a8a", beard="goatee", beard_colour="#2a2a8a", long_tail="snake", glow="#6aaaf8", belly_scale=1.2, stage_scale=0.82, identity_notes=["Blue skin", "Topknot", "Smoke tail"])
myth("fairy", "Fairy", ["परी", "fairy", "pari"], "A tiny fairy in a petal skirt with leaf-shaped wings and a star wand.", "young_f_hi", "nf", fur="#f4c8a8", clothes=C("#f4a8d8", "#f4a8d8", "#fff4a8", "#f4a8d8", "#fff4a8"), outfit="dress", long_tail="wings", wing_colour="#c8f0f8", headwear="hair_long", hair_colour="#f4d8a0", held="staff", glow="#ffe8f8", stage_scale=0.42, identity_notes=["Petal skirt", "Gossamer wings"])
myth("dayan", "Witch", ["चुड़ैल", "डायन", "witch", "dayan"], "A hunched witch in a patched purple dress, a pointed hat and a crooked staff.", "villain_hi", "pvnf", fur="#a8b878", clothes=C("#5a2a7a", "#3a1a4a", "#8a5ab8", "#1a1a1a", "#8a5ab8"), outfit="dress", headwear="hat_pointed", headwear_colour="#3a1a4a", beard="stubble", beard_colour="#6a6a6a", held="staff", fangs=True, stage_scale=0.6, belly_scale=0.9, identity_notes=["Green skin", "Pointed hat", "Crooked staff"])
myth("giant", "Giant", ["दानव", "विशालकाय", "giant"], "A huge friendly-gruff giant in a patchwork leather tunic carrying a tree-branch club.", "crocodile_hi", "pnfe", fur="#c89a70", clothes=C("#8a6a3a", "#5a4a3a", "#6a4a2a", "#2a1a10", "#6a4a2a"), outfit="vest", hair="short", hair_colour="#6a3a1a", beard="short", beard_colour="#6a3a1a", held="club", barefoot=True, belly_scale=1.4, stage_scale=1.0, identity_notes=["Enormous size", "Patchwork tunic"])
myth("golden_deer", "Golden Deer", ["सोने का हिरण", "स्वर्ण मृग", "golden deer", "magical deer"], "A magical golden deer with silver antlers and a soft glow.", "rabbit_hi", "jpf", fur="#f0c030", belly="#fff4c0", ears="pointed", ear_inner="#fff0c0", horns="antlers", horn_colour="#d8dce8", pattern="spots", pattern_colour="#fff4c0", tail="puff", feet="hoof", foot_colour="#8a6a1a", muzzle="round", glow="#ffe890", stage_scale=0.64, sub="magical animal", identity_notes=["Golden coat", "Silver antlers"])
myth("dragon", "Dragon", ["ड्रैगन", "अजगर", "dragon"], "A round, friendly green dragon with small wings, horn nubs and a spiked tail.", "crocodile_hi", "nf", fur="#4ab868", belly="#f0e8a0", ears="pointed", ear_inner="#2a8a48", horns="short", horn_colour="#f0e8a0", wing_colour="#6ad88a", long_tail="wings_lizard", fangs=True, feet="claw", muzzle="round", stage_scale=0.8, belly_scale=1.25, sub="fantasy creature", identity_notes=["Small wings", "Horn nubs", "Spiked tail"])
