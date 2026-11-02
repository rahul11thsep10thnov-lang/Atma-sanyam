// Dadaji's Story Corner: traditional and public-domain stories, bilingual.
// Licensed collections are registered with status 'pending' and no pages.
import type { ContentMeta, Localised, Story, StoryPage, QuizStep } from '../core/content';
import { L, choices, quiz } from './helpers';

export interface Collection { key: string; name: Localised; rights: 'public-domain' | 'traditional' | 'original' | 'pending'; note: Localised }

export const COLLECTIONS: Collection[] = [
  { key: 'panchatantra', name: L('Panchatantra', 'पंचतंत्र'), rights: 'traditional', note: L('Ancient Indian fables; retold in original words.', 'प्राचीन भारतीय कथाएँ; मूल शब्दों में पुनर्कथन।') },
  { key: 'jataka', name: L('Jataka Tales', 'जातक कथाएँ'), rights: 'traditional', note: L('Buddhist tradition; framed as such.', 'बौद्ध परंपरा; उसी रूप में प्रस्तुत।') },
  { key: 'hitopadesha', name: L('Hitopadesha', 'हितोपदेश'), rights: 'traditional', note: L('12th-century Sanskrit fables.', '12वीं सदी की संस्कृत कथाएँ।') },
  { key: 'akbar_birbal', name: L('Akbar and Birbal', 'अकबर-बीरबल'), rights: 'traditional', note: L('Folk tales; historical figures, legendary stories.', 'लोक कथाएँ; ऐतिहासिक पात्र, किंवदंती कथाएँ।') },
  { key: 'tenali', name: L('Tenali Raman', 'तेनाली रामन'), rights: 'traditional', note: L('Folk tales of the Vijayanagara court.', 'विजयनगर दरबार की लोक कथाएँ।') },
  { key: 'vikram_betaal', name: L('Vikram and Betaal', 'विक्रम-बेताल'), rights: 'traditional', note: L('From the Baital Pachisi.', 'बेताल पच्चीसी से।') },
  { key: 'gopal_bhar', name: L('Gopal Bhar', 'गोपाल भाँड़'), rights: 'traditional', note: L('Bengali folk tales.', 'बांग्ला लोक कथाएँ।') },
  { key: 'nasruddin', name: L('Mullah Nasruddin', 'मुल्ला नसरुद्दीन'), rights: 'traditional', note: L('Folk tales across Asia.', 'एशिया भर की लोक कथाएँ।') },
  { key: 'kathasaritsagara', name: L('Kathasaritsagara', 'कथासरित्सागर'), rights: 'traditional', note: L('11th-century story ocean.', '11वीं सदी का कथा-सागर।') },
  { key: 'tagore', name: L("Tagore's stories", 'टैगोर की कहानियाँ'), rights: 'public-domain', note: L('Public domain in India since 2002.', 'भारत में 2002 से सार्वजनिक।') },
  { key: 'sukumar_ray', name: L("Sukumar Ray's stories", 'सुकुमार राय'), rights: 'public-domain', note: L('Public domain.', 'सार्वजनिक।') },
  { key: 'jungle_book', name: L('The Jungle Book', 'द जंगल बुक'), rights: 'public-domain', note: L('Kipling text is public domain; film adaptations are not.', 'किपलिंग का पाठ सार्वजनिक; फ़िल्म रूपांतरण नहीं।') },
  { key: 'malgudi', name: L('Malgudi Days', 'मालगुडी डेज़'), rights: 'pending', note: L('Licence required from the R.K. Narayan estate.', 'आर.के. नारायण की संपदा से लाइसेंस आवश्यक।') },
  { key: 'ruskin_bond', name: L("Ruskin Bond's stories", 'रस्किन बॉन्ड'), rights: 'pending', note: L('Licence required (living author).', 'लाइसेंस आवश्यक (जीवित लेखक)।') },
  { key: 'satyajit_ray', name: L("Satyajit Ray's stories", 'सत्यजित राय'), rights: 'pending', note: L('Licence required from the estate.', 'संपदा से लाइसेंस आवश्यक।') },
  { key: 'sudha_murty', name: L("Grandma's Bag of Stories", 'ग्रैंडमाज़ बैग ऑफ़ स्टोरीज़'), rights: 'pending', note: L('Licence required (living author).', 'लाइसेंस आवश्यक (जीवित लेखक)।') },
  { key: 'original', name: L('DADU originals', 'DADU की मूल कहानियाँ'), rights: 'original', note: L('Written for DADU.', 'DADU के लिए लिखी।') },
];

interface StoryDef { id: string; collection: string; title: [string, string]; bands: ContentMeta['bands']; pages: [string, string, string][]; vocab: [string, string, string, string][]; moral: [string, string]; little: QuizStep[]; explorer: QuizStep[] }

function story(d: StoryDef): Story {
  const coll = COLLECTIONS.find((c) => c.key === d.collection)!;
  const meta: ContentMeta = { id: d.id, version: 1, objective: L(`Listen, understand and retell: ${d.title[0]}`, `सुनो, समझो और दोहराओ: ${d.title[1]}`), bands: d.bands, section: 'academic', subject: 'stories', topic: d.collection, difficulty: 1, prerequisites: [], provenance: `retold from ${coll.name.en} (${coll.rights})`, rights: coll.rights === 'pending' ? 'pending' : coll.rights === 'original' ? 'original' : 'public-domain', languages: ['en', 'hi'], review: 'draft' };
  const pages: StoryPage[] = d.pages.map(([en, hi, illustration]) => ({ text: L(en, hi), illustration, speaker: 'dadaji' }));
  return { meta, title: L(...d.title), collection: d.collection, pages, vocabulary: d.vocab.map(([w, wh, m, mh]) => ({ word: L(w, wh), meaning: L(m, mh) })), moral: L(...d.moral), questions: { little: d.little, explorer: d.explorer } };
}

export const STORIES: Story[] = [
  story({ id: 'story.panchatantra.monkey_and_crocodile', collection: 'panchatantra', title: ['The Monkey and the Crocodile', 'बंदर और मगरमच्छ'], bands: ['A1', 'A2', 'A3', 'A4'],
    pages: [
      ['Once, by a wide river, a monkey lived in a jamun tree. Every day he shared his sweet jamuns with a crocodile who swam below.', 'एक नदी के किनारे जामुन के पेड़ पर एक बंदर रहता था। वह रोज़ अपने मीठे जामुन नीचे तैरते मगरमच्छ के साथ बाँटता था।', 'river_tree'],
      ['The crocodile\'s wife tasted the jamuns and said: "If the fruit is this sweet, the monkey\'s heart must be sweeter. Bring it to me."', 'मगरमच्छ की पत्नी ने जामुन चखे और बोली: "फल इतने मीठे हैं तो बंदर का दिल और मीठा होगा। मेरे लिए लाओ।"', 'croc_wife'],
      ['The crocodile invited the monkey for a ride. Midway he confessed. The monkey laughed: "My heart? I left it on the tree! Take me back and I will fetch it."', 'मगरमच्छ ने बंदर को सैर पर बुलाया। बीच नदी में उसने सच बता दिया। बंदर हँसा: "मेरा दिल? वह तो पेड़ पर छूट गया! वापस ले चलो।"', 'river_ride'],
      ['Safe on his branch, the monkey said: "Friend, hearts do not come off. But trust does." And the crocodile swam away, ashamed.', 'डाल पर सुरक्षित बैठकर बंदर बोला: "दोस्त, दिल नहीं उतरता। पर भरोसा उतर जाता है।" और मगरमच्छ शर्मिंदा होकर चला गया।', 'tree_safe'],
    ], vocab: [['confess', 'कबूल करना', 'to admit something you did', 'अपनी गलती मान लेना'], ['ashamed', 'शर्मिंदा', 'feeling bad about what you did', 'अपने काम पर बुरा लगना']],
    moral: ['Presence of mind keeps you safe; broken trust is hard to mend.', 'हाज़िरजवाबी सुरक्षित रखती है; टूटा भरोसा जुड़ना मुश्किल।'],
    little: [quiz(['Where did the monkey live?', 'बंदर कहाँ रहता था?'], choices(['tree', 'In a jamun tree', 'जामुन के पेड़ पर'], ['river', 'In the river', 'नदी में'], ['cave', 'In a cave', 'गुफा में']), ['The monkey lived in the jamun tree by the river.', 'बंदर नदी किनारे जामुन के पेड़ पर रहता था।'])],
    explorer: [quiz(['Why did the crocodile confess midway?', 'मगरमच्छ ने बीच में सच क्यों कहा?'], choices(['guilt', 'He felt guilty about betraying a friend', 'दोस्त को धोखा देने का अपराधबोध'], ['tired', 'He was tired', 'थक गया'], ['lost', 'He got lost', 'रास्ता भूला'], ['hungry', 'He was hungry', 'भूखा था']), ['His conscience made him tell the truth, which gave the monkey his chance.', 'अंतरात्मा ने सच कहलवाया, जिससे बंदर को मौका मिला।'])] }),
  story({ id: 'story.panchatantra.blue_jackal', collection: 'panchatantra', title: ['The Blue Jackal', 'नीला सियार'], bands: ['A1', 'A2', 'A3'],
    pages: [
      ['A hungry jackal crept into a town at night and fell into a dyer\'s vat of blue colour. He climbed out blue from nose to tail.', 'एक भूखा सियार रात में शहर में घुसा और रंगरेज़ के नीले रंग के कुंड में गिर गया। वह नाक से पूँछ तक नीला निकला।', 'jackal_vat'],
      ['Back in the forest, no animal had seen a blue creature. "I am sent by the gods to be your king," said the jackal, and even the lions bowed.', 'जंगल में किसी ने नीला जीव नहीं देखा था। "मुझे देवताओं ने तुम्हारा राजा बनाकर भेजा है," सियार बोला, और शेर भी झुक गए।', 'blue_king'],
      ['One full-moon night the jackals howled. The blue king forgot himself and howled too. "A jackal!" cried the animals, and the king ran away.', 'एक पूर्णिमा की रात सियार हुआए। नीला राजा खुद को भूल गया और हुआया। "सियार!" जानवर चिल्लाए, और राजा भाग गया।', 'howl_moon'],
    ], vocab: [['vat', 'कुंड', 'a big tub of liquid', 'तरल का बड़ा टब'], ['howl', 'हुआना', 'a long loud cry', 'लंबी ऊँची आवाज़']],
    moral: ['You cannot hide who you are for long; be yourself.', 'अपना असली रूप देर तक नहीं छिपता; खुद रहो।'],
    little: [quiz(['What colour did the jackal become?', 'सियार किस रंग का हुआ?'], choices(['blue', 'Blue', 'नीला'], ['red', 'Red', 'लाल'], ['green', 'Green', 'हरा']), ['He fell into the blue dye.', 'वह नीले रंग में गिरा।'])],
    explorer: [quiz(['What gave the jackal away?', 'सियार की पोल कैसे खुली?'], choices(['howl', 'He howled with the other jackals', 'वह दूसरे सियारों के साथ हुआया'], ['rain', 'Rain washed the colour', 'बारिश ने रंग धोया'], ['lion', 'A lion smelled him', 'शेर ने सूँघा'], ['none', 'Nothing', 'कुछ नहीं']), ['Habits reveal the truth.', 'आदतें सच बताती हैं।'])] }),
  story({ id: 'story.panchatantra.lion_and_rabbit', collection: 'panchatantra', title: ['The Lion and the Clever Rabbit', 'शेर और चतुर खरगोश'], bands: ['A1', 'A2', 'A3', 'A4'],
    pages: [
      ['A lion hunted so greedily that the animals made a deal: one animal would come to him each day, and he would leave the rest alone.', 'एक शेर इतना लालची था कि जानवरों ने समझौता किया: रोज़ एक जानवर उसके पास आएगा, और वह बाकियों को छोड़ देगा।', 'lion_den'],
      ['When the rabbit\'s turn came, she walked slowly and arrived late. "Another lion stopped me on the way," she said. "He says he is the real king."', 'खरगोश की बारी आई तो वह धीरे चली और देर से पहुँची। "रास्ते में एक और शेर ने रोका," वह बोली। "वह कहता है असली राजा वही है।"', 'rabbit_late'],
      ['Furious, the lion followed her to a well. He looked in, saw his own reflection, roared, and jumped at the "rival". The forest was free.', 'गुस्से में शेर उसके पीछे कुएँ तक गया। उसने झाँका, अपनी परछाई देखी, दहाड़ा और "प्रतिद्वंद्वी" पर कूद पड़ा। जंगल आज़ाद हो गया।', 'lion_well'],
    ], vocab: [['reflection', 'परछाई', 'the picture you see in water or a mirror', 'पानी या दर्पण में दिखने वाला चित्र'], ['rival', 'प्रतिद्वंद्वी', 'someone competing with you', 'मुकाबला करने वाला']],
    moral: ['Wit can beat strength.', 'बुद्धि ताक़त को हरा सकती है।'],
    little: [quiz(['Who tricked the lion?', 'शेर को किसने चकमा दिया?'], choices(['rabbit', 'The rabbit', 'खरगोश'], ['deer', 'The deer', 'हिरन'], ['fox', 'The fox', 'लोमड़ी']), ['The small rabbit used her wits.', 'छोटी खरगोश ने बुद्धि लगाई।'])],
    explorer: [quiz(['What did the lion see in the well?', 'शेर ने कुएँ में क्या देखा?'], choices(['reflection', 'His own reflection', 'अपनी परछाई'], ['lion', 'Another lion', 'दूसरा शेर'], ['rabbit', 'The rabbit', 'खरगोश'], ['water', 'Only water', 'सिर्फ़ पानी']), ['Anger stopped him from thinking.', 'गुस्से ने सोचने नहीं दिया।'])] }),
  story({ id: 'story.panchatantra.four_friends', collection: 'panchatantra', title: ['The Four Friends', 'चार दोस्त'], bands: ['A1', 'A2', 'A3'],
    pages: [
      ['A crow, a mouse, a tortoise and a deer were friends. One day the deer did not come to the lake. The crow flew up and saw him caught in a hunter\'s net.', 'एक कौआ, एक चूहा, एक कछुआ और एक हिरन दोस्त थे। एक दिन हिरन झील पर नहीं आया। कौआ उड़ा और उसे शिकारी के जाल में फँसा देखा।', 'four_friends'],
      ['The mouse gnawed the net. The deer was free, but the slow tortoise had followed and now the hunter grabbed him instead.', 'चूहे ने जाल कुतरा। हिरन आज़ाद हुआ, पर धीमा कछुआ पीछे आ गया था और अब शिकारी ने उसे पकड़ लिया।', 'mouse_net'],
      ['The deer lay down as if dead; the crow sat on him pecking. The hunter dropped the tortoise and ran for the deer. The deer leapt up, and all four escaped together.', 'हिरन मरे जैसा लेट गया; कौआ उस पर बैठकर चोंच मारने लगा। शिकारी ने कछुआ छोड़ा और हिरन की ओर दौड़ा। हिरन उछला, और चारों साथ बच निकले।', 'escape_together'],
    ], vocab: [['gnaw', 'कुतरना', 'to bite little by little', 'थोड़ा-थोड़ा काटना'], ['net', 'जाल', 'a trap made of string', 'धागे का फंदा']],
    moral: ['Friends who work together can solve anything.', 'मिलकर काम करने वाले दोस्त सब सुलझा लेते हैं।'],
    little: [quiz(['Who cut the net?', 'जाल किसने काटा?'], choices(['mouse', 'The mouse', 'चूहा'], ['crow', 'The crow', 'कौआ'], ['tortoise', 'The tortoise', 'कछुआ']), ['The mouse gnawed through the net.', 'चूहे ने जाल कुतरा।'])],
    explorer: [quiz(['Why did the deer pretend to be dead?', 'हिरन ने मरने का नाटक क्यों किया?'], choices(['distract', 'To distract the hunter from the tortoise', 'शिकारी का ध्यान कछुए से हटाने को'], ['tired', 'He was tired', 'थका था'], ['game', 'For a game', 'खेल के लिए'], ['fear', 'He was afraid', 'डर गया']), ['Each friend used a different skill.', 'हर दोस्त ने अलग कौशल लगाया।'])] }),
  story({ id: 'story.jataka.monkey_king', collection: 'jataka', title: ['The Monkey King and the Mango Tree', 'वानर राजा और आम का पेड़'], bands: ['A2', 'A3', 'A4'],
    pages: [
      ['In a Buddhist Jataka tale, a great monkey king led his troop in a mango tree by the Ganga. One mango floated downstream to a human king, who tasted it and wanted the tree.', 'एक बौद्ध जातक कथा में, एक महान वानर राजा गंगा किनारे आम के पेड़ पर अपने दल का नेता था। एक आम बहकर एक मानव राजा तक पहुँचा, जिसने चखा और पेड़ चाहा।', 'ganga_mango'],
      ['The king\'s soldiers surrounded the tree with arrows. The monkey king leapt across the river with a rope, tied it to a branch, and made a bridge of his own body.', 'राजा के सैनिकों ने पेड़ को तीरों से घेरा। वानर राजा रस्सी लेकर नदी पार कूदा, डाल से बाँधा, और अपने शरीर का पुल बनाया।', 'body_bridge'],
      ['Every monkey crossed over him to safety. Exhausted, he fell. The human king caught him and asked why. "A leader\'s life is for his people," said the monkey king.', 'हर बंदर उसके ऊपर से सुरक्षित पार हुआ। थककर वह गिरा। मानव राजा ने उसे सँभाला और पूछा क्यों। "नेता का जीवन उसके लोगों के लिए होता है," वानर राजा बोला।', 'king_learns'],
    ], vocab: [['troop', 'दल', 'a group of monkeys', 'बंदरों का समूह'], ['exhausted', 'थका हुआ', 'very, very tired', 'बहुत ज़्यादा थका']],
    moral: ['A good leader puts others first.', 'अच्छा नेता दूसरों को पहले रखता है।'],
    little: [quiz(['What did the monkey king make with his body?', 'वानर राजा ने शरीर से क्या बनाया?'], choices(['bridge', 'A bridge', 'पुल'], ['boat', 'A boat', 'नाव'], ['house', 'A house', 'घर']), ['He became a bridge for his troop.', 'वह अपने दल के लिए पुल बना।'])],
    explorer: [quiz(['This story comes from which tradition?', 'यह कथा किस परंपरा से?'], choices(['buddhist', 'Buddhist Jataka tales', 'बौद्ध जातक कथाएँ'], ['greek', 'Greek myths', 'यूनानी मिथक'], ['akbar', 'Akbar-Birbal', 'अकबर-बीरबल'], ['original', 'A DADU original', 'DADU मूल']), ['Jatakas tell of the Buddha\'s earlier lives.', 'जातक बुद्ध के पूर्व जन्मों की कथाएँ।'])] }),
  story({ id: 'story.jataka.banyan_deer', collection: 'jataka', title: ['The Banyan Deer', 'बरगद का हिरन'], bands: ['A2', 'A3', 'A4'],
    pages: [
      ['In a Jataka tale, a king hunted deer every day, so two deer kings agreed to send one deer by turns and spare the rest.', 'एक जातक कथा में, एक राजा रोज़ हिरन का शिकार करता था, तो दो हिरन राजाओं ने तय किया कि बारी-बारी एक हिरन भेजेंगे।', 'deer_kings'],
      ['When a mother deer\'s turn came, the golden Banyan Deer king went in her place and laid his head on the block.', 'जब एक माँ हिरनी की बारी आई, सुनहरा बरगद हिरन राजा उसकी जगह गया और सिर पत्थर पर रख दिया।', 'golden_deer'],
      ['The human king asked why. "She has a fawn," said the deer. The king put down his bow and promised never to hunt again.', 'मानव राजा ने पूछा क्यों। "उसका बच्चा है," हिरन बोला। राजा ने धनुष रखा और फिर कभी शिकार न करने का वचन दिया।', 'bow_down'],
    ], vocab: [['fawn', 'हिरन का बच्चा', 'a baby deer', 'नन्हा हिरन'], ['spare', 'बख़्शना', 'to let someone go unharmed', 'बिना नुकसान जाने देना']],
    moral: ['Compassion can change even a hunter.', 'करुणा शिकारी को भी बदल सकती है।'],
    little: [quiz(['What colour was the deer king?', 'हिरन राजा का रंग?'], choices(['golden', 'Golden', 'सुनहरा'], ['black', 'Black', 'काला'], ['white', 'White', 'सफ़ेद']), ['The Banyan Deer was golden.', 'बरगद हिरन सुनहरा था।'])],
    explorer: [quiz(['What did the human king promise?', 'मानव राजा ने क्या वचन दिया?'], choices(['nohunt', 'Never to hunt again', 'फिर कभी शिकार नहीं'], ['feast', 'A feast', 'दावत'], ['gold', 'Gold for the deer', 'हिरन को सोना'], ['nothing', 'Nothing', 'कुछ नहीं']), ['The deer\'s compassion moved him.', 'हिरन की करुणा ने उसे बदला।'])] }),
  story({ id: 'story.akbar_birbal.well', collection: 'akbar_birbal', title: ['Birbal and the Well', 'बीरबल और कुआँ'], bands: ['A2', 'A3', 'A4', 'A5'],
    pages: [
      ['A folk tale: a farmer bought a well from a rich man. When he came to draw water, the rich man said: "I sold you the well, not the water in it!"', 'एक लोक कथा: एक किसान ने अमीर से कुआँ खरीदा। पानी लेने आया तो अमीर बोला: "मैंने कुआँ बेचा, उसका पानी नहीं!"', 'farmer_well'],
      ['The farmer went to Emperor Akbar\'s court. Birbal listened, then said to the rich man: "Fine. The water is yours. Then remove it from the farmer\'s well today, or pay him rent for keeping it there."', 'किसान बादशाह अकबर के दरबार गया। बीरबल ने सुना, फिर अमीर से कहा: "ठीक। पानी तुम्हारा। तो आज ही किसान के कुएँ से निकालो, या उसे रखने का किराया दो।"', 'birbal_court'],
      ['The rich man had no answer. He gave up his claim, and the whole court laughed.', 'अमीर के पास जवाब नहीं था। उसने दावा छोड़ा, और पूरा दरबार हँसा।', 'court_laugh'],
    ], vocab: [['claim', 'दावा', 'saying something is yours', 'किसी चीज़ को अपना कहना'], ['rent', 'किराया', 'money paid to use something', 'उपयोग के लिए दिया पैसा']],
    moral: ['A clever question can undo a greedy trick.', 'चतुर सवाल लालची चाल तोड़ देता है।'],
    little: [quiz(['What did the farmer buy?', 'किसान ने क्या खरीदा?'], choices(['well', 'A well', 'कुआँ'], ['cow', 'A cow', 'गाय'], ['field', 'A field', 'खेत']), ['He bought the well.', 'उसने कुआँ खरीदा।'])],
    explorer: [quiz(['Are Akbar and Birbal historical people?', 'क्या अकबर और बीरबल ऐतिहासिक हैं?'], choices(['yes', 'Yes, but the stories are legends', 'हाँ, पर कहानियाँ किंवदंती हैं'], ['no', 'No, invented', 'नहीं, काल्पनिक'], ['gods', 'They are gods', 'वे देवता हैं'], ['unknown', 'Nobody knows', 'कोई नहीं जानता']), ['Both lived in the 16th century; the tales grew later.', 'दोनों 16वीं सदी में थे; कथाएँ बाद में बनीं।'])] }),
  story({ id: 'story.akbar_birbal.line', collection: 'akbar_birbal', title: ['The Shorter Line', 'छोटी रेखा'], bands: ['A2', 'A3', 'A4'],
    pages: [
      ['Akbar drew a line on the floor. "Make this line shorter without touching it," he told his courtiers. They stared.', 'अकबर ने फ़र्श पर एक रेखा खींची। "इसे बिना छुए छोटा करो," उसने दरबारियों से कहा। वे देखते रहे।', 'akbar_line'],
      ['Birbal picked up the chalk and drew a longer line beside it. "There," he said. "Now yours is the shorter one."', 'बीरबल ने चॉक उठाई और पास में लंबी रेखा खींची। "लो," वह बोला। "अब आपकी छोटी है।"', 'birbal_line'],
    ], vocab: [['courtier', 'दरबारी', 'a person who serves at a king\'s court', 'राजा के दरबार में सेवा करने वाला'], ['beside', 'पास', 'next to', 'बगल में']],
    moral: ['Change what you can, and the problem changes.', 'जो बदल सकते हो बदलो, समस्या बदल जाएगी।'],
    little: [quiz(['How did Birbal make the line shorter?', 'बीरबल ने रेखा छोटी कैसे की?'], choices(['longer', 'He drew a longer one beside it', 'पास में लंबी रेखा बनाई'], ['erase', 'He erased it', 'मिटा दी'], ['cut', 'He cut it', 'काट दी']), ['Shorter is a comparison.', '"छोटी" तुलना है।'])],
    explorer: [quiz(['The story is really about...', 'कहानी असल में है...'], choices(['compare', 'How "short" only means something by comparison', '"छोटा" सिर्फ़ तुलना में मायने रखता है'], ['chalk', 'Chalk', 'चॉक'], ['floors', 'Floors', 'फ़र्श'], ['kings', 'Kings being wise', 'राजाओं की बुद्धि']), ['Relative words need a reference.', 'सापेक्ष शब्दों को संदर्भ चाहिए।'])] }),
  story({ id: 'story.tenali.cat', collection: 'tenali', title: ['Tenali Raman and the Cat', 'तेनाली रामन और बिल्ली'], bands: ['A2', 'A3', 'A4'],
    pages: [
      ['King Krishnadevaraya gave every courtier a kitten and a cow, ordering them to raise fat cats. Tenali Raman\'s cat stayed thin.', 'राजा कृष्णदेवराय ने हर दरबारी को एक बिल्ली का बच्चा और एक गाय दी, और मोटी बिल्लियाँ पालने का आदेश दिया। तेनाली रामन की बिल्ली दुबली रही।', 'king_kittens'],
      ['"Why?" asked the king. "She will not touch milk, Your Majesty." The king did not believe him. Tenali put a bowl of milk before the cat, and she ran away hissing.', '"क्यों?" राजा ने पूछा। "वह दूध छूती नहीं, महाराज।" राजा को यकीन नहीं हुआ। तेनाली ने बिल्ली के सामने दूध रखा, और वह फुफकारकर भागी।', 'cat_runs'],
      ['Tenali had once given her hot milk; she never trusted a bowl again. "The milk," he said, "fed my family instead." The king laughed and let it be.', 'तेनाली ने एक बार उसे गर्म दूध दिया था; उसने फिर कभी कटोरे पर भरोसा नहीं किया। "वह दूध," वह बोला, "मेरे परिवार को मिला।" राजा हँसा और जाने दिया।', 'king_laughs'],
    ], vocab: [['hiss', 'फुफकारना', 'the angry sound a cat makes', 'बिल्ली की गुस्से वाली आवाज़'], ['majesty', 'महाराज', 'how you address a king', 'राजा को संबोधन']],
    moral: ['Wit finds a way, but honesty keeps the laugh kind.', 'बुद्धि रास्ता निकालती है, पर ईमानदारी हँसी को दयालु रखती है।'],
    little: [quiz(['Why did the cat run from the milk?', 'बिल्ली दूध से क्यों भागी?'], choices(['hot', 'Hot milk once burned her', 'एक बार गर्म दूध लगा था'], ['full', 'She was full', 'पेट भरा था'], ['dog', 'A dog chased her', 'कुत्ते ने भगाया']), ['One hot bowl taught her fear.', 'एक गर्म कटोरे ने डर सिखाया।'])],
    explorer: [quiz(['Which court did Tenali Raman serve?', 'तेनाली रामन किस दरबार में?'], choices(['vijayanagara', 'Vijayanagara (Krishnadevaraya)', 'विजयनगर (कृष्णदेवराय)'], ['mughal', 'The Mughal court', 'मुग़ल दरबार'], ['chola', 'The Chola court', 'चोल दरबार'], ['maurya', 'The Maurya court', 'मौर्य दरबार']), ['He is linked to the 16th-century Vijayanagara empire.', 'वे 16वीं सदी के विजयनगर साम्राज्य से जुड़े हैं।'])] }),
  story({ id: 'story.tenali.thieves', collection: 'tenali', title: ['Tenali Raman and the Thieves', 'तेनाली रामन और चोर'], bands: ['A2', 'A3', 'A4'],
    pages: [
      ['One night Tenali heard thieves whispering in his garden. He said loudly to his wife: "Thieves are about. Let us hide our gold in the well!"', 'एक रात तेनाली ने बगीचे में चोरों की फुसफुसाहट सुनी। उसने पत्नी से ज़ोर से कहा: "चोर घूम रहे हैं। चलो सोना कुएँ में छिपाएँ!"', 'thieves_garden'],
      ['He dropped a heavy box into the well with a splash. The thieves waited, then spent all night drawing water to empty the well.', 'उसने छपाक से एक भारी बक्सा कुएँ में डाला। चोर इंतज़ार करते रहे, फिर रात भर कुआँ खाली करने को पानी खींचते रहे।', 'thieves_well'],
      ['At dawn the box came up: full of stones. The whole garden was watered. "Thank you for your help," called Tenali from the window, and the thieves fled.', 'भोर में बक्सा निकला: पत्थरों से भरा। पूरा बगीचा सींच गया। "मदद के लिए धन्यवाद," तेनाली ने खिड़की से कहा, और चोर भागे।', 'garden_watered'],
    ], vocab: [['whisper', 'फुसफुसाना', 'to speak very softly', 'बहुत धीरे बोलना'], ['dawn', 'भोर', 'early morning when the sun rises', 'सूर्योदय का समय']],
    moral: ['Turn a problem into a help with a little wit.', 'थोड़ी बुद्धि से समस्या को मदद में बदलो।'],
    little: [quiz(['What was in the box?', 'बक्से में क्या था?'], choices(['stones', 'Stones', 'पत्थर'], ['gold', 'Gold', 'सोना'], ['mangoes', 'Mangoes', 'आम']), ['Stones, to trick the thieves.', 'पत्थर, चोरों को चकमा देने को।'])],
    explorer: [quiz(['What did the thieves end up doing?', 'चोरों ने आख़िर क्या किया?'], choices(['watered', 'Watering the garden all night', 'रात भर बगीचा सींचा'], ['stole', 'Stealing the gold', 'सोना चुराया'], ['slept', 'Sleeping', 'सोए'], ['cooked', 'Cooking', 'खाना बनाया']), ['Their greed did Tenali\'s chores.', 'उनके लालच ने तेनाली का काम कर दिया।'])] }),
  story({ id: 'story.hitopadesha.old_tiger', collection: 'hitopadesha', title: ['The Old Tiger and the Bangle', 'बूढ़ा बाघ और कंगन'], bands: ['A3', 'A4', 'A5'],
    pages: [
      ['From the Hitopadesha: an old tiger stood by a muddy pond holding a golden bangle. "Take this gift, traveller," he called to a passing man.', 'हितोपदेश से: एक बूढ़ा बाघ कीचड़ भरे तालाब के पास सोने का कंगन लिए खड़ा था। "यह उपहार लो, यात्री," उसने गुज़रते आदमी को पुकारा।', 'tiger_bangle'],
      ['"I am old and harmless now," said the tiger. "I only want to give." The greedy traveller stepped into the pond to take it and sank in the mud.', '"मैं अब बूढ़ा और हानिरहित हूँ," बाघ बोला। "मैं सिर्फ़ देना चाहता हूँ।" लालची यात्री कंगन लेने तालाब में उतरा और कीचड़ में धँस गया।', 'traveller_mud'],
      ['"Do not worry, I will help you out," said the tiger, and he did, in his own way. Dadaji says: when a gift is too good, ask why it is being given.', '"चिंता मत करो, मैं निकाल दूँगा," बाघ बोला, और उसने निकाला, अपने तरीके से। दादाजी कहते हैं: उपहार बहुत अच्छा लगे तो पूछो कि क्यों दिया जा रहा है।', 'dadaji_warns'],
    ], vocab: [['harmless', 'हानिरहित', 'not able to hurt anyone', 'जो नुकसान न पहुँचाए'], ['greedy', 'लालची', 'wanting more than you need', 'ज़रूरत से ज़्यादा चाहना']],
    moral: ['Beware of gifts from strangers that seem too good to be true.', 'अजनबियों के बहुत अच्छे लगने वाले उपहारों से सावधान।'],
    little: [quiz(['What did the tiger hold?', 'बाघ के पास क्या था?'], choices(['bangle', 'A golden bangle', 'सोने का कंगन'], ['mango', 'A mango', 'आम'], ['book', 'A book', 'किताब']), ['A golden bangle as bait.', 'चारे के रूप में सोने का कंगन।'])],
    explorer: [quiz(['How does this story apply online?', 'यह कहानी ऑनलाइन कैसे लागू?'], choices(['prize', '"You have won a prize" messages are the tiger\'s bangle', '"आपने इनाम जीता" संदेश बाघ का कंगन हैं'], ['games', 'Games are bad', 'खेल बुरे हैं'], ['tigers', 'Tigers use phones', 'बाघ फ़ोन चलाते हैं'], ['none', 'It does not', 'लागू नहीं']), ['Digital safety: unexpected gifts need an adult\'s eyes.', 'डिजिटल सुरक्षा: अप्रत्याशित उपहार पर बड़ों की नज़र।'])] }),
  story({ id: 'story.original.mitthu_first_echo', collection: 'original', title: ["Mitthu's First Echo", 'मिट्ठू की पहली गूँज'], bands: ['A1', 'A2', 'A3'],
    pages: [
      ['When Mitthu first flew down from the mountains to the villa, he could only say one thing: "Say it again!" Chintu laughed and Buddy barked.', 'जब मिट्ठू पहली बार पहाड़ों से विला आया, वह सिर्फ़ एक बात कह सकता था: "फिर कहो!" चिंटू हँसा और बडी भौंका।', 'mitthu_arrives'],
      ['Dadaji was teaching Chintu the seven swaras. Chintu forgot "Dha". Mitthu tilted his head and sang: "Sa Re Ga Ma Pa DHA Ni Sa!"', 'दादाजी चिंटू को सात स्वर सिखा रहे थे। चिंटू "धा" भूल गया। मिट्ठू ने सिर टेढ़ा किया और गाया: "सा रे गा मा पा धा नी सा!"', 'mitthu_sings'],
      ['"Mitthu remembers everything he hears," said Dadaji. "He will be our Echo. When you forget, he will say it again, and you will say it after him." And that is how Mitthu found his job.', '"मिट्ठू जो सुनता है सब याद रखता है," दादाजी बोले। "वह हमारी गूँज होगा। तुम भूलो तो वह फिर कहेगा, और तुम उसके बाद दोहराओगे।" और ऐसे मिट्ठू को उसका काम मिला।', 'mitthu_job'],
    ], vocab: [['echo', 'गूँज', 'a sound that comes back', 'लौटकर आने वाली आवाज़'], ['tilt', 'टेढ़ा करना', 'to lean to one side', 'एक ओर झुकाना']],
    moral: ['Repeating is how remembering begins.', 'दोहराना ही याद रखने की शुरुआत है।'],
    little: [quiz(['What does Mitthu do?', 'मिट्ठू क्या करता है?'], choices(['repeat', 'Repeats what he hears', 'जो सुनता है दोहराता है'], ['cook', 'Cooks', 'खाना बनाता'], ['dig', 'Digs', 'खोदता']), ['Mitthu is the Echo.', 'मिट्ठू गूँज है।'])],
    explorer: [quiz(['Which swara did Chintu forget?', 'चिंटू कौन-सा स्वर भूला?'], choices(['dha', 'Dha', 'धा'], ['sa', 'Sa', 'सा'], ['ma', 'Ma', 'मा'], ['ni', 'Ni', 'नी']), ['Mitthu sang Dha loudest.', 'मिट्ठू ने धा सबसे ज़ोर से गाया।'])] }),
];

export const STORY_BY_ID: Record<string, Story> = Object.fromEntries(STORIES.map((s) => [s.meta.id, s]));
export function storiesByCollection(key: string): Story[] { return STORIES.filter((s) => s.collection === key); }
