"""Seed list for the master story catalogue.

PROVENANCE: titles, collections and premises below were written from general knowledge of these traditional tales; none has been checked
against a printed source, and traditional tales vary by version. Every entry is therefore `source_verified: false`. A collection is
never described as fully catalogued: only the tales listed here are tracked. Translations and modern retellings can be under copyright;
the engine uses only its own wording, never copied text.
Each tuple: (id, title_en, title_hi, one-line premise, [character names], [location tags], [prop tags], [action semantics], [expression needs])
"""
from __future__ import annotations

COLLECTIONS = {
    "panchatantra": {"name": "Panchatantra", "origin": "Ancient Sanskrit animal-fable collection (attributed to Vishnu Sharma); many recensions and translations.",
                     "public_domain_note": "Underlying tales are traditional; specific translations may be copyrighted."},
    "jataka": {"name": "Jataka tales", "origin": "Buddhist birth-story tradition in Pali; many retellings.", "public_domain_note": "Traditional; check any translation used."},
    "hitopadesha": {"name": "Hitopadesha", "origin": "Sanskrit fable collection (Narayana Pandit), related to the Panchatantra.", "public_domain_note": "Traditional; check any translation used."},
    "vikram_betal": {"name": "Vikram and Betal (Baital Pachisi)", "origin": "Sanskrit/Hindi frame-story of 25 riddle tales.", "public_domain_note": "Traditional; check any translation used."},
    "singhasan_battisi": {"name": "Singhasan Battisi", "origin": "Frame-story of 32 tales told by statues on King Vikramaditya's throne.", "public_domain_note": "Traditional; check any translation used."},
    "akbar_birbal": {"name": "Akbar and Birbal", "origin": "Folk tradition of court anecdotes; mostly legendary rather than historical.", "public_domain_note": "Traditional; modern books may be copyrighted."},
    "tenali_raman": {"name": "Tenali Raman", "origin": "Folk tradition of court wit attributed to a poet at the Vijayanagara court.", "public_domain_note": "Traditional; modern books may be copyrighted."},
    "aesop": {"name": "Aesop's fables", "origin": "Ancient Greek fable tradition.", "public_domain_note": "Traditional and widely in the public domain; check the translation used."},
    "arabian_nights": {"name": "Arabian Nights (One Thousand and One Nights)", "origin": "Middle-Eastern and South-Asian frame-story collection; some well-known tales (e.g. Aladdin) were added by later translators.",
                       "public_domain_note": "Older translations are in the public domain; check the one used."},
    "folk": {"name": "Regional folk tales", "origin": "Not catalogued: no regional tale is listed until its source is verified.", "public_domain_note": "n/a"},
    "original": {"name": "Original stories", "origin": "Written for this project.", "public_domain_note": "Project-owned."},
}

STORIES = {
    "panchatantra": [
        ("monkey_and_crocodile", "The Monkey and the Crocodile", "बंदर और मगरमच्छ", "A monkey outwits a crocodile who wants his heart.", ["monkey", "crocodile", "crocodile's wife"], ["river", "tree", "jamun"], ["jamun"], ["swim", "climb", "throw"], ["happy", "worried", "angry"]),
        ("blue_jackal", "The Blue Jackal", "नीला सियार", "A jackal dyed blue passes as a king until he howls.", ["jackal", "blue jackal", "lion"], ["forest", "village"], ["dye"], ["walk", "fall"], ["happy", "worried"]),
        ("lion_and_clever_rabbit", "The Lion and the Clever Rabbit", "शेर और चतुर खरगोश", "A rabbit tricks a tyrant lion into a well.", ["lion", "rabbit"], ["forest", "well"], [], ["walk", "jump"], ["angry", "thinking"]),
        ("crows_and_black_snake", "The Crows and the Black Snake", "कौए और काला साँप", "Crows get rid of a snake by using a queen's necklace.", ["crow", "snake", "king"], ["tree", "palace"], ["money"], ["fly", "walk"], ["worried", "happy"]),
        ("tortoise_and_geese", "The Tortoise and the Geese", "कछुआ और हंस", "A talkative tortoise falls while being carried by geese.", ["tortoise", "swan"], ["pond", "village"], [], ["fly", "fall"], ["surprised", "sad"]),
        ("mongoose_and_brahmin", "The Brahmin's Wife and the Mongoose", "ब्राह्मणी और नेवला", "A hasty act wrongs a faithful mongoose.", ["brahmin", "mongoose", "snake"], ["home", "village"], [], ["walk"], ["sad", "angry"]),
        ("monkey_and_wedge", "The Monkey and the Wedge", "बंदर और कील", "A curious monkey pulls a wedge from a half-split log.", ["monkey", "carpenter"], ["forest"], [], ["sit", "climb"], ["surprised", "sad"]),
        ("crane_and_crab", "The Crane and the Crab", "बगुला और केकड़ा", "A cunning crane is outwitted by a crab.", ["crane", "crab", "fish"], ["pond"], [], ["walk"], ["thinking", "angry"]),
        ("mice_that_ate_iron", "The Merchant and the Mice that Ate Iron", "लोहे की तराज़ू", "A merchant answers a lie with a bigger tale.", ["merchant", "rat"], ["home", "market"], ["money"], ["walk"], ["angry", "laughing"]),
        ("donkey_in_tiger_skin", "The Donkey in the Tiger's Skin", "शेर की खाल में गधा", "A washerman's donkey is caught by its bray.", ["donkey", "tiger", "farmer"], ["field", "village"], [], ["walk", "run"], ["happy", "worried"]),
        ("four_friends", "The Four Friends", "चार मित्र", "A crow, mouse, tortoise and deer help each other.", ["crow", "rat", "tortoise", "deer"], ["forest", "pond"], [], ["walk", "run"], ["happy", "worried"]),
        ("lion_and_bull", "The Lion and the Bull", "शेर और बैल", "A lion is turned against his bull friend by a jackal.", ["lion", "bull", "jackal"], ["forest"], [], ["walk"], ["angry", "sad"]),
        ("owls_and_crows", "The War of the Crows and the Owls", "कौओं और उल्लुओं का युद्ध", "A crow feigns exile to destroy the owls.", ["crow", "owl"], ["forest", "cave"], [], ["fly"], ["thinking", "angry"]),
        ("elephant_and_sparrow", "The Elephant and the Sparrow", "हाथी और गौरैया", "Small friends bring down a proud elephant.", ["elephant", "sparrow", "frog"], ["forest", "pond"], [], ["walk"], ["angry", "happy"]),
    ],
    "jataka": [
        ("monkey_king", "The Monkey King", "वानरराज", "A monkey king makes a bridge of his body to save his troop.", ["monkey", "king"], ["forest", "river", "tree"], ["fruit"], ["climb", "jump"], ["worried", "sad"]),
        ("golden_deer", "The Golden Deer", "सोने का हिरण", "A golden deer offers its life for a doe.", ["golden deer", "deer", "king"], ["forest", "palace"], [], ["walk", "run"], ["sad", "happy"]),
        ("hare_in_the_moon", "The Hare in the Moon", "चाँद में खरगोश", "A hare gives all it has to a hungry stranger.", ["rabbit", "monkey", "fox", "sage"], ["forest"], ["food"], ["walk"], ["happy", "sad"]),
        ("banyan_deer", "The Banyan Deer", "बरगद का हिरण", "A deer king asks to be taken in place of a doe.", ["deer", "king"], ["forest", "palace"], [], ["walk"], ["sad", "surprised"]),
        ("golden_goose", "The Golden Goose", "सोने का हंस", "A swan with golden feathers is betrayed by greed.", ["swan", "farmer"], ["home", "village", "pond"], ["money"], ["fly"], ["happy", "sad"]),
    ],
    "hitopadesha": [
        ("mitralabha", "Mitralabha: The Gaining of Friends", "मित्रलाभ", "A crow, mouse, tortoise and deer form a friendship.", ["crow", "rat", "tortoise", "deer", "hunter"], ["forest", "pond"], [], ["walk", "run"], ["worried", "happy"]),
        ("tiger_and_bracelet", "The Tiger and the Traveller with the Gold Bracelet", "सोने का कंगन और बाघ", "A greedy traveller is deceived by an old tiger.", ["tiger", "brahmin"], ["forest", "pond"], ["money"], ["walk"], ["thinking", "worried"]),
        ("lion_and_hare_well", "The Lion and the Hare", "शेर और खरगोश", "A hare ends a lion's tyranny with a reflection.", ["lion", "rabbit"], ["forest", "well"], [], ["walk"], ["angry", "thinking"]),
    ],
    "vikram_betal": [
        ("vikram_betal_frame", "Vikram and Betal: the frame story", "विक्रम और बेताल", "King Vikram carries the vetala from the tree in the burning ground; it tells riddles on the way.", ["king", "vetala", "sorcerer"], ["cremation", "tree", "forest", "road"], [], ["walk", "climb"], ["worried", "thinking"]),
        ("vikram_betal_suitors", "Vikram and Betal: the three suitors", "तीन वर चाहने वाले", "A riddle about who deserves a princess.", ["king", "vetala", "princess", "brahmin"], ["village", "palace", "cremation"], [], ["walk"], ["thinking"]),
    ],
    "singhasan_battisi": [
        ("singhasan_frame", "Singhasan Battisi: the throne of Vikramaditya", "सिंहासन बत्तीसी", "King Bhoj finds a throne guarded by 32 statues who each tell a tale of Vikramaditya.", ["king", "apsara", "farmer", "minister"], ["field", "palace", "court"], [], ["walk"], ["surprised", "thinking"]),
    ],
    "akbar_birbal": [
        ("birbal_khichdi", "Birbal's Khichdi", "बीरबल की खिचड़ी", "Birbal shows the emperor that real warmth cannot come from afar.", ["emperor", "minister", "villager_man"], ["court", "pond", "palace"], ["food"], ["walk", "sit"], ["thinking", "laughing"]),
        ("how_many_crows", "How Many Crows?", "कितने कौए?", "Birbal answers a trick question with an exact-sounding reply.", ["emperor", "minister", "crow"], ["court", "palace"], [], ["sit"], ["thinking", "laughing"]),
        ("birbal_the_line", "The Longer and the Shorter Line", "लकीर छोटी करो", "Birbal makes a line shorter by drawing a longer one next to it.", ["emperor", "minister", "courtier"], ["court", "palace"], [], ["sit"], ["thinking", "surprised"]),
    ],
    "tenali_raman": [
        ("tenali_cat_and_milk", "Tenali Raman and the Cat's Milk", "तेनालीराम और बिल्ली का दूध", "Tenali proves a point about royal gifts with hot milk and a cat.", ["tenali", "king", "cat"], ["palace", "court", "home"], ["food"], ["walk"], ["thinking", "laughing"]),
        ("tenali_thieves", "Tenali Raman and the Thieves", "तेनालीराम और चोर", "Tenali turns thieves' own labour into digging his garden.", ["tenali", "thief", "minister"], ["home", "garden", "well"], [], ["walk"], ["thinking", "happy"]),
        ("tenali_brinjal", "Tenali Raman and the Brinjal Curry", "तेनालीराम और बैंगन", "A courtier's praise of brinjal is tested.", ["tenali", "king", "courtier"], ["palace", "court"], ["food"], ["sit"], ["laughing", "thinking"]),
    ],
    "aesop": [
        ("tortoise_and_hare", "The Tortoise and the Hare", "कछुआ और खरगोश", "A steady tortoise beats a boastful hare.", ["tortoise", "rabbit"], ["forest", "road"], [], ["walk", "run", "sleep"], ["happy", "surprised"]),
        ("fox_and_grapes", "The Fox and the Grapes", "लोमड़ी और अंगूर", "A fox calls grapes sour when it cannot reach them.", ["fox"], ["garden", "field"], ["fruit"], ["jump"], ["sad", "thinking"]),
        ("lion_and_mouse", "The Lion and the Mouse", "शेर और चूहा", "A mouse repays a lion's mercy.", ["lion", "mouse", "hunter"], ["forest"], [], ["walk"], ["angry", "happy"]),
        ("boy_who_cried_wolf", "The Boy Who Cried Wolf", "भेड़िया आया", "A shepherd boy's false alarms leave him unheard.", ["shepherd", "wolf", "sheep", "villager_man"], ["mountain", "village"], [], ["run"], ["worried", "sad"]),
        ("thirsty_crow", "The Thirsty Crow", "प्यासा कौआ", "A crow raises water in a pot with pebbles.", ["crow"], ["village", "desert"], [], ["fly"], ["thinking", "happy"]),
        ("ant_and_grasshopper", "The Ant and the Grasshopper", "चींटी और टिड्डा", "A summer of play leaves the grasshopper hungry in winter.", ["ant", "grasshopper"], ["field"], ["food"], ["walk"], ["sad", "happy"]),
        ("golden_eggs", "The Goose that Laid the Golden Eggs", "सोने के अंडे वाली मुर्गी", "Greed kills the source of wealth.", ["farmer", "hen"], ["home", "village"], ["money"], ["walk"], ["happy", "sad"]),
    ],
    "arabian_nights": [
        ("sindbad", "Sindbad the Sailor", "सिंदबाद", "A merchant's seven voyages.", ["sailor", "merchant", "giant"], ["port", "island"], ["money"], ["swim", "walk"], ["surprised", "worried"]),
        ("fisherman_and_jinni", "The Fisherman and the Jinni", "मछुआरा और जिन्न", "A fisherman releases a jinni from a jar.", ["fisherman", "genie"], ["river", "lake", "port"], [], ["walk"], ["surprised", "worried"]),
        ("ali_baba", "Ali Baba and the Forty Thieves", "अलीबाबा और चालीस चोर", "A woodcutter finds a robbers' treasure cave.", ["woodcutter", "thief", "merchant"], ["cave", "forest", "market"], ["money"], ["walk"], ["surprised", "happy"]),
        ("aladdin", "Aladdin and the Magic Lamp", "अलादीन", "A boy and a genie in a lamp. (A later addition to the collection.)", ["child_boy", "magician", "genie", "princess"], ["market", "palace", "cave", "desert"], [], ["walk"], ["surprised", "happy"]),
    ],
    "original": [
        ("farmer_and_rich_man", "The Farmer and the Rich Man", "किसान और सेठ", "Project-original story.", ["farmer", "rich man"], ["village", "home"], ["money"], ["walk"], ["happy", "sad"]),
    ],
}

EXCLUDED = [
    {"title": "Chacha Chaudhary (and related characters)", "reason": "Copyrighted comic franchise. Not reproduced. The library offers only original archetypes (e.g. the Scholar, Elderly Man, Villager) that carry no franchise designs."},
]
