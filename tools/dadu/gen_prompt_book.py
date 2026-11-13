#!/usr/bin/env python3
"""Builds the DADU prompt book: every ChatGPT prompt written out in full, nothing to fill in.
Writes docs/dadu/art-brief/chatgpt-prompts.json (used by the importer and by Claude) and
docs/dadu/art-brief/prompt-book.html (the phone-friendly page with Copy buttons).
Run: python3 tools/dadu/gen_prompt_book.py
"""
import csv, json, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BRIEF = os.path.join(ROOT, 'docs', 'dadu', 'art-brief')

STYLE = ("Premium chibi-anime children's game art. Soft painterly shading with clean highlights, warm cinematic light from the upper right, "
         "rounded friendly shapes, rich but balanced colours, modern Indian family home setting. No text, no logos, no watermark.")
CUTOUT = "on a perfectly flat solid pure magenta (#FF00FF) background. No ground, no shadow on the background, no text, no magenta anywhere on the subject."

CHARS = {
 'dadaji': ("Dadaji", "Dadaji, an elderly Indian grandfather in chibi proportions (large head, small body): bald crown, white hair only around the sides and back of the head, a prominent thick curved white moustache, large rectangular slightly tinted spectacles, distinct forehead wrinkles, a defined nose, a slightly lean body, a plain cream kurta, a white dhoti, green traditional sandals, a kind dignified expression and expressive hands. No waistcoat, no scarf, no cap, no round glasses", True),
 'chintu': ("Chintu", "Chintu, a naughty, curious Indian boy about 6 years old in chibi proportions: messy black hair with a cowlick, large expressive brown eyes, a yellow T-shirt, blue shorts, colourful sneakers and a playful affectionate expression", True),
 'buddy': ("Buddy", "Buddy, a playful dog in chibi proportions: warm golden-brown coat with a cream muzzle and belly, floppy ears, large expressive eyes, a red collar with a small tag and a friendly open expression", False),
 'chikki': ("Chikki", "Chikki, a white rabbit in chibi proportions: soft white fur, pink inner ears, a round soft body, large eyes, a tiny pink nose and a curious, slightly shy expression", False),
 'gauri': ("Gauri", "Gauri, a gentle Indian domestic cow in chibi proportions: white coat with brown patches, a friendly kind face, two distinctive curved horns, a pink muzzle, a small brass bell on a red collar and a calm protective expression", False),
 'nandu': ("Nandu", "Nandu, a small brown-and-white calf in chibi proportions: brown coat with white patches, a white blaze on the face, a tuft of hair on the forehead, large shining eyes, short stubby legs and a playful expression", False),
 'mitthu': ("Mitthu", "Mitthu, a small Indian mountain parrot in chibi proportions: bright green body, a slate-blue head, a red-orange beak, a long blue-green tail, large bright eyes and a cheerful expression", False),
}
POSES = {
 'idle': "standing relaxed and facing the viewer, mouth closed, calm friendly expression",
 'talk': "standing and facing the viewer, mouth open as if speaking warmly, one hand slightly raised",
 'happy': "a big happy smile, both arms slightly raised in joy",
 'think': "one hand on the chin, eyes looking up, thinking",
 'sad': "a small downcast sad expression, shoulders slumped",
 'surprised': "wide eyes and open mouth, hands raised in surprise",
 'sleepy': "half-closed sleepy eyes and a big yawn",
 'walk': "mid-step walking pose seen from the front three-quarter side, one foot forward, arms swinging",
 'wave': "waving one hand hello with a smile",
 'teach': "one finger raised as if explaining something important, kind expression",
 'face': "head and shoulders only, smiling, facing the viewer, filling the picture",
}
ANIMAL_POSES = {'idle': POSES['idle'].replace('calm friendly expression', 'calm friendly expression, tail relaxed'),
                'talk': "standing and facing the viewer, mouth open as if making its happy sound",
                'happy': "a big happy expression, ears lifted, tail wagging",
                'walk': "mid-step walking pose seen from the side, one leg forward",
                'face': "head and neck only, smiling, facing the viewer, filling the picture"}
POSE_SETS = {'dadaji': ['idle', 'talk', 'happy', 'think', 'sad', 'surprised', 'sleepy', 'walk', 'wave', 'teach', 'face'],
             'chintu': ['idle', 'talk', 'happy', 'think', 'walk', 'face']}
for k in ('buddy', 'chikki', 'gauri', 'nandu', 'mitthu'):
    POSE_SETS[k] = ['idle', 'talk', 'happy', 'walk', 'face']

DESC = {
 # animals and care
 'ball_big': "a big red-and-yellow play ball", 'bell_small': "a small brass cow bell on a red strap", 'brush': "a small grooming brush with a wooden handle",
 'brush_big': "a large stiff cow brush with a wooden handle", 'cricket_bat_ball': "a wooden cricket bat leaning against a red cricket ball", 'dog_house': "a small wooden dog house with a red roof",
 'feed_bowl': "a steel pet food bowl full of kibble", 'fish': "a golden-orange pond fish", 'fodder_trough': "a long wooden cattle fodder trough full of green fodder",
 'football': "a black-and-white football", 'fruit_bowl': "a steel bowl of mangoes, bananas and guavas", 'hay': "a neat pile of golden hay with a pitchfork",
 'milk_pail': "a steel milk pail with a little milk in it", 'nest_box': "a small wooden bird nest box with a round hole", 'rabbit_hutch': "a wooden rabbit hutch with a wire front and a slanted roof",
 'salt_lick': "a pale pink salt lick block for cattle", 'toothbrush': "a big friendly toothbrush with toothpaste on the bristles", 'water_bowl': "a steel pet water bowl full of water",
 'water_trough': "a stone cattle water trough full of water",
 # buildings and shop items
 'bazaar_stall': "an Indian bazaar stall with a striped orange awning and a wooden counter", 'gate': "a modern Indian front garden gate with brick pillars and a black metal gate",
 'library_arch_shelf': "an arched wooden story bookshelf full of colourful picture books", 'library_shelf': "a long wooden library bookshelf with labelled sections full of books",
 'shrine': "a small stone Ganesha shrine with a brass lamp", 'stage': "a small raised wooden festival stage with a coloured cloth backdrop", 'stall': "a vegetable stall with baskets of tomatoes, brinjals and spinach under a green awning",
 'stall_bangles': "a bangle stall with stacks of colourful glass bangles", 'stall_cloth': "a cloth stall with rolls of bright Indian fabrics", 'stall_sweets': "an Indian sweet shop counter with trays of laddoos and jalebi",
 'temple_bell': "a hanging brass temple bell on a wooden frame", 'tv_wall': "a living room TV unit with a flat TV on a low wooden cabinet and a decorative panel behind it",
 # household
 'abacus': "a colourful children's abacus", 'alarm_clock': "a round retro alarm clock with two bells", 'armchair': "a comfortable reading armchair with a cushion",
 'atlas': "a small wooden table with an open atlas on it", 'audio_corner': "a cosy audiobook corner with a beanbag and headphones", 'basket': "a woven harvest basket full of fresh vegetables",
 'bed': "a double bed with a colourful Indian bedspread and two pillows", 'bee_box': "a white wooden beehive box with a few bees", 'bench': "a wooden garden bench",
 'binoculars': "a pair of binoculars", 'bins_three': "three waste bins in green, blue and yellow for waste sorting", 'bird_feeder': "a wooden bird feeder on a pole with seeds",
 'bookcase_low': "a low wooden bookcase with a few books", 'bookshelf': "a tall wooden bookshelf full of colourful books", 'bucket': "a steel bucket",
 'calendar': "a festival wall calendar with a picture of a diya", 'carrom': "a square wooden carrom board with coins and a striker", 'chair': "a simple wooden dining chair",
 'chess_table': "a small table with a chess board and pieces", 'circuit_kit': "a children's electronics kit with a battery, a bulb and wires on a board", 'clay_table': "a table with a lump of clay and a half-made clay pot",
 'clock': "a round wooden-framed wall clock", 'dandiya': "a pair of decorated dandiya sticks", 'desk': "a wooden study desk with drawers and a desk lamp",
 'desk_counter': "a library service counter with a stamp and a pile of books", 'desk_small': "a small child's study desk with a notebook and pencils", 'dictionary': "a thick dictionary on a small stand",
 'dining_table': "a wooden dining table laid with steel plates, glasses and a water jug", 'diya': "a small shelf with two glowing brass diyas", 'door': "a wooden door with a brass handle",
 'dung_cakes': "a stack of round dung cakes for fuel", 'easel': "a wooden painting easel with a colourful painting", 'flute': "a bamboo flute",
 'fridge': "a modern two-door refrigerator", 'front_door': "a saffron-coloured front door with a brass nameplate and a small bell", 'gallery_board': "a wooden display board with colourful traditional paintings",
 'garden_lamp': "a modern garden path lamp on a post", 'ghungroo': "a string of brass ghungroo dance bells", 'globe': "a world globe on a wooden stand",
 'harmonium': "a wooden harmonium", 'headphones': "a pair of big headphones on a small stand", 'hide': "a small wooden bird-watching hide hut with a viewing slot",
 'instrument_rack': "a wooden rack holding folk instruments (dholak, ektara, manjira)", 'kitchen_island': "a modern kitchen island with a marble top and two stools", 'lab_bench': "a science lab bench with beakers and test tubes",
 'ladder': "a wooden ladder", 'lamp': "a standing floor lamp with a cream shade", 'laptop': "an open laptop on a small stand", 'letterbox': "a red Indian post letterbox on a post",
 'librarian_desk': "a wide wooden librarian desk with a computer and a pile of books", 'magnifier': "a big magnifying glass with a wooden handle", 'map_india': "a framed wall map of India",
 'measuring_cups': "a set of steel measuring cups and spoons", 'memory_cards': "a set of face-down memory game cards with a few turned up", 'nameplate': "a brass house nameplate that says DADU",
 'origami_tray': "a tray of colourful folded origami paper and a paper crane", 'paint_pots': "a row of colourful paint pots with brushes", 'paint_table': "a craft table with paper and paint",
 'perch': "a wooden parrot perch on a stand", 'photo_frame': "a wall shelf with three framed family photos", 'piggy_bank': "a pink piggy bank",
 'potter_wheel': "a potter's wheel with a wet clay pot", 'radio': "a retro wooden radio with two knobs", 'rain_pipe': "a rainwater downpipe with a water barrel",
 'reading_table': "a long wooden reading table with books and a lamp", 'robot_mat': "a coding mat with a small toy robot", 'seed_jars': "a shelf with glass jars of different seeds",
 'seed_trays': "trays of tiny seedlings", 'shoe_rack': "a wooden shoe rack with a few pairs of shoes", 'sign_post': "a friendly scarecrow with a straw hat in a field",
 'sink': "a modern kitchen sink with a tap", 'sitar': "a sitar", 'sky_spot': "a small stargazing stool with a star chart", 'sofa': "a three-seat sofa with colourful cushions",
 'solar_panel': "a rooftop solar panel on a stand", 'spice_box': "a round steel masala dabba spice box with small bowls", 'spray_bottle': "a plant mister spray bottle",
 'star_lamp': "a star-shaped night lamp glowing softly", 'stove': "a modern gas stove with a pot on it", 'sundial': "a stone sundial", 'tabla': "a pair of tabla drums",
 'telescope': "a telescope on a tripod", 'thali': "a steel thali with roti, dal, rice and vegetables", 'thermometer': "a big weather thermometer on a post",
 'tool_rack': "a wall rack with garden tools", 'toy_box': "a wooden toy box overflowing with toys", 'tunnel': "a colourful fabric play tunnel", 'wardrobe': "a wooden wardrobe with two doors",
 'washbasin': "a modern wash basin with a tap and a mirror", 'water_jug': "a steel water jug with two glasses", 'water_tank': "a round black rooftop water tank on a stand",
 'watering_can': "a green metal watering can", 'weighing_scale': "an old-fashioned weighing scale with two pans", 'workbench': "a garden workshop workbench with tools",
 # nature
 'banana_plant': "a banana plant with a bunch of bananas", 'bed_empty': "an empty raised garden bed with fresh brown soil", 'bed_flower': "a raised garden bed full of pink and orange flowers",
 'bed_kid': "a child's single bed with a bright blue bedspread and a cuddly toy", 'bed_veg': "a raised garden bed with tomato, brinjal and spinach plants", 'bush': "a round green bush",
 'butterfly_bush': "a flowering butterfly bush with three butterflies", 'carrot_patch': "a small garden patch with carrots showing their orange tops", 'compost_bin': "a wooden compost bin with a lid and vegetable peels",
 'guava_tree': "a small guava tree with green guavas", 'leaf_caterpillar': "a big green leaf with a friendly caterpillar on it", 'lotus': "a pink lotus flower on a lily pad",
 'planter': "a modern terracotta planter with flowering plants", 'planter_rail': "a balcony railing planter box full of flowers", 'tree_coconut': "a tall coconut palm with coconuts",
 'tree_gulmohar': "a gulmohar tree with red-orange flowers", 'tree_mango': "a mango tree full of green leaves and yellow mangoes", 'tree_neem': "a neem tree with fine green leaves",
 'tree_sign': "a small wooden tree-name board on a post", 'tulsi_pot': "a tulsi plant in a decorated square tulsi planter",
 # sports and play
 'badminton_net': "a badminton net with a racket and shuttlecock", 'balance_beam': "a low wooden balance beam", 'bathtub': "a white modern bathtub", 'bicycle': "a small child's bicycle",
 'cricket_stumps': "three cricket stumps with a bat and a ball", 'kabaddi_court': "a chalk-marked kabaddi court corner with a centre line", 'kite': "a colourful diamond kite with a long tail",
 'magnet': "a red horseshoe magnet with a few paper clips", 'swing_seat': "a wooden swing seat (jhoola) hanging from chains on a frame",
 # singles
 'villa_building': "a modern two-storey Indian family villa with a flat roof terrace and wooden pergola, a first-floor balcony with planters, large glass windows, cream and warm-white walls with a stone accent wall, a saffron front door, an entrance veranda with a swing",
 'villa_mini': "a small simple picture of a modern two-storey Indian family villa with a flat roof, for a map",
 'cow_shed': "an open cow shelter with a tiled roof on wooden pillars, hay, a fodder trough, a water trough and a hanging brass bell",
 'gopuram': "a colourful South Indian temple gopuram tower with tiered carved levels",
 'shikhara': "a North Indian temple with a tall curved shikhara spire and a small entrance",
 'library_building': "a public library building with arched windows, a front veranda, stone steps and a sign with a book symbol (no words)",
 'pandal': "a colourful festival pandal tent with fabric canopy, marigold garlands and bunting",
 'park_mini': "a small simple picture of a public park with swings, a slide and trees, for a map",
 'pond': "a garden pond with lotus flowers, lily pads, a frog and reeds",
 'pergola': "a wooden garden pergola with climbing creepers and a bench",
 'slide': "a colourful playground slide with a ladder", 'swing_set': "a playground swing set with two swings",
 'fountain': "a stone garden fountain with a tiered bowl and splashing water",
 'tree_banyan': "a big banyan tree with hanging aerial roots and a circular stone platform around the trunk",
 'balloon_portal': "a colourful hot-air balloon with a small basket",
 'temple_building': "a small Indian temple building with a carved entrance and a flag on top",
 'bazaar_mini': "a small simple picture of an Indian bazaar with coloured awnings, for a map",
}
ALIASES = {'mango_tree': 'tree_mango', 'flower_bed': 'bed_flower', 'veg_bed': 'bed_veg', 'cycle': 'bicycle', 'stumps': 'cricket_stumps', 'wash_basin': 'washbasin',
           'compost': 'compost_bin', 'lamp_stand': 'lamp', 'food_bowl': 'feed_bowl', 'hay_pile': 'hay', 'toothbrush_shelf': 'toothbrush'}
SKIP = {'hill', 'river', 'path_stone', 'compound_wall', 'fence', 'banyan_platform', 'reading_carpet', 'rug', 'activity_mat', 'kolam', 'rangoli', 'yoga_mat', 'track', 'hopscotch', 'footprints', 'villa_exterior'}
SINGLES = ['villa_building', 'villa_mini', 'cow_shed', 'gopuram', 'shikhara', 'library_building', 'pandal', 'park_mini', 'pond', 'pergola', 'slide', 'swing_set', 'fountain', 'tree_banyan', 'balloon_portal', 'temple_building', 'bazaar_mini']

ROOMS = [
 ('living', "a modern Indian villa living room: a sofa, a TV unit, a tall bookshelf full of books, a telescope by a large window, a globe, a wall clock, a colourful rug, a potted plant, warm afternoon light through the window"),
 ('kitchen', "a modern Indian kitchen: a kitchen island with stools, a fridge, a gas stove, shelves with steel containers and a masala box, a window, warm light"),
 ('dining', "a modern Indian dining room: a wooden dining table laid with steel plates and a water jug, chairs, a fruit bowl, a hanging lamp"),
 ('study', "a study room: a wooden desk with a laptop and a lamp, a bookshelf, a framed map of India on the wall, a globe, a small chess table"),
 ('activity_art', "an art and craft corner: an easel with a painting, pots of paint, a clay table, an origami tray, children's drawings hanging on a string, a Madhubani painting on the wall"),
 ('activity_music', "a music room: a harmonium, a pair of tabla, a sitar leaning on the wall, a bamboo flute on the wall, ghungroo bells, a colourful rug"),
 ('activity_lab', "a children's science corner: a lab bench with beakers, a magnet, a microscope, a circuit kit, a glass prism, a colourful science poster"),
 ('bedroom', "a child's bedroom at night: a bed with a colourful bedspread, a glowing star-shaped lamp, a toy box, a wardrobe, a window with a moon and stars outside"),
 ('veranda', "the entrance veranda of a modern Indian villa: a wooden swing (jhoola), a tulsi plant in a pot, a rangoli at the doorway, a shoe rack, a parrot perch, a saffron-coloured front door, morning light"),
 ('terrace', "a roof terrace of a modern villa: a wooden pergola with climbing plants, planters, a telescope, a view of the evening sky, colourful kites"),
 ('garden_bed', "a vegetable garden: raised beds with tomato, brinjal and spinach plants, a watering can, a scarecrow, a mango tree, a compost bin, soft morning light"),
 ('cowshed', "an open cow shelter: a tiled roof on wooden pillars, hay, a fodder trough, a water trough, a milk pail, a hanging brass bell, a soil floor"),
 ('rabbit', "a rabbit enclosure in a garden: a wooden hutch, a carrot patch, a food bowl, a low wooden fence, soft grass"),
 ('dog', "a dog's corner in a garden: a wooden dog house, a food bowl, a water bowl, a ball, a low fence, soft grass"),
 ('pond', "a garden pond: lotus flowers, lily pads, a frog, a fish, a small wooden bench, tall reeds"),
 ('public_garden', "a public playground park: swings, a slide, a balance beam, cricket stumps, trees with name boards, a sundial, butterflies, a winding path"),
 ('library', "a public library: tall arched wooden bookshelves full of books, a librarian desk, a reading corner with cushions, a reading lamp, a wooden ladder"),
 ('temple', "an Indian temple courtyard: a North Indian shikhara and a South Indian gopuram, a hanging temple bell, brass lamps, a rangoli, a banyan tree, a stone floor, peaceful golden light"),
 ('bazaar', "an Indian bazaar lane: colourful awning stalls selling vegetables, bangles, cloth and sweets, a potter's wheel, strings of marigold flowers, warm lively light"),
 ('space', "outer space: stars, the Sun on the left, planets in a row including Saturn with its rings, the Moon, a deep blue-purple sky, and a flat grey moon-surface at the bottom"),
 ('forest', "a green Indian forest: tall sal trees, ferns, sunbeams, a small stream, a hidden deer, colourful birds"),
 ('mountains', "the Himalayan mountains: snowy peaks, pine trees, a glacier, a clear blue sky, a mountain path at the bottom"),
 ('ocean', "a tropical ocean scene: blue water with sunbeams, coral, colourful fish, a turtle and a seal, and a sandy sea floor at the bottom"),
 ('monument', "an ancient Indian monument: a sandstone fort gate with arches, a stone courtyard, a blue sky, a few trees"),
]

def prop_groups():
    rows = list(csv.DictReader(open(os.path.join(BRIEF, 'objects.csv'), encoding='utf-8')))
    meta = {r['sprite_key']: r for r in rows}
    keys = [k for k in meta if k not in SKIP and k not in ALIASES]
    keys = [k for k in keys if k in DESC] + [k for k in DESC if k not in meta and k in SINGLES]
    keys = list(dict.fromkeys(keys))
    missing = [k for k in meta if k not in SKIP and k not in ALIASES and k not in DESC]
    assert not missing, f'no description for: {missing}'
    singles = [k for k in SINGLES if k in keys]
    rest = [k for k in keys if k not in singles]
    cat = lambda k: meta[k]['category'] if k in meta else 'buildings'
    order = lambda k: (int(meta[k]['priority']) if k in meta else 1, k)
    groups = []
    for title, cats in (('Household objects', ['furniture-and-household']), ('Garden and nature', ['nature']), ('Animals and care', ['animals-and-care']), ('Sports, play and shops', ['sports-and-play', 'buildings'])):
        ks = sorted([k for k in rest if cat(k) in cats], key=order)
        groups.append((title, ks))
    return groups, singles

def sheet_prompt(keys):
    n = len(keys)
    items = ', '.join(f"{i + 1} {DESC[k]}" for i, k in enumerate(keys))
    rest = " The remaining cells stay empty." if n < 9 else ''
    return (f"{STYLE} A 3 by 3 grid sprite sheet of {n} separate objects for an isometric children's game, in reading order from top-left to bottom-right: {items}. "
            f"Every object is drawn from the same isometric three-quarter view from above, front and right, lit from the upper right. Each object sits alone in the centre of its own equal square cell "
            f"and fills about 70 percent of the cell, with wide empty space around it, whatever its real size.{rest} "
            f"The whole picture has a perfectly flat solid pure magenta (#FF00FF) background, no ground, no shadows on the background, no grid lines, no text, and no magenta on the objects. Square image.")

def single_prompt(k):
    return (f"{STYLE} One single object for an isometric children's game: {DESC[k]}. Drawn from an isometric three-quarter view from above, front and right, lit from the upper right, "
            f"centred with wide empty space around it and filling about 80 percent of the picture. Perfectly flat solid pure magenta (#FF00FF) background, no ground, no shadow on the background, no text, no magenta on the object. Square image.")

def build():
    groups, n = [], [0]
    def add(g, label, target, text, **kw):
        n[0] += 1
        g['items'].append({'n': f"{n[0]:03d}", 'label': label, 'target': target, 'text': text, **kw})
    g = {'id': 'start', 'title': 'Start here: the style picture', 'note': "Open a new ChatGPT chat and paste this. It sets the look. Save the picture and send it to me.", 'items': []}
    add(g, 'Style board', 'style', f"{STYLE} Make one style board image: the head of an elderly Indian grandfather with a thick curved white moustache and large rectangular tinted glasses, the head of a naughty 6-year-old Indian boy with messy black hair, a red sofa, a corner of a modern living room, and a row of six colour swatches. Wide image.")
    groups.append(g)
    for key, (name, desc, human) in CHARS.items():
        g = {'id': key, 'title': f"{name}: sheet and {len(POSE_SETS[key])} pictures", 'note': f"Open ONE new ChatGPT chat for {name}. Paste the prompts below one after another in that same chat, so the pictures match." + (" If you have the real photo of the grandfather, attach it to the first prompt only." if key == 'dadaji' else ''), 'items': []}
        photo = "If a photo of the grandfather is attached to this message, copy his face from it exactly (the moustache, the glasses, the forehead wrinkles). If no photo is attached, draw him from this description. " if key == 'dadaji' else ''
        exprs = "happy, laughing, surprised, thinking, sad and sleepy" if human else "happy, surprised, sleepy and sad"
        views = "front view, side view and back view" if human else "front view and side view"
        add(g, f"{name} character sheet", f"characters/{key}/sheet", f"{photo}{STYLE} Character reference sheet of {desc}. Show the same character in {views}, plus {'six' if human else 'four'} face close-ups with different expressions: {exprs}. Arranged neatly on a plain white background, no text, no labels. Wide image.")
        for p in POSE_SETS[key]:
            pd = POSES[p] if (human or p not in ANIMAL_POSES) else ANIMAL_POSES[p]
            if not human and p in ANIMAL_POSES: pd = ANIMAL_POSES[p]
            if p == 'face':
                frame = f"Head only, centred and filling most of the picture, square image, {CUTOUT}"
            else:
                frame = f"Full figure, centred, the whole figure visible with empty space all around it, same size and position in the picture as the front view of the sheet, square image, {CUTOUT}"
            add(g, f"{name}: {p}", f"characters/{key}/{p}", f"{STYLE} {desc[0].upper() + desc[1:]}. This is the same character as in the reference sheet earlier in this chat: same colours, same proportions. Pose: {pd}. {frame}")
        groups.append(g)
    pgroups, singles = prop_groups()
    for title, ks in pgroups:
        g = {'id': 'props-' + title.split()[0].lower(), 'title': f"{title} ({len(ks)} objects)", 'note': "Open one ChatGPT chat. Paste these sheets one after another. Each makes a grid of up to 9 objects. Send me the pictures in this order.", 'items': []}
        for i in range(0, len(ks), 9):
            chunk = ks[i:i + 9]
            add(g, f"Objects sheet: {', '.join(chunk[:3])} and {len(chunk) - 3} more" if len(chunk) > 3 else 'Objects sheet', 'props-sheet', sheet_prompt(chunk), names=chunk + ['-'] * (9 - len(chunk)))
        groups.append(g)
    g = {'id': 'props-large', 'title': f"Large buildings and trees ({len(singles)} pictures)", 'note': "One picture each. Paste them one after another in one chat.", 'items': []}
    for k in singles:
        add(g, k.replace('_', ' ').capitalize(), f"props/{k}", single_prompt(k))
    groups.append(g)
    g = {'id': 'rooms', 'title': f"Side-view rooms and places ({len(ROOMS)})", 'note': "Open one ChatGPT chat and paste these one after another. Each is a wide picture of a room or place.", 'items': []}
    for name, d in ROOMS:
        add(g, name.replace('_', ' ').capitalize(), f"rooms/{name}", f"{STYLE} A straight-on side view of {d}, like a stage set, used as the background of a children's game. No people and no animals. Wide 3:2 image, flat front view, no perspective tilt. The floor, where characters will stand, starts about 83 percent of the way down the picture, with clear open floor in the lowest part of the picture. Keep the main items in the middle so the left and right edges can be cropped. No text.")
    groups.append(g)
    sp = list(csv.DictReader(open(os.path.join(BRIEF, 'story-pages.csv'), encoding='utf-8')))
    stories = {}
    for r in sp: stories.setdefault(r['story_id'], []).append(r)
    for sid, pages in stories.items():
        title = sid.replace('story.', '').replace('_', ' ').replace('.', ': ').title()
        g = {'id': sid, 'title': f"Story: {title} ({len(pages)} pages)", 'note': "Open ONE new ChatGPT chat for this story. Paste the pages in order in the same chat so the characters stay the same.", 'items': []}
        for i, r in enumerate(pages):
            keep = "Design the characters now. They must look exactly the same in the next pictures of this story." if i == 0 else "Keep every character looking exactly the same as in the earlier pictures of this story in this chat."
            add(g, f"Page {r['page']}", f"story/{r['art_file_name']}", f"{STYLE} Picture-book illustration for a children's story, wide 3:2 image, no text and no speech bubbles. The moment to illustrate: {r['scene_text_en']} The people and animals are friendly chibi-anime characters. {keep}")
        groups.append(g)
    return groups

PAGE = open(os.path.join(os.path.dirname(__file__), 'prompt_book_template.html'), encoding='utf-8').read()

if __name__ == '__main__':
    groups = build()
    total = sum(len(g['items']) for g in groups)
    data = {'style': STYLE, 'aliases': ALIASES, 'skipped': sorted(SKIP), 'groups': groups}
    json.dump(data, open(os.path.join(BRIEF, 'chatgpt-prompts.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    slim = json.dumps({'total': total, 'groups': [{'id': g['id'], 'title': g['title'], 'note': g['note'], 'items': [{'n': i['n'], 'label': i['label'], 'target': i.get('names') and 'sheet: ' + ', '.join(x for x in i['names'] if x != '-') or i['target'], 'text': i['text']} for i in g['items']]} for g in groups]}, ensure_ascii=False)
    open(os.path.join(BRIEF, 'prompt-book.html'), 'w', encoding='utf-8').write(PAGE.replace('__DATA__', slim.replace('</', '<\\/')))
    print('prompts:', total, 'groups:', len(groups))
