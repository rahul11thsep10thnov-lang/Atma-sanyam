// Interactive object registry: every tappable thing in every location.
// Tile positions are inside the location footprint declared in core/locations.ts.
import type { InteractiveObject } from '../core/content';
import type { SectionKey } from '../core/worlds';
import { L } from './helpers';
import { LESSON_BY_ID } from './lessons';

type Row = [loc: string, key: string, sprite: string, section: SectionKey, en: string, hi: string, pEn: string, pHi: string, x: number, y: number, lesson?: string, activity?: InteractiveObject['activity']];

const ROWS: Row[] = [
  // villa.exterior (16×12)
  ['villa.exterior', 'front_door', 'front_door', 'nature', 'Front door', 'मुख्य द्वार', 'Dadaji: "Shoes off, hands washed, then in. Our three-step welcome."', 'दादाजी: "जूते उतारो, हाथ धोओ, फिर अंदर। हमारा तीन-कदम स्वागत।"', 8, 6],
  ['villa.exterior', 'balcony_planters', 'planter', 'nature', 'Balcony planters', 'बालकनी के गमले', 'Gauri: "Hmm, the balcony mint gets morning sun. Perfect."', 'गौरी: "हम्म, बालकनी के पुदीने को सुबह की धूप। बढ़िया।"', 10, 3, 'nature.gardening.plants.01', 'water'],
  ['villa.exterior', 'letterbox', 'letterbox', 'academic', 'Letterbox', 'डाकपेटी', 'Dadaji: "A letter! Read the address: house number, street, city, PIN code."', 'दादाजी: "चिट्ठी! पता पढ़ो: घर नंबर, गली, शहर, पिन कोड।"', 13, 9],
  ['villa.exterior', 'rain_pipe', 'rain_pipe', 'stem', 'Rainwater pipe', 'बारिश का पाइप', 'Dadaji: "Roof to pipe to tank. Rainwater harvesting."', 'दादाजी: "छत से पाइप से टंकी तक। वर्षा जल संचयन।"', 2, 7],
  // villa.veranda (8×4)
  ['villa.veranda', 'swing', 'swing', 'sports', 'Jhoola', 'झूला', 'Dadaji: "Push, let go, swing back. A pendulum, like my clock!"', 'दादाजी: "धक्का दो, छोड़ो, वापस। लोलक, मेरी घड़ी जैसा!"', 1, 1, 'sports.physical.balance.02'],
  ['villa.veranda', 'tulsi_pot', 'tulsi_pot', 'nature', 'Tulsi pot', 'तुलसी का गमला', 'Dadaji: "Tulsi by the door. It needs sunlight and water."', 'दादाजी: "दरवाज़े पर तुलसी। इसे धूप और पानी चाहिए।"', 6, 1, 'nature.gardening.plants.01', 'water'],
  ['villa.veranda', 'shoe_rack', 'shoe_rack', 'nature', 'Shoe rack', 'जूतों की रैक', 'Dadaji: "Shoes off, in pairs. Can you count the pairs?"', 'दादाजी: "जूते उतारो, जोड़ी में। जोड़ियाँ गिन सकते हो?"', 7, 3, 'academic.maths.counting.02', 'count'],
  ['villa.veranda', 'rangoli_threshold', 'rangoli', 'art', 'Threshold rangoli', 'दहलीज़ की रंगोली', 'Chikki: "A pattern at the door: dot, petal, dot, petal."', 'चिक्की: "दरवाज़े पर पैटर्न: बिंदु, पंखुड़ी, बिंदु, पंखुड़ी।"', 4, 3, 'art.pattern.rangoli.01', 'pattern'],
  ['villa.veranda', 'nameplate', 'nameplate', 'academic', 'Nameplate', 'नामपट्ट', 'Dadaji: "D-A-D-U. Four letters, one home."', 'दादाजी: "डी-ए-डी-यू। चार अक्षर, एक घर।"', 3, 0],
  ['villa.veranda', 'mitthu_perch', 'perch', 'music', "Mitthu's perch", 'मिट्ठू का अड्डा', 'Mitthu: "Say it again! Say it again!"', 'मिट्ठू: "फिर कहो! फिर कहो!"', 0, 0],
  // villa.living (10×8)
  ['villa.living', 'telescope', 'telescope', 'explore', 'Telescope', 'दूरबीन', 'Dadaji: "This makes far-away things look big."', 'दादाजी: "यह दूर की चीज़ों को बड़ा दिखाती है।"', 8, 1, 'explore.astronomy.telescope.01'],
  ['villa.living', 'globe', 'globe', 'academic', 'Globe', 'ग्लोब', 'Dadaji: "Blue is water, green is land. Where is India?"', 'दादाजी: "नीला पानी, हरा ज़मीन। भारत कहाँ है?"', 2, 2, 'academic.social.geography.01'],
  ['villa.living', 'bookshelf', 'bookshelf', 'academic', 'Bookshelf', 'किताबों की अलमारी', 'Dadaji: "Pick a book, beta. Every book is a door."', 'दादाजी: "किताब चुनो, बेटा। हर किताब एक दरवाज़ा है।"', 0, 3, 'academic.english.reading.01'],
  ['villa.living', 'tv_wall', 'tv_wall', 'stem', 'TV wall', 'टीवी दीवार', 'Dadaji: "Screens show pictures made of tiny dots called pixels."', 'दादाजी: "स्क्रीन पिक्सेल नाम के छोटे बिंदुओं से चित्र दिखाती है।"', 5, 0, 'stem.computers.pixels.01'],
  ['villa.living', 'clock', 'clock', 'academic', 'Wall clock', 'दीवार घड़ी', 'Dadaji: "Small hand slow, big hand fast. What time is it?"', 'दादाजी: "छोटी सुई धीमी, बड़ी सुई तेज़। समय क्या हुआ?"', 3, 0, 'academic.maths.time.01'],
  ['villa.living', 'sofa', 'sofa', 'mind', 'Sofa', 'सोफ़ा', 'Buddy: "Woof! The best place for a story and a cuddle."', 'बडी: "भौं! कहानी और गले लगने की सबसे अच्छी जगह।"', 4, 5],
  ['villa.living', 'carrom', 'carrom', 'mind', 'Carrom board', 'कैरम बोर्ड', 'Chikki: "Angles! Hit the striker here and the coin goes there."', 'चिक्की: "कोण! स्ट्राइकर यहाँ मारो, गोटी वहाँ जाएगी।"', 8, 6, 'mind.logic.angles.01'],
  ['villa.living', 'diya_shelf', 'diya', 'explore', 'Diya shelf', 'दीयों की अलमारी', 'Dadaji: "Which festival do we light these for?"', 'दादाजी: "ये दीये किस त्योहार पर जलाते हैं?"', 1, 0, 'explore.culture.festivals.01'],
  ['villa.living', 'radio', 'radio', 'stem', 'Radio', 'रेडियो', 'Dadaji: "No wires. Sound travels in invisible waves."', 'दादाजी: "तार नहीं। आवाज़ अदृश्य तरंगों में चलती है।"', 7, 3, 'stem.physics.sound.01'],
  // villa.kitchen (8×6)
  ['villa.kitchen', 'kitchen_island', 'kitchen_island', 'nature', 'Kitchen island', 'रसोई का काउंटर', 'Dadaji: "Today we make poha. Wash, measure, cook."', 'दादाजी: "आज पोहा बनाते हैं। धोओ, नापो, पकाओ।"', 3, 3, 'nature.cooking.poha.01', 'cook'],
  ['villa.kitchen', 'fridge', 'fridge', 'nature', 'Fridge', 'फ्रिज', 'Dadaji: "Cold keeps food fresh. Which shelf for milk?"', 'दादाजी: "ठंडक खाना ताज़ा रखती है। दूध किस शेल्फ़ पर?"', 0, 1, 'nature.nutrition.foodgroups.01', 'sort'],
  ['villa.kitchen', 'measuring_cups', 'measuring_cups', 'academic', 'Measuring cups', 'नापने के कप', 'Chikki: "Half a cup plus half a cup makes one whole cup!"', 'चिक्की: "आधा कप और आधा कप, एक पूरा कप!"', 5, 2, 'academic.maths.fractions.01'],
  ['villa.kitchen', 'spice_box', 'spice_box', 'explore', 'Masala dabba', 'मसाला डब्बा', 'Dadaji: "Haldi, jeera, dhania. Smell, do not taste yet."', 'दादाजी: "हल्दी, जीरा, धनिया। सूँघो, अभी चखो मत।"', 6, 1, 'explore.culture.spices.01'],
  ['villa.kitchen', 'sink', 'sink', 'nature', 'Sink', 'सिंक', 'Dadaji: "Close the tap while you scrub. Save every drop."', 'दादाजी: "रगड़ते समय नल बंद। हर बूँद बचाओ।"', 1, 4, 'nature.environment.water.01', 'clean'],
  ['villa.kitchen', 'stove', 'stove', 'stem', 'Stove', 'चूल्हा', 'Dadaji: "Heat changes things: water to steam, batter to dosa."', 'दादाजी: "गर्मी चीज़ें बदलती है: पानी से भाप, घोल से डोसा।"', 7, 3],
  // villa.dining (7×6)
  ['villa.dining', 'dining_table', 'dining_table', 'nature', 'Dining table', 'खाने की मेज़', 'Dadaji: "Set the table: plate, spoon, glass for each of us."', 'दादाजी: "मेज़ सजाओ: हर एक के लिए थाली, चम्मच, गिलास।"', 3, 3, 'nature.lifeskills.tablesetting.01', 'sequence'],
  ['villa.dining', 'fruit_bowl', 'fruit_bowl', 'academic', 'Fruit bowl', 'फलों की टोकरी', 'Chikki: "Three bananas, two apples. How many fruits?"', 'चिक्की: "तीन केले, दो सेब। कुल कितने फल?"', 3, 2, 'academic.maths.addition.01', 'count'],
  ['villa.dining', 'water_jug', 'water_jug', 'nature', 'Water jug', 'पानी का जग', 'Dadaji: "Eight glasses a day keeps you bright."', 'दादाजी: "दिन में आठ गिलास, रहो हमेशा ख़ास।"', 5, 2],
  ['villa.dining', 'thali', 'thali', 'nature', 'Thali', 'थाली', 'Gauri: "Dal, roti, sabzi, salad. A rainbow on one plate."', 'गौरी: "दाल, रोटी, सब्ज़ी, सलाद। एक थाली में इंद्रधनुष।"', 2, 3, 'nature.nutrition.thali.01', 'sort'],
  // villa.bedroom_dadaji (7×6)
  ['villa.bedroom_dadaji', 'bed_dadaji', 'bed', 'nature', "Dadaji's bed", 'दादाजी का बिस्तर', 'Dadaji: "Early to bed, early to rise."', 'दादाजी: "जल्दी सोना, जल्दी उठना।"', 1, 2],
  ['villa.bedroom_dadaji', 'photo_frame', 'photo_frame', 'mind', 'Family photos', 'परिवार की तस्वीरें', 'Dadaji: "This is your dadi, this is your papa as a baby."', 'दादाजी: "यह तुम्हारी दादी, यह तुम्हारे पापा बचपन में।"', 4, 0, 'mind.social.family.01'],
  ['villa.bedroom_dadaji', 'reading_chair', 'armchair', 'academic', 'Reading chair', 'पढ़ने की कुर्सी', 'Dadaji: "My chair, my book, my chai."', 'दादाजी: "मेरी कुर्सी, मेरी किताब, मेरी चाय।"', 5, 4],
  ['villa.bedroom_dadaji', 'alarm_clock', 'alarm_clock', 'academic', 'Alarm clock', 'अलार्म घड़ी', 'Dadaji: "Six o\'clock: the alarm and the sparrows."', 'दादाजी: "छह बजे: अलार्म और गौरैया।"', 0, 1, 'academic.maths.time.01'],
  // villa.bedroom_chintu (7×6)
  ['villa.bedroom_chintu', 'bed_chintu', 'bed_kid', 'mind', "Chintu's bed", 'चिंटू का बिस्तर', 'Dadaji: "Bedtime story? Which one tonight?"', 'दादाजी: "सोने की कहानी? आज कौन-सी?"', 1, 2, 'storyland.panchatantra.monkey.01'],
  ['villa.bedroom_chintu', 'toy_box', 'toy_box', 'nature', 'Toy box', 'खिलौनों का डिब्बा', 'Dadaji: "Toys back in the box: cars here, blocks there."', 'दादाजी: "खिलौने डिब्बे में: गाड़ियाँ यहाँ, ब्लॉक वहाँ।"', 5, 4, 'nature.lifeskills.tidy.01', 'sort'],
  ['villa.bedroom_chintu', 'star_lamp', 'star_lamp', 'explore', 'Star lamp', 'तारों वाला लैंप', 'Dadaji: "Little stars on the ceiling. Which one is the Pole Star?"', 'दादाजी: "छत पर छोटे तारे। ध्रुव तारा कौन-सा?"', 3, 0, 'explore.astronomy.stars.01'],
  ['villa.bedroom_chintu', 'study_corner', 'desk_small', 'academic', 'Study corner', 'पढ़ाई का कोना', 'Chikki: "Homework first, then play. That is the deal!"', 'चिक्की: "पहले होमवर्क, फिर खेल। यही समझौता!"', 6, 1],
  ['villa.bedroom_chintu', 'wardrobe', 'wardrobe', 'nature', 'Wardrobe', 'अलमारी', 'Dadaji: "Fold, stack, close. Clothes last longer when cared for."', 'दादाजी: "मोड़ो, रखो, बंद करो। देखभाल से कपड़े लंबे चलते हैं।"', 0, 4, undefined, 'sequence'],
  // villa.study (7×6)
  ['villa.study', 'desk', 'desk', 'academic', 'Desk', 'मेज़', 'Dadaji: "Sit straight, pencil ready. Let us write."', 'दादाजी: "सीधे बैठो, पेंसिल तैयार। चलो लिखें।"', 3, 3, 'academic.hindi.letters.01', 'trace'],
  ['villa.study', 'abacus', 'abacus', 'academic', 'Abacus', 'गिनतारा', 'Chikki: "Slide the beads: ten on each wire."', 'चिक्की: "मोती सरकाओ: हर तार पर दस।"', 1, 1, 'academic.maths.place_value.01'],
  ['villa.study', 'laptop', 'laptop', 'stem', 'Laptop', 'लैपटॉप', 'Dadaji: "Keyboard, screen, mouse. Hardware you can touch."', 'दादाजी: "कीबोर्ड, स्क्रीन, माउस। हार्डवेयर जिसे छू सकते हो।"', 4, 2, 'stem.computers.hardware.01'],
  ['villa.study', 'map_india', 'map_india', 'academic', 'Map of India', 'भारत का नक्शा', 'Dadaji: "Twenty-eight states. Find ours."', 'दादाजी: "अट्ठाईस राज्य। अपना ढूँढो।"', 2, 0, 'academic.social.states.01'],
  ['villa.study', 'dictionary', 'dictionary', 'academic', 'Dictionary', 'शब्दकोश', 'Dadaji: "A new word every day. Today: curious."', 'दादाजी: "रोज़ एक नया शब्द। आज: जिज्ञासु।"', 6, 1, 'academic.english.vocabulary.01'],
  ['villa.study', 'piggy_bank', 'piggy_bank', 'nature', 'Piggy bank', 'गुल्लक', 'Dadaji: "Save a coin, plan a wish."', 'दादाजी: "एक सिक्का बचाओ, एक इच्छा सँजोओ।"', 6, 4, 'nature.lifeskills.money.01', 'count'],
  // villa.activity (10×8)
  ['villa.activity', 'easel', 'easel', 'art', 'Easel', 'ईज़ल', 'Dadaji: "Draw the tree the way you see it."', 'दादाजी: "पेड़ वैसा बनाओ जैसा तुम देखते हो।"', 1, 2, 'art.drawing.tree.01', 'draw'],
  ['villa.activity', 'paint_pots', 'paint_pots', 'art', 'Paint pots', 'रंग के डिब्बे', 'Dadaji: "Blue and yellow... what will they make?"', 'दादाजी: "नीला और पीला... क्या बनेगा?"', 2, 4, 'art.painting.colours.01', 'mix-colours'],
  ['villa.activity', 'harmonium', 'harmonium', 'music', 'Harmonium', 'हारमोनियम', 'Mitthu: "Sa Re Ga Ma! Sa Re Ga Ma!"', 'मिट्ठू: "सा रे गा मा! सा रे गा मा!"', 7, 1, 'music.hindustani.swaras.01', 'play-notes'],
  ['villa.activity', 'tabla', 'tabla', 'music', 'Tabla', 'तबला', 'Dadaji: "Dha dhin dhin dha. Count with me."', 'दादाजी: "धा धिन धिन धा। मेरे साथ गिनो।"', 8, 4, 'music.taal.teentaal.01', 'rhythm'],
  ['villa.activity', 'lab_bench', 'lab_bench', 'stem', 'Science bench', 'विज्ञान की मेज़', 'Buddy: "Woof! Which experiment today?"', 'बडी: "भौं! आज कौन-सा प्रयोग?"', 5, 0],
  ['villa.activity', 'magnet', 'magnet', 'stem', 'Magnet', 'चुंबक', 'Dadaji: "It pulls some things like magic. Not magic: science!"', 'दादाजी: "कुछ चीज़ों को जादू की तरह खींचता है। जादू नहीं: विज्ञान!"', 4, 0, 'stem.physics.magnet.01', 'sort'],
  ['villa.activity', 'circuit_kit', 'circuit_kit', 'stem', 'Circuit kit', 'परिपथ किट', 'Dadaji: "Close the loop and the bulb lights."', 'दादाजी: "घेरा पूरा करो तो बल्ब जलेगा।"', 6, 0, 'stem.electronics.circuit.01', 'circuit'],
  ['villa.activity', 'robot_mat', 'robot_mat', 'stem', 'Coding mat', 'कोडिंग मैट', 'Dadaji: "Tell Buddy where to go with blocks: move, turn, repeat."', 'दादाजी: "ब्लॉक से बडी को रास्ता बताओ: चलो, मुड़ो, दोहराओ।"', 3, 6, 'stem.coding.blocks.01', 'code-blocks'],
  ['villa.activity', 'clay_table', 'clay_table', 'art', 'Clay table', 'मिट्टी की मेज़', 'Dadaji: "Wet clay, slow hands. Let us make a diya."', 'दादाजी: "गीली मिट्टी, धीमे हाथ। चलो दीया बनाएँ।"', 0, 6, 'art.craft.clay.01', 'sequence'],
  ['villa.activity', 'origami_tray', 'origami_tray', 'art', 'Origami tray', 'ओरिगामी ट्रे', 'Chikki: "One square, eight folds, one crane."', 'चिक्की: "एक वर्ग, आठ तह, एक सारस।"', 1, 0, 'art.craft.origami.01', 'sequence'],
  ['villa.activity', 'memory_cards', 'memory_cards', 'mind', 'Memory cards', 'याद के कार्ड', 'Chikki: "Find the two mangoes. Remember where they hide!"', 'चिक्की: "दो आम ढूँढो। याद रखो कहाँ छिपे हैं!"', 8, 6, 'mind.memory.pairs.01', 'memory'],
  ['villa.activity', 'chess', 'chess', 'mind', 'Chess board', 'शतरंज', 'Dadaji: "The knight jumps in an L. Try it."', 'दादाजी: "घोड़ा L में कूदता है। आज़माओ।"', 6, 6, 'mind.logic.chess.01'],
  ['villa.activity', 'ghungroo', 'ghungroo', 'music', 'Ghungroo', 'घुँघरू', 'Dadaji: "Kathak begins with the feet. Ta thei thei tat."', 'दादाजी: "कथक पैरों से शुरू। ता थेई थेई तत।"', 9, 2, 'music.dance.kathak.01', 'rhythm'],
  ['villa.activity', 'flute', 'flute', 'music', 'Flute', 'बाँसुरी', 'Mitthu: "Phoo! Cover a hole, the note changes!"', 'मिट्ठू: "फू! छेद बंद करो, सुर बदल गया!"', 9, 0, 'music.instruments.flute.01', 'play-notes'],
  // villa.bathroom (5×4)
  ['villa.bathroom', 'wash_basin', 'wash_basin', 'nature', 'Wash basin', 'वॉश बेसिन', 'Dadaji: "Twenty seconds of soap. Sing the Sa Re Ga song!"', 'दादाजी: "बीस सेकंड साबुन। सा रे गा गाओ!"', 1, 1, 'nature.hygiene.handwash.01', 'sequence'],
  ['villa.bathroom', 'toothbrush', 'toothbrush', 'nature', 'Toothbrush', 'टूथब्रश', 'Dadaji: "Up and down, round and round, morning and night."', 'दादाजी: "ऊपर-नीचे, गोल-गोल, सुबह और रात।"', 3, 1, 'nature.hygiene.teeth.01', 'sequence'],
  ['villa.bathroom', 'bucket', 'bucket', 'nature', 'Bucket', 'बाल्टी', 'Dadaji: "A bucket bath uses less water than a shower."', 'दादाजी: "बाल्टी से नहाने में शॉवर से कम पानी लगता है।"', 0, 3, 'nature.environment.water.01'],
  // villa.terrace (10×8)
  ['villa.terrace', 'kite', 'kite', 'sports', 'Kite', 'पतंग', 'Chintu: "Wind! Let us fly it!"', 'चिंटू: "हवा! चलो उड़ाएँ!"', 7, 2, 'stem.physics.wind.01'],
  ['villa.terrace', 'yoga_mat', 'yoga_mat', 'sports', 'Yoga mat', 'योग मैट', 'Dadaji: "Breathe in, stretch up. Tadasana, the mountain."', 'दादाजी: "साँस लो, ऊपर खिंचो। ताड़ासन, पहाड़।"', 2, 5, 'sports.yoga.tadasana.01', 'sequence'],
  ['villa.terrace', 'water_tank', 'water_tank', 'nature', 'Water tank', 'पानी की टंकी', 'Dadaji: "Rain fills it in monsoon. We must not waste it in summer."', 'दादाजी: "मानसून में बारिश भरती है। गर्मी में बर्बाद नहीं करना।"', 9, 0, 'nature.environment.water.01'],
  ['villa.terrace', 'solar_panel', 'solar_panel', 'stem', 'Solar panel', 'सौर पैनल', 'Dadaji: "Sunlight in, electricity out."', 'दादाजी: "धूप अंदर, बिजली बाहर।"', 0, 0, 'stem.energy.solar.01'],
  ['villa.terrace', 'pergola_plants', 'planter', 'nature', 'Pergola planters', 'पेर्गोला के गमले', 'Gauri: "Hmm, the money plant climbs. The mint spreads."', 'गौरी: "हम्म, मनीप्लांट चढ़ता है। पुदीना फैलता है।"', 5, 0, 'nature.gardening.plants.01', 'water'],
  ['villa.terrace', 'night_sky', 'sky_spot', 'explore', 'Night-sky spot', 'तारे देखने की जगह', 'Dadaji: "Lie back. Count the stars until you cannot."', 'दादाजी: "लेट जाओ। तारे गिनो जब तक गिन सको।"', 5, 4, 'explore.astronomy.stars.01'],
  // villa.driveway (8×10)
  ['villa.driveway', 'cycle', 'cycle', 'sports', 'Bicycle', 'साइकिल', 'Buddy: "Helmet on! Pedal, balance, look ahead."', 'बडी: "हेलमेट पहनो! पैडल, संतुलन, आगे देखो।"', 2, 7, 'sports.physical.balance.01', 'balance'],
  ['villa.driveway', 'stumps', 'stumps', 'sports', 'Cricket stumps', 'विकेट', 'Buddy: "Woof! Bat, ball, wickets. Keep your eye on the ball."', 'बडी: "भौं! बल्ला, गेंद, विकेट। गेंद पर नज़र।"', 5, 2, 'sports.cricket.batting.01'],
  ['villa.driveway', 'football', 'football', 'sports', 'Football', 'फ़ुटबॉल', 'Buddy: "Kick with the side of your foot, not the toe."', 'बडी: "पैर की साइड से मारो, अँगूठे से नहीं।"', 1, 3, 'sports.football.passing.01'],
  ['villa.driveway', 'hopscotch', 'hopscotch', 'academic', 'Hopscotch', 'स्टापू', 'Chikki: "One, two, three... hop and count!"', 'चिक्की: "एक, दो, तीन... कूदो और गिनो!"', 6, 7, 'academic.maths.counting.01'],
  ['villa.driveway', 'gate', 'gate', 'nature', 'Front gate', 'मुख्य दरवाज़ा', 'Dadaji: "Look right, look left, look right again. Then cross."', 'दादाजी: "दाएँ देखो, बाएँ देखो, फिर दाएँ। तब पार करो।"', 4, 9, 'nature.safety.road.01', 'sequence'],
  // garden.flowers (10×8)
  ['garden.flowers', 'flower_bed', 'flower_bed', 'nature', 'Flower bed', 'फूलों की क्यारी', 'Dadaji: "Marigold, rose, hibiscus. Name the colours."', 'दादाजी: "गेंदा, गुलाब, गुड़हल। रंग बताओ।"', 3, 3, 'nature.gardening.flowers.01', 'plant'],
  ['garden.flowers', 'watering_can', 'watering_can', 'nature', 'Watering can', 'झारी', 'Gauri: "Morning water goes to the roots, not the leaves."', 'गौरी: "सुबह का पानी जड़ों को, पत्तों को नहीं।"', 1, 6, undefined, 'water'],
  ['garden.flowers', 'bee_box', 'bee_box', 'nature', 'Bee box', 'मधुमक्खी का बक्सा', 'Dadaji: "Bees carry pollen from flower to flower. No bees, no mangoes."', 'दादाजी: "मधुमक्खियाँ फूल से फूल तक पराग ले जाती हैं। मधुमक्खी नहीं तो आम नहीं।"', 8, 1, 'nature.biology.pollination.01'],
  ['garden.flowers', 'bird_feeder', 'bird_feeder', 'nature', 'Bird feeder', 'दाना-घर', 'Dadaji: "Sparrow, bulbul, sunbird. Can you tell them by their song?"', 'दादाजी: "गौरैया, बुलबुल, शकरखोरा। आवाज़ से पहचानोगे?"', 6, 0, 'nature.birds.identify.01'],
  ['garden.flowers', 'sundial', 'sundial', 'explore', 'Sundial', 'धूपघड़ी', 'Dadaji: "No battery. The Sun tells the time with a shadow."', 'दादाजी: "बैटरी नहीं। सूरज परछाई से समय बताता है।"', 7, 6, 'stem.physics.shadows.01'],
  // garden.vegetables (10×8)
  ['garden.vegetables', 'veg_bed', 'veg_bed', 'nature', 'Vegetable bed', 'सब्ज़ी की क्यारी', 'Gauri: "Tomato, brinjal, spinach. Red, purple, green."', 'गौरी: "टमाटर, बैंगन, पालक। लाल, बैंगनी, हरा।"', 3, 3, 'nature.gardening.vegetables.01', 'plant'],
  ['garden.vegetables', 'tulsi', 'tulsi_chaura', 'nature', 'Tulsi', 'तुलसी', 'Dadaji: "Beta, look at this beautiful tulsi. It needs sunlight and water."', 'दादाजी: "बेटा, इस सुंदर तुलसी को देखो। इसे धूप और पानी चाहिए।"', 7, 1, 'nature.gardening.plants.01', 'water'],
  ['garden.vegetables', 'scale', 'weighing_scale', 'academic', 'Weighing scale', 'तराज़ू', 'Chikki: "Three tomatoes weigh as much as one brinjal!"', 'चिक्की: "तीन टमाटर एक बैंगन के बराबर!"', 8, 6, 'academic.maths.measurement.01'],
  ['garden.vegetables', 'scarecrow', 'scarecrow', 'nature', 'Scarecrow', 'बिजूका', 'Chintu: "He never blinks! Is he real?"', 'चिंटू: "यह पलक नहीं झपकाता! क्या यह असली है?"', 1, 1],
  ['garden.vegetables', 'harvest_basket', 'basket', 'nature', 'Harvest basket', 'फ़सल की टोकरी', 'Dadaji: "Only the red ones. Green ones need more sun."', 'दादाजी: "सिर्फ़ लाल वाले। हरे को और धूप चाहिए।"', 1, 6, 'nature.gardening.vegetables.01', 'harvest'],
  // garden.fruit (10×8)
  ['garden.fruit', 'mango_tree', 'mango_tree', 'academic', 'Mango tree', 'आम का पेड़', 'Dadaji: "Count the mangoes. Which ones are ripe? Look at the colour."', 'दादाजी: "आम गिनो। कौन-से पके? रंग देखो।"', 2, 2, 'academic.maths.counting.01', 'count'],
  ['garden.fruit', 'guava_tree', 'guava_tree', 'nature', 'Guava tree', 'अमरूद का पेड़', 'Gauri: "Leaves, trunk, branches, roots. Every tree has them."', 'गौरी: "पत्ते, तना, डालियाँ, जड़ें। हर पेड़ में होते हैं।"', 7, 2, 'nature.biology.plant_parts.01'],
  ['garden.fruit', 'banana_plant', 'banana_plant', 'nature', 'Banana plant', 'केले का पेड़', 'Dadaji: "Not a tree! A banana is a giant herb."', 'दादाजी: "पेड़ नहीं! केला एक विशाल जड़ी-बूटी है।"', 5, 6],
  ['garden.fruit', 'ladder', 'ladder', 'nature', 'Ladder', 'सीढ़ी', 'Dadaji: "Only with an adult holding it. Safety first."', 'दादाजी: "सिर्फ़ किसी बड़े के पकड़ने पर। सुरक्षा पहले।"', 4, 3, 'nature.safety.home.01'],
  // garden.butterfly (6×6)
  ['garden.butterfly', 'butterfly_bush', 'butterfly_bush', 'nature', 'Butterfly bush', 'तितली झाड़ी', 'Dadaji: "Sit still. The butterfly comes to the flower, not your hand."', 'दादाजी: "चुप बैठो। तितली फूल पर आएगी, हाथ पर नहीं।"', 2, 2, 'nature.biology.lifecycle.01', 'sequence'],
  ['garden.butterfly', 'caterpillar_leaf', 'leaf_caterpillar', 'nature', 'Caterpillar on a leaf', 'पत्ते पर इल्ली', 'Chintu: "Eww! It is eating the whole leaf!"', 'चिंटू: "छी! यह पूरा पत्ता खा रही है!"', 4, 4, 'nature.biology.lifecycle.01'],
  ['garden.butterfly', 'magnifier', 'magnifier', 'stem', 'Magnifying glass', 'आवर्धक काँच', 'Dadaji: "Closer, closer. Count the legs."', 'दादाजी: "पास, और पास। पैर गिनो।"', 1, 4, 'stem.biology.insects.01', 'count'],
  // garden.greenhouse (8×6)
  ['garden.greenhouse', 'seed_trays', 'seed_trays', 'nature', 'Seed trays', 'बीज ट्रे', 'Dadaji: "Seed, sprout, seedling. Patience, beta."', 'दादाजी: "बीज, अंकुर, पौध। धीरज, बेटा।"', 2, 2, 'nature.gardening.seeds.01', 'sequence'],
  ['garden.greenhouse', 'thermometer', 'thermometer', 'stem', 'Thermometer', 'तापमापी', 'Chikki: "Thirty degrees inside, twenty outside. Glass traps heat."', 'चिक्की: "अंदर तीस डिग्री, बाहर बीस। काँच गर्मी रोकता है।"', 6, 1, 'stem.physics.heat.01'],
  ['garden.greenhouse', 'misting_bottle', 'spray_bottle', 'nature', 'Spray bottle', 'स्प्रे बोतल', 'Dadaji: "A fine mist for the little ones."', 'दादाजी: "नन्हे पौधों के लिए हल्की फुहार।"', 5, 4, undefined, 'water'],
  // garden.pond (8×6)
  ['garden.pond', 'pond', 'pond', 'nature', 'Pond', 'तालाब', 'Buddy: "Woof! A frog! Egg, tadpole, frog. Three lives in one pond."', 'बडी: "भौं! मेंढक! अंडा, टैडपोल, मेंढक। एक तालाब में तीन जीवन।"', 3, 2, 'nature.biology.frog.01', 'sequence'],
  ['garden.pond', 'lotus', 'lotus', 'explore', 'Lotus', 'कमल', 'Dadaji: "Our national flower. Clean petals in muddy water."', 'दादाजी: "हमारा राष्ट्रीय फूल। कीचड़ में साफ़ पंखुड़ियाँ।"', 5, 1, 'explore.india.symbols.01'],
  ['garden.pond', 'fish', 'fish', 'nature', 'Fish', 'मछली', 'Chintu: "They breathe water?!"', 'चिंटू: "ये पानी में साँस लेती हैं?!"', 2, 3, 'nature.biology.fish.01'],
  // garden.fountain (6×6)
  ['garden.fountain', 'fountain', 'fountain', 'stem', 'Fountain', 'फव्वारा', 'Dadaji: "A pump pushes water up; gravity brings it down."', 'दादाजी: "पंप पानी ऊपर धकेलता है; गुरुत्व नीचे लाता है।"', 3, 2, 'stem.physics.gravity.01'],
  ['garden.fountain', 'bench', 'bench', 'mind', 'Garden bench', 'बगीचे की बेंच', 'Dadaji: "Sit with me. Tell me one happy thing and one worry."', 'दादाजी: "मेरे साथ बैठो। एक खुशी और एक चिंता बताओ।"', 1, 4, 'mind.emotion.feelings.01'],
  // garden.workshop (6×5)
  ['garden.workshop', 'tool_rack', 'tool_rack', 'nature', 'Tool rack', 'औज़ार रैक', 'Dadaji: "Trowel, rake, gloves. Each tool back on its hook."', 'दादाजी: "खुरपी, रेक, दस्ताने। हर औज़ार अपने हुक पर।"', 1, 1, 'nature.gardening.tools.01', 'sort'],
  ['garden.workshop', 'seed_jars', 'seed_jars', 'academic', 'Seed jars', 'बीज के डिब्बे', 'Chikki: "Big seeds, small seeds. Sort them by size."', 'चिक्की: "बड़े बीज, छोटे बीज। आकार से बाँटो।"', 4, 1, 'academic.maths.sorting.01', 'sort'],
  ['garden.workshop', 'workbench', 'workbench', 'stem', 'Workbench', 'कार्य-मेज़', 'Dadaji: "A paper bridge that holds a toy car. Engineering!"', 'दादाजी: "कागज़ का पुल जो खिलौना गाड़ी सँभाले। इंजीनियरिंग!"', 3, 3, 'stem.engineering.bridge.01'],
  // garden.compost (5×5)
  ['garden.compost', 'compost_bin', 'compost', 'nature', 'Compost bin', 'खाद का डिब्बा', 'Dadaji: "Peels go in, soil comes out. Nothing is waste."', 'दादाजी: "छिलके अंदर, मिट्टी बाहर। कुछ बेकार नहीं।"', 2, 2, 'nature.environment.compost.01', 'sort'],
  ['garden.compost', 'bins_three', 'bins_three', 'nature', 'Three bins', 'तीन डिब्बे', 'Dadaji: "Green for wet, blue for dry, red for the rest."', 'दादाजी: "हरा गीले के लिए, नीला सूखे, लाल बाकी।"', 0, 3, 'nature.environment.waste.01', 'sort'],
  // animalia.dog (6×6)
  ['animalia.dog', 'dog_house', 'dog_house', 'nature', 'Dog house', 'कुत्ते का घर', 'Buddy: "My house! Come in, there is room."', 'बडी: "मेरा घर! आओ, जगह है।"', 1, 1],
  ['animalia.dog', 'food_bowl', 'food_bowl', 'nature', "Buddy's bowl", 'बडी का कटोरा', 'Dadaji: "Two scoops, twice a day. Not our sweets."', 'दादाजी: "दो स्कूप, दिन में दो बार। हमारी मिठाई नहीं।"', 3, 4, 'nature.animalcare.feeding.01', 'feed'],
  ['animalia.dog', 'water_bowl', 'water_bowl', 'nature', 'Water bowl', 'पानी का कटोरा', 'Buddy: "Fresh water, please! Woof!"', 'बडी: "ताज़ा पानी, प्लीज़! भौं!"', 4, 4, 'nature.animalcare.feeding.01', 'feed'],
  ['animalia.dog', 'brush', 'brush', 'nature', 'Grooming brush', 'ब्रश', 'Dadaji: "Brush with the fur, never against it."', 'दादाजी: "बालों की दिशा में ब्रश करो, उल्टा नहीं।"', 5, 2, 'nature.animalcare.grooming.01', 'groom'],
  ['animalia.dog', 'ball', 'ball', 'sports', 'Ball', 'गेंद', 'Buddy: "Throw it! Throw it! I will bring it back!"', 'बडी: "फेंको! फेंको! मैं वापस लाऊँगा!"', 2, 5, 'sports.physical.throw.01'],
  // animalia.rabbit (6×6)
  ['animalia.rabbit', 'rabbit_hutch', 'rabbit_hutch', 'nature', "Chikki's hutch", 'चिक्की का घर', 'Chikki: "Clean straw, a quiet corner. Perfect."', 'चिक्की: "साफ़ पुआल, शांत कोना। बढ़िया।"', 1, 1, 'nature.animalcare.cleaning.01', 'clean'],
  ['animalia.rabbit', 'carrot_patch', 'carrot_patch', 'nature', 'Carrot patch', 'गाजर की क्यारी', 'Chikki: "Carrots are my favourite... after everything else!"', 'चिक्की: "गाजर मेरी पसंदीदा... बाकी सब के बाद!"', 4, 4, 'nature.animalcare.feeding.01', 'feed'],
  ['animalia.rabbit', 'hay_pile', 'hay_pile', 'nature', 'Hay', 'घास', 'Dadaji: "Rabbits need hay all day for their teeth."', 'दादाजी: "खरगोश को दाँतों के लिए दिन भर घास चाहिए।"', 4, 1],
  ['animalia.rabbit', 'tunnel', 'tunnel', 'mind', 'Play tunnel', 'खेल की सुरंग', 'Chikki: "In one end, out the other. A maze for one!"', 'चिक्की: "एक छोर से अंदर, दूसरे से बाहर। एक की भूलभुलैया!"', 2, 4, 'mind.logic.maze.01', 'maze'],
  // animalia.cowshed (10×8)
  ['animalia.cowshed', 'cow_shed', 'cow_shed', 'nature', 'Cow shelter', 'गौशाला', 'Gauri: "Hmmm. Shade in summer, warmth in winter."', 'गौरी: "हम्म। गर्मी में छाँव, सर्दी में गर्माहट।"', 4, 1],
  ['animalia.cowshed', 'fodder_trough', 'fodder_trough', 'nature', 'Fodder trough', 'चारे की नाँद', 'Dadaji: "Green fodder in the morning, dry in the evening."', 'दादाजी: "सुबह हरा चारा, शाम सूखा।"', 2, 4, 'nature.animalcare.feeding.01', 'feed'],
  ['animalia.cowshed', 'water_trough', 'water_trough', 'nature', 'Water trough', 'पानी की नाँद', 'Gauri: "A cow drinks as much as a bathtub a day."', 'गौरी: "गाय दिन में एक बाथटब जितना पानी पीती है।"', 7, 4, 'nature.animalcare.feeding.01', 'feed'],
  ['animalia.cowshed', 'milk_pail', 'milk_pail', 'nature', 'Milk pail', 'दूध की बाल्टी', 'Dadaji: "Milk, curd, ghee, paneer. All from Gauri."', 'दादाजी: "दूध, दही, घी, पनीर। सब गौरी से।"', 8, 6, 'nature.nutrition.dairy.01', 'sequence'],
  ['animalia.cowshed', 'cow_brush', 'brush_big', 'nature', 'Cow brush', 'गाय का ब्रश', 'Gauri: "Hmmm, that spot behind the ear."', 'गौरी: "हम्म, कान के पीछे वाली जगह।"', 1, 6, 'nature.animalcare.grooming.01', 'groom'],
  ['animalia.cowshed', 'dung_cakes', 'dung_cakes', 'nature', 'Dung cakes', 'उपले', 'Dadaji: "Fuel and fertiliser. Villages waste nothing."', 'दादाजी: "ईंधन और खाद। गाँव कुछ बर्बाद नहीं करते।"', 9, 1, 'nature.environment.compost.01'],
  // animalia.calf (8×6)
  ['animalia.calf', 'calf_bell', 'bell_small', 'music', "Nandu's bell", 'नंदू की घंटी', 'Nandu: "Maa! Ting ting! That is me coming!"', 'नंदू: "माँ! टिंग टिंग! वह मैं आ रहा हूँ!"', 2, 1, 'stem.physics.sound.01'],
  ['animalia.calf', 'salt_lick', 'salt_lick', 'nature', 'Salt lick', 'नमक की सिल', 'Gauri: "Minerals for strong bones, little one."', 'गौरी: "मज़बूत हड्डियों के लिए खनिज, बेटा।"', 6, 2, 'nature.nutrition.minerals.01'],
  ['animalia.calf', 'play_ball_big', 'ball_big', 'sports', 'Big ball', 'बड़ी गेंद', 'Nandu: "Head-butt! Maa, watch me!"', 'नंदू: "सिर से मारो! माँ, मुझे देखो!"', 4, 4, 'sports.physical.throw.01'],
  // animalia.wild (8×6)
  ['animalia.wild', 'binoculars', 'binoculars', 'nature', 'Binoculars', 'दूरबीन', 'Dadaji: "Shh. A kingfisher on the far branch."', 'दादाजी: "श्श। दूर की डाल पर किलकिला।"', 2, 4, 'nature.birds.identify.01'],
  ['animalia.wild', 'footprint_board', 'footprints', 'explore', 'Footprint board', 'पदचिह्न बोर्ड', 'Buddy: "Big paw, small paw. Who walked here?"', 'बडी: "बड़ा पंजा, छोटा पंजा। यहाँ कौन चला?"', 5, 2, 'explore.wildlife.tracks.01'],
  ['animalia.wild', 'nest_box', 'nest_box', 'nature', 'Nest box', 'घोंसला बक्सा', 'Dadaji: "Do not touch. Eggs need their mother."', 'दादाजी: "छुओ मत। अंडों को उनकी माँ चाहिए।"', 7, 1],
  // town.public_garden (14×10)
  ['town.public_garden', 'swing', 'swing', 'sports', 'Swing', 'झूला', 'Dadaji: "Push, let go, swing back."', 'दादाजी: "धक्का दो, छोड़ो, वापस।"', 3, 2, 'sports.physical.balance.02'],
  ['town.public_garden', 'slide', 'slide', 'stem', 'Slide', 'फिसलपट्टी', 'Dadaji: "Up the steps, down the slide. Which is harder, and why?"', 'दादाजी: "सीढ़ी ऊपर, फिसलपट्टी नीचे। कौन-सा मुश्किल, क्यों?"', 7, 2, 'stem.physics.gravity.01'],
  ['town.public_garden', 'balance_beam', 'balance_beam', 'sports', 'Balance beam', 'संतुलन बीम', 'Dadaji: "Arms out, like a bird!"', 'दादाजी: "हाथ फैलाओ, चिड़िया की तरह!"', 5, 6, 'sports.physical.balance.01', 'balance'],
  ['town.public_garden', 'cricket_pitch', 'stumps', 'sports', 'Cricket pitch', 'क्रिकेट पिच', 'Buddy: "Woof! Keep your eye on the ball."', 'बडी: "भौं! गेंद पर नज़र रखो।"', 10, 5, 'sports.cricket.batting.01'],
  ['town.public_garden', 'kabaddi_court', 'kabaddi_court', 'sports', 'Kabaddi court', 'कबड्डी मैदान', 'Dadaji: "One breath: kabaddi kabaddi kabaddi!"', 'दादाजी: "एक साँस: कबड्डी कबड्डी कबड्डी!"', 11, 8, 'sports.kabaddi.raid.01'],
  ['town.public_garden', 'tree_trail', 'tree_sign', 'nature', 'Tree trail', 'पेड़ पहचान', 'Dadaji: "Neem, peepal, banyan. Touch the bark, smell the leaf."', 'दादाजी: "नीम, पीपल, बरगद। छाल छुओ, पत्ता सूँघो।"', 1, 8, 'nature.trees.identify.01'],
  ['town.public_garden', 'badminton_net', 'badminton_net', 'sports', 'Badminton net', 'बैडमिंटन नेट', 'Chintu: "Shuttle up, racket up, smash!"', 'चिंटू: "शटल ऊपर, रैकेट ऊपर, स्मैश!"', 12, 2, 'sports.badminton.serve.01'],
  ['town.public_garden', 'walking_track', 'track', 'sports', 'Walking track', 'सैर का रास्ता', 'Dadaji: "Three rounds is one kilometre. Count with me."', 'दादाजी: "तीन चक्कर एक किलोमीटर। गिनो।"', 0, 0, 'academic.maths.measurement.01'],
  // town.library (12×8)
  ['town.library', 'story_shelf', 'library_shelf', 'academic', 'Story shelf', 'कहानी शेल्फ़', 'Dadaji: "Pick a book! This one is from the Panchatantra."', 'दादाजी: "किताब चुनो! यह पंचतंत्र से है।"', 1, 2, 'storyland.panchatantra.monkey.01'],
  ['town.library', 'regional_shelf', 'library_shelf', 'academic', 'Regional languages', 'क्षेत्रीय भाषाएँ', 'Librarian: "The same story in Tamil, Bengali and Odia."', 'लाइब्रेरियन: "वही कहानी तमिल, बांग्ला और ओड़िया में।"', 5, 2, 'academic.languages.scripts.01'],
  ['town.library', 'reference_shelf', 'library_shelf', 'explore', 'Reference shelf', 'संदर्भ शेल्फ़', 'Chikki: "Where facts live and get checked."', 'चिक्की: "जहाँ तथ्य रहते हैं और जाँचे जाते हैं।"', 9, 2, 'explore.research.facts.01'],
  ['town.library', 'audio_corner', 'headphones', 'academic', 'Audiobook corner', 'ऑडियो कोना', 'Dadaji: "Put on the headphones and let the story walk with you."', 'दादाजी: "हेडफ़ोन लगाओ और कहानी को साथ चलने दो।"', 10, 6],
  ['town.library', 'librarian_desk', 'desk_counter', 'nature', 'Library desk', 'पुस्तकालय काउंटर', 'Dadaji: "A library card is a promise: borrow, care, return."', 'दादाजी: "लाइब्रेरी कार्ड एक वादा: लो, सँभालो, लौटाओ।"', 5, 6, 'nature.lifeskills.responsibility.01'],
  ['town.library', 'atlas_table', 'atlas', 'academic', 'Atlas table', 'एटलस की मेज़', 'Dadaji: "Seven continents, five oceans. Find them."', 'दादाजी: "सात महाद्वीप, पाँच महासागर। ढूँढो।"', 2, 6, 'academic.social.geography.01'],
  // town.temple (12×10)
  ['town.temple', 'bell', 'bell', 'explore', 'Temple bell', 'मंदिर की घंटी', 'Dadaji: "Tung-tung! Why does it keep singing after you let go?"', 'दादाजी: "टुन-टुन! छोड़ने के बाद भी क्यों गाती है?"', 6, 2, 'stem.physics.sound.01'],
  ['town.temple', 'ganesha_shrine', 'shrine', 'explore', 'Ganesha shrine', 'गणेश मंदिर', 'Dadaji (mythology): "The broken tusk and the Mahabharata."', 'दादाजी (पौराणिक): "टूटा दाँत और महाभारत।"', 2, 1, 'temple.stories.ganesha.01'],
  ['town.temple', 'lamp_stand', 'lamp', 'explore', 'Lamp stand', 'दीप स्तंभ', 'Dadaji: "Oil, wick, flame. Diwali, Karthigai, Dev Deepawali."', 'दादाजी: "तेल, बाती, लौ। दिवाली, कार्तिगई, देव दीपावली।"', 6, 5, 'explore.culture.festivals.01'],
  ['town.temple', 'shikhara', 'shikhara', 'explore', 'Shikhara', 'शिखर', 'Dadaji (history): "A shikhara in the north, a gopuram in the south. Stone tells us the century."', 'दादाजी (इतिहास): "उत्तर में शिखर, दक्षिण में गोपुरम। पत्थर सदी बताता है।"', 1, 4, 'explore.history.architecture.01'],
  ['town.temple', 'regional_gallery', 'gallery_board', 'explore', 'Regional traditions gallery', 'क्षेत्रीय परंपरा दीर्घा', 'Dadaji: "Jagannath in Odisha, Meenakshi in Tamil Nadu, Vithoba in Maharashtra."', 'दादाजी: "ओडिशा में जगन्नाथ, तमिलनाडु में मीनाक्षी, महाराष्ट्र में विठोबा।"', 10, 4, 'temple.regional.traditions.01'],
  ['town.temple', 'heritage_wing', 'gallery_board', 'explore', 'Shared heritage wing', 'साझा विरासत', 'Dadaji: "Buddhist, Jain, Sikh, Sufi and tribal traditions, each in its own words."', 'दादाजी: "बौद्ध, जैन, सिख, सूफ़ी और जनजातीय परंपराएँ, हर एक अपने शब्दों में।"', 10, 8, 'temple.heritage.shared.01'],
  ['town.temple', 'banyan', 'banyan', 'nature', 'Banyan tree', 'बरगद', 'Gauri: "Roots that hang from branches. A tree that walks."', 'गौरी: "डालियों से लटकती जड़ें। चलता हुआ पेड़।"', 11, 1, 'nature.trees.identify.01'],
  // town.bazaar (12×8)
  ['town.bazaar', 'veg_stall', 'stall', 'academic', 'Vegetable stall', 'सब्ज़ी की दुकान', 'Dadaji: "Ten rupees a kilo. Two kilos cost?"', 'दादाजी: "दस रुपये किलो। दो किलो के कितने?"', 2, 2, 'nature.lifeskills.money.01'],
  ['town.bazaar', 'cloth_stall', 'stall_cloth', 'explore', 'Cloth stall', 'कपड़े की दुकान', 'Dadaji: "Bandhani from Gujarat, Kanjeevaram from Tamil Nadu."', 'दादाजी: "गुजरात की बांधनी, तमिलनाडु की कांजीवरम।"', 6, 2, 'explore.culture.clothing.01'],
  ['town.bazaar', 'sweet_shop', 'stall_sweets', 'explore', 'Sweet shop', 'मिठाई की दुकान', 'Chintu: "Jalebi! Rasgulla! Mysore pak!"', 'चिंटू: "जलेबी! रसगुल्ला! मैसूर पाक!"', 10, 2, 'explore.culture.food.01'],
  ['town.bazaar', 'potter', 'potter_wheel', 'art', "Potter's wheel", 'कुम्हार का चाक', 'Dadaji: "Round and round, a pot grows from mud."', 'दादाजी: "गोल-गोल, मिट्टी से घड़ा बनता है।"', 4, 6, 'art.craft.clay.01'],
  ['town.bazaar', 'bangle_stall', 'stall_bangles', 'academic', 'Bangle stall', 'चूड़ी की दुकान', 'Chikki: "Red, green, red, green. A pattern you can wear!"', 'चिक्की: "लाल, हरा, लाल, हरा। पहनने वाला पैटर्न!"', 8, 6, 'art.pattern.rangoli.01'],
  // town.festival_ground (12×10)
  ['town.festival_ground', 'stage', 'stage', 'music', 'Stage', 'मंच', 'Dadaji: "Stand tall, speak slow, look at your friends."', 'दादाजी: "सीधे खड़े, धीरे बोलो, दोस्तों को देखो।"', 6, 2, 'music.theatre.speaking.01'],
  ['town.festival_ground', 'dandiya_circle', 'dandiya', 'music', 'Dandiya circle', 'डांडिया', 'Mitthu: "Tak tak! Tak tak!"', 'मिट्ठू: "टक टक! टक टक!"', 3, 6, 'music.dance.folk.01', 'rhythm'],
  ['town.festival_ground', 'kolam_square', 'kolam', 'art', 'Kolam square', 'कोलम', 'Dadaji: "Dots, then one unbroken line."', 'दादाजी: "बिंदु, फिर एक अटूट रेखा।"', 9, 6, 'art.pattern.rangoli.01', 'pattern'],
  ['town.festival_ground', 'festival_calendar', 'calendar', 'explore', 'Festival calendar', 'त्योहार कैलेंडर', 'Dadaji: "Pongal in January, Holi in March, Onam in August."', 'दादाजी: "जनवरी में पोंगल, मार्च में होली, अगस्त में ओणम।"', 1, 1, 'explore.culture.festivals.01'],
  ['town.festival_ground', 'folk_instruments', 'instrument_rack', 'music', 'Folk instruments', 'लोक वाद्य', 'Dadaji: "Dhol from Punjab, chenda from Kerala, ektara from Bengal."', 'दादाजी: "पंजाब का ढोल, केरल का चेंडा, बंगाल का एकतारा।"', 10, 1, 'music.instruments.folk.01'],
  // excursions
  ['excursion.space', 'earth', 'planet_earth', 'explore', 'Earth', 'पृथ्वी', 'Dadaji: "Our Earth is blue because it has water."', 'दादाजी: "हमारी पृथ्वी नीली है क्योंकि इस पर पानी है।"', 0, 0, 'explore.astronomy.planets.01'],
  ['excursion.space', 'saturn', 'planet_saturn', 'explore', 'Saturn', 'शनि', 'Chikki: "Rings made of ice and rock. Billions of pieces!"', 'चिक्की: "बर्फ़ और पत्थर के छल्ले। अरबों टुकड़े!"', 0, 0, 'explore.astronomy.planets.01'],
  ['excursion.space', 'sun', 'sun', 'explore', 'Sun', 'सूर्य', 'Dadaji: "A star so close we feel its warmth."', 'दादाजी: "इतना पास का तारा कि गर्मी महसूस होती है।"', 0, 0, 'explore.astronomy.planets.01'],
  ['excursion.museum', 'dinosaur_skeleton', 'dinosaur', 'explore', 'Dinosaur skeleton', 'डायनासोर का कंकाल', 'Dadaji: "Rajasaurus lived in India sixty-seven million years ago."', 'दादाजी: "राजासॉरस छह करोड़ सत्तर लाख साल पहले भारत में रहता था।"', 0, 0, 'explore.dinosaurs.india.01'],
  ['excursion.museum', 'harappa_seal', 'seal', 'explore', 'Harappan seal', 'हड़प्पा की मुहर', 'Dadaji (history): "Five thousand years old. Nobody can read the script yet."', 'दादाजी (इतिहास): "पाँच हज़ार साल पुरानी। लिपि अभी कोई नहीं पढ़ सकता।"', 0, 0, 'explore.history.harappa.01'],
  ['excursion.forest', 'tiger_track', 'footprints', 'explore', 'Tiger track', 'बाघ के पदचिह्न', 'Buddy: "A pug mark! The forest is talking."', 'बडी: "पग-मार्क! जंगल बोल रहा है।"', 0, 0, 'explore.wildlife.tracks.01'],
  ['excursion.forest', 'sal_tree', 'sal_tree', 'nature', 'Sal tree', 'साल का पेड़', 'Dadaji: "Forests make the rain that fills our tank."', 'दादाजी: "जंगल वह बारिश बनाते हैं जो हमारी टंकी भरती है।"', 0, 0, 'nature.environment.forests.01'],
  ['excursion.ocean', 'coral', 'coral', 'explore', 'Coral reef', 'प्रवाल भित्ति', 'Dadaji: "A coral is an animal, not a stone."', 'दादाजी: "प्रवाल एक जानवर है, पत्थर नहीं।"', 0, 0, 'explore.ocean.life.01'],
  ['excursion.ocean', 'turtle', 'turtle', 'nature', 'Olive ridley turtle', 'ओलिव रिडले कछुआ', 'Gauri: "She comes back to the same beach in Odisha to lay her eggs."', 'गौरी: "वह अंडे देने ओडिशा के उसी तट पर लौटती है।"', 0, 0, 'explore.ocean.life.01'],
  ['excursion.mountains', 'snow_peak', 'peak', 'explore', 'Snow peak', 'बर्फ़ीली चोटी', 'Mitthu: "Home! Home! Cold and high!"', 'मिट्ठू: "घर! घर! ठंडा और ऊँचा!"', 0, 0, 'explore.geography.himalaya.01'],
  ['excursion.mountains', 'glacier', 'glacier', 'nature', 'Glacier', 'हिमनद', 'Dadaji: "A river of ice. Our Ganga begins here."', 'दादाजी: "बर्फ़ की नदी। हमारी गंगा यहीं से शुरू होती है।"', 0, 0, 'explore.geography.himalaya.01'],
  ['excursion.monument', 'qutub', 'monument_tower', 'explore', 'Qutub Minar', 'क़ुतुब मीनार', 'Dadaji (history): "Seventy-three metres of stone, eight hundred years old."', 'दादाजी (इतिहास): "तिहत्तर मीटर पत्थर, आठ सौ साल पुराना।"', 0, 0, 'explore.history.monuments.01'],
  ['excursion.monument', 'sanchi_stupa', 'stupa', 'explore', 'Sanchi Stupa', 'साँची स्तूप', 'Dadaji (history): "Built by Ashoka. A Buddhist monument, not a temple."', 'दादाजी (इतिहास): "अशोक ने बनवाया। बौद्ध स्मारक, मंदिर नहीं।"', 0, 0, 'explore.history.monuments.01'],
];

/** Objects whose full lesson is planned but not yet authored keep only Dadaji's preview line; the intended lesson id is recorded here for the coverage matrix. */
export const PLANNED_LESSONS: Record<string, string> = {};

export const OBJECTS: InteractiveObject[] = ROWS.map(([loc, key, sprite, section, en, hi, pEn, pHi, x, y, lessonId, activity]) => {
  const id = `${loc}.${key}`;
  const lesson = lessonId && LESSON_BY_ID[lessonId] ? lessonId : undefined;
  if (lessonId && !lesson) PLANNED_LESSONS[id] = lessonId;
  return { id, location: loc, name: L(en, hi), section, lesson, preview: L(pEn, pHi), states: ['unlocked'], tile: { x, y }, sprite, activity };
});

export const OBJECT_BY_ID: Record<string, InteractiveObject> = Object.fromEntries(OBJECTS.map((o) => [o.id, o]));

/** v2 object IDs used by stored progress from the prototype era. */
export const LEGACY_OBJECTS: Record<string, string> = {
  'house.living_room.telescope': 'villa.living.telescope', 'house.living_room.globe': 'villa.living.globe', 'house.living_room.bookshelf': 'villa.living.bookshelf',
  'house.living_room.radio': 'villa.living.radio', 'house.living_room.clock': 'villa.living.clock', 'house.living_room.carrom': 'villa.living.carrom', 'house.living_room.diya': 'villa.living.diya_shelf',
  'house.lab.magnet': 'villa.activity.magnet', 'house.lab.circuit': 'villa.activity.circuit_kit', 'house.music_room.harmonium': 'villa.activity.harmonium', 'house.music_room.tabla': 'villa.activity.tabla',
  'house.music_room.flute': 'villa.activity.flute', 'house.music_room.ghungroo': 'villa.activity.ghungroo', 'house.art_room.rangoli': 'villa.veranda.rangoli_threshold', 'house.art_room.easel': 'villa.activity.easel',
  'house.art_room.clay': 'villa.activity.clay_table', 'house.art_room.origami': 'villa.activity.origami_tray', 'house.garden.tulsi': 'garden.vegetables.tulsi', 'house.garden.mango_tree': 'garden.fruit.mango_tree',
  'house.garden.vegetables': 'garden.vegetables.veg_bed', 'house.garden.pond': 'garden.pond.pond', 'house.garden.compost': 'garden.compost.compost_bin', 'house.garden.butterfly': 'garden.butterfly.butterfly_bush',
  'house.garden.feeder': 'garden.flowers.bird_feeder', 'town.public_garden.balance_beam': 'town.public_garden.balance_beam', 'town.library.story_shelf': 'town.library.story_shelf', 'town.temple.bell': 'town.temple.bell',
};

export function canonicalObject(id: string): string {
  return OBJECT_BY_ID[id] ? id : LEGACY_OBJECTS[id] ?? id;
}
