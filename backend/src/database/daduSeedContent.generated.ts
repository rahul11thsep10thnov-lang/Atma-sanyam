// Generated from prototype/dadu/index.html (LESSONS) by the seed port script; edit the CMS, not this file.
export const SEED_LESSONS: Record<string, unknown>[] = [
 {
  "meta": {
   "id": "explore.astronomy.telescope.01",
   "version": 1,
   "objective": {
    "en": "Know that the Moon, planets and stars are far away and a telescope makes them look closer.",
    "hi": "जानना कि चाँद, ग्रह और तारे बहुत दूर हैं और दूरबीन उन्हें पास दिखाती है।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "explore",
   "subject": "astronomy",
   "topic": "telescope",
   "difficulty": 2,
   "prerequisites": [],
   "provenance": "DADU original script (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "The telescope",
   "hi": "दूरबीन"
  },
  "host": "villa.living.telescope",
  "world": "discovery",
  "companion": "chikki",
  "concept": "explore.astronomy.telescope",
  "steps": {
   "little": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Beta, look! This is my telescope. It makes far-away things look big.",
      "hi": "बेटा, देखो! यह मेरी दूरबीन है। यह दूर की चीज़ों को बड़ा दिखाती है।"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "Dadaji, can I see the Moon in it?",
      "hi": "दादाजी, क्या मैं इसमें चाँद देख सकता हूँ?"
     }
    },
    {
     "type": "dialogue",
     "who": "chikki",
     "text": {
      "en": "I counted: the Moon is very, very far. Further than the mango tree!",
      "hi": "मैंने गिना: चाँद बहुत-बहुत दूर है। आम के पेड़ से भी दूर!"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Yes! The Moon is far, so it looks small. The telescope makes it look close.",
      "hi": "हाँ! चाँद दूर है, इसलिए छोटा दिखता है। दूरबीन उसे पास दिखाती है।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Tap the Moon in the sky.",
       "hi": "आसमान में चाँद को छुओ।"
      },
      "items": [
       {
        "key": "moon",
        "label": {
         "en": "Moon",
         "hi": "चाँद"
        },
        "ok": true,
        "icon": "moon"
       },
       {
        "key": "sun",
        "label": {
         "en": "Sun",
         "hi": "सूरज"
        },
        "ok": false,
        "icon": "sun"
       },
       {
        "key": "leaf",
        "label": {
         "en": "Leaf",
         "hi": "पत्ता"
        },
        "ok": false,
        "icon": "leaf"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Shabash! You found the Moon.",
      "hi": "शाबाश! तुमने चाँद ढूँढ लिया।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "Which one do we see at night?",
      "hi": "रात में हम किसे देखते हैं?"
     },
     "items": [
      {
       "key": "moon",
       "label": {
        "en": "Moon",
        "hi": "चाँद"
       },
       "ok": true,
       "icon": "moon"
      },
      {
       "key": "sun",
       "label": {
        "en": "Sun",
        "hi": "सूरज"
       },
       "ok": false,
       "icon": "sun"
      },
      {
       "key": "leaf",
       "label": {
        "en": "Leaf",
        "hi": "पत्ता"
       },
       "ok": false,
       "icon": "leaf"
      },
      {
       "key": "ball",
       "label": {
        "en": "Ball",
        "hi": "गेंद"
       },
       "ok": false,
       "icon": "ball"
      }
     ],
     "explain": {
      "en": "Yes! The Moon is far, so it looks small. The telescope makes it look close.",
      "hi": "हाँ! चाँद दूर है, इसलिए छोटा दिखता है। दूरबीन उसे पास दिखाती है।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "The Moon is far. The telescope makes it close.",
       "hi": "चाँद दूर है। दूरबीन उसे पास लाती है।"
      }
     ]
    }
   ],
   "explorer": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "This refracting telescope has two lenses. The big one collects light; the small one magnifies the image.",
      "hi": "इस दूरबीन में दो लेंस हैं। बड़ा लेंस रोशनी इकट्ठा करता है; छोटा लेंस छवि को बड़ा करता है।"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "If the Moon is 384,000 km away, how does it look so close?",
      "hi": "चाँद 3,84,000 किमी दूर है तो इतना पास कैसे दिखता है?"
     }
    },
    {
     "type": "dialogue",
     "who": "chikki",
     "text": {
      "en": "Magnification! A 50x telescope makes it look as if it were 7,680 km away. I did the division.",
      "hi": "आवर्धन! 50 गुना दूरबीन उसे ऐसा दिखाती है जैसे 7,680 किमी दूर हो। मैंने भाग किया।"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Exactly. Light from the Moon enters the objective lens, bends, and forms a small image that the eyepiece enlarges.",
      "hi": "बिल्कुल। चाँद की रोशनी अभिदृश्यक लेंस में जाकर मुड़ती है, छोटी छवि बनती है, जिसे नेत्रिका बड़ा करती है।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Put the planets in order from the Sun.",
       "hi": "ग्रहों को सूर्य से क्रम में लगाओ।"
      },
      "items": [
       {
        "key": "lens",
        "label": {
         "en": "Objective lens",
         "hi": "अभिदृश्यक लेंस"
        },
        "ok": true,
        "icon": "lens"
       },
       {
        "key": "eye",
        "label": {
         "en": "Eyepiece",
         "hi": "नेत्रिका"
        },
        "ok": false,
        "icon": "eye"
       },
       {
        "key": "tripod",
        "label": {
         "en": "Tripod",
         "hi": "तिपाई"
        },
        "ok": false,
        "icon": "tripod"
       },
       {
        "key": "moon",
        "label": {
         "en": "The Moon",
         "hi": "चाँद"
        },
        "ok": false,
        "icon": "moon"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Well reasoned. Mercury, Venus, Earth, Mars: the rocky four come first.",
      "hi": "सही सोच। बुध, शुक्र, पृथ्वी, मंगल: पहले चार पथरीले ग्रह।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "Which lens collects the light in a telescope?",
      "hi": "दूरबीन में रोशनी कौन-सा लेंस इकट्ठा करता है?"
     },
     "items": [
      {
       "key": "lens",
       "label": {
        "en": "Objective lens",
        "hi": "अभिदृश्यक लेंस"
       },
       "ok": true,
       "icon": "lens"
      },
      {
       "key": "eye",
       "label": {
        "en": "Eyepiece",
        "hi": "नेत्रिका"
       },
       "ok": false,
       "icon": "eye"
      },
      {
       "key": "tripod",
       "label": {
        "en": "Tripod",
        "hi": "तिपाई"
       },
       "ok": false,
       "icon": "tripod"
      },
      {
       "key": "moon",
       "label": {
        "en": "The Moon",
        "hi": "चाँद"
       },
       "ok": false,
       "icon": "moon"
      }
     ],
     "explain": {
      "en": "Exactly. Light from the Moon enters the objective lens, bends, and forms a small image that the eyepiece enlarges.",
      "hi": "बिल्कुल। चाँद की रोशनी अभिदृश्यक लेंस में जाकर मुड़ती है, छोटी छवि बनती है, जिसे नेत्रिका बड़ा करती है।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Objective collects. Eyepiece magnifies.",
       "hi": "अभिदृश्यक इकट्ठा करता है। नेत्रिका बड़ा करती है।"
      }
     ]
    }
   ]
  },
  "simpler": {
   "en": "Yes! The Moon is far, so it looks small. The telescope makes it look close.",
   "hi": "हाँ! चाँद दूर है, इसलिए छोटा दिखता है। दूरबीन उसे पास दिखाती है।"
  },
  "advanced": {
   "en": "Exactly. Light from the Moon enters the objective lens, bends, and forms a small image that the eyepiece enlarges.",
   "hi": "बिल्कुल। चाँद की रोशनी अभिदृश्यक लेंस में जाकर मुड़ती है, छोटी छवि बनती है, जिसे नेत्रिका बड़ा करती है।"
  },
  "example": {
   "en": "I counted: the Moon is very, very far. Further than the mango tree!",
   "hi": "मैंने गिना: चाँद बहुत-बहुत दूर है। आम के पेड़ से भी दूर!"
  },
  "assignment": "rwa.astronomy.telescope"
 },
 {
  "meta": {
   "id": "academic.geography.globe.01",
   "version": 1,
   "objective": {
    "en": "Find India on the globe and name the continent it is in.",
    "hi": "ग्लोब पर भारत ढूँढना और उसका महाद्वीप बताना।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "academic",
   "subject": "geography",
   "topic": "globe",
   "difficulty": 2,
   "prerequisites": [],
   "provenance": "DADU original script (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "The globe",
   "hi": "ग्लोब"
  },
  "host": "villa.living.globe",
  "world": "academy",
  "companion": "chikki",
  "concept": "academic.geography.globe",
  "steps": {
   "little": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "This round ball is our Earth, beta. Blue is water, green is land.",
      "hi": "यह गोल गेंद हमारी धरती है, बेटा। नीला पानी है, हरा ज़मीन।"
     }
    },
    {
     "type": "dialogue",
     "who": "chikki",
     "text": {
      "en": "Dadaji, where is India? Where is our house?",
      "hi": "दादाजी, भारत कहाँ है? हमारा घर कहाँ है?"
     }
    },
    {
     "type": "dialogue",
     "who": "buddy",
     "text": {
      "en": "Woof! I smell mangoes. India must be there!",
      "hi": "भौं! मुझे आम की खुशबू आ रही है। भारत वहीं होगा!"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Ha ha, Kim. India is here, shaped like a kite, with the sea on three sides.",
      "hi": "हा हा, किम। भारत यहाँ है, पतंग जैसा, तीन ओर समुद्र।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Tap India on the globe.",
       "hi": "ग्लोब पर भारत को छुओ।"
      },
      "items": [
       {
        "key": "water",
        "label": {
         "en": "Water",
         "hi": "पानी"
        },
        "ok": true,
        "icon": "water"
       },
       {
        "key": "leaf",
        "label": {
         "en": "Trees",
         "hi": "पेड़"
        },
        "ok": false,
        "icon": "leaf"
       },
       {
        "key": "sun",
        "label": {
         "en": "Sun",
         "hi": "सूरज"
        },
        "ok": false,
        "icon": "sun"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Shabash! That is our India.",
      "hi": "शाबाश! यही हमारा भारत है।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "What is the blue colour on the globe?",
      "hi": "ग्लोब पर नीला रंग क्या है?"
     },
     "items": [
      {
       "key": "water",
       "label": {
        "en": "Water",
        "hi": "पानी"
       },
       "ok": true,
       "icon": "water"
      },
      {
       "key": "leaf",
       "label": {
        "en": "Trees",
        "hi": "पेड़"
       },
       "ok": false,
       "icon": "leaf"
      },
      {
       "key": "sun",
       "label": {
        "en": "Sun",
        "hi": "सूरज"
       },
       "ok": false,
       "icon": "sun"
      },
      {
       "key": "ball",
       "label": {
        "en": "Ball",
        "hi": "गेंद"
       },
       "ok": false,
       "icon": "ball"
      }
     ],
     "explain": {
      "en": "Ha ha, Kim. India is here, shaped like a kite, with the sea on three sides.",
      "hi": "हा हा, किम। भारत यहाँ है, पतंग जैसा, तीन ओर समुद्र।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Blue is water. Green is land.",
       "hi": "नीला पानी। हरा ज़मीन।"
      }
     ]
    }
   ],
   "explorer": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "A globe is the only map with no distortion, because it is the same shape as the Earth.",
      "hi": "ग्लोब ही एकमात्र नक्शा है जिसमें कोई विकृति नहीं, क्योंकि यह धरती जैसा ही गोल है।"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "Then why do flat maps make Greenland look as big as Africa?",
      "hi": "तो सपाट नक्शों में ग्रीनलैंड अफ़्रीका जितना बड़ा क्यों दिखता है?"
     }
    },
    {
     "type": "dialogue",
     "who": "chikki",
     "text": {
      "en": "Because stretching a sphere flat stretches the poles. Africa is actually 14 times larger.",
      "hi": "क्योंकि गोले को सपाट करने पर ध्रुव खिंच जाते हैं। असल में अफ़्रीका 14 गुना बड़ा है।"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Correct. India lies in Asia, between 8° and 37° North, with the Tropic of Cancer passing through its middle.",
      "hi": "सही। भारत एशिया में, 8° से 37° उत्तर के बीच है, और कर्क रेखा इसके बीच से गुज़रती है।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Find the Tropic of Cancer and tap a state it crosses.",
       "hi": "कर्क रेखा ढूँढो और उस पर आने वाला एक राज्य छुओ।"
      },
      "items": [
       {
        "key": "asia",
        "label": {
         "en": "Asia",
         "hi": "एशिया"
        },
        "ok": true,
        "icon": "asia"
       },
       {
        "key": "africa",
        "label": {
         "en": "Africa",
         "hi": "अफ़्रीका"
        },
        "ok": false,
        "icon": "africa"
       },
       {
        "key": "europe",
        "label": {
         "en": "Europe",
         "hi": "यूरोप"
        },
        "ok": false,
        "icon": "europe"
       },
       {
        "key": "australia",
        "label": {
         "en": "Australia",
         "hi": "ऑस्ट्रेलिया"
        },
        "ok": false,
        "icon": "australia"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Good. Gujarat, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand, West Bengal, Tripura and Mizoram all lie on it.",
      "hi": "बढ़िया। गुजरात, राजस्थान, मध्य प्रदेश, छत्तीसगढ़, झारखंड, पश्चिम बंगाल, त्रिपुरा और मिज़ोरम इस पर हैं।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "Which continent is India in?",
      "hi": "भारत किस महाद्वीप में है?"
     },
     "items": [
      {
       "key": "asia",
       "label": {
        "en": "Asia",
        "hi": "एशिया"
       },
       "ok": true,
       "icon": "asia"
      },
      {
       "key": "africa",
       "label": {
        "en": "Africa",
        "hi": "अफ़्रीका"
       },
       "ok": false,
       "icon": "africa"
      },
      {
       "key": "europe",
       "label": {
        "en": "Europe",
        "hi": "यूरोप"
       },
       "ok": false,
       "icon": "europe"
      },
      {
       "key": "australia",
       "label": {
        "en": "Australia",
        "hi": "ऑस्ट्रेलिया"
       },
       "ok": false,
       "icon": "australia"
      }
     ],
     "explain": {
      "en": "Correct. India lies in Asia, between 8° and 37° North, with the Tropic of Cancer passing through its middle.",
      "hi": "सही। भारत एशिया में, 8° से 37° उत्तर के बीच है, और कर्क रेखा इसके बीच से गुज़रती है।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Globe: no distortion. Tropic of Cancer: through the middle of India.",
       "hi": "ग्लोब: कोई विकृति नहीं। कर्क रेखा: भारत के बीच से।"
      }
     ]
    }
   ]
  },
  "simpler": {
   "en": "Ha ha, Kim. India is here, shaped like a kite, with the sea on three sides.",
   "hi": "हा हा, किम। भारत यहाँ है, पतंग जैसा, तीन ओर समुद्र।"
  },
  "advanced": {
   "en": "Correct. India lies in Asia, between 8° and 37° North, with the Tropic of Cancer passing through its middle.",
   "hi": "सही। भारत एशिया में, 8° से 37° उत्तर के बीच है, और कर्क रेखा इसके बीच से गुज़रती है।"
  },
  "example": {
   "en": "Woof! I smell mangoes. India must be there!",
   "hi": "भौं! मुझे आम की खुशबू आ रही है। भारत वहीं होगा!"
  },
  "assignment": "rwa.geography.globe"
 },
 {
  "meta": {
   "id": "stem.physics.magnet.01",
   "version": 1,
   "objective": {
    "en": "Predict which objects a magnet attracts.",
    "hi": "अनुमान लगाना कि चुंबक किन चीज़ों को खींचता है।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "stem",
   "subject": "physics",
   "topic": "magnetism",
   "difficulty": 2,
   "prerequisites": [],
   "provenance": "DADU original script (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "The magnet",
   "hi": "चुंबक"
  },
  "host": "villa.activity.magnet",
  "world": "stemlab",
  "companion": "chikki",
  "concept": "stem.physics.magnet",
  "steps": {
   "little": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "This is a magnet, beta. It pulls some things like magic. But it is not magic, it is science!",
      "hi": "यह चुंबक है, बेटा। यह कुछ चीज़ों को जादू की तरह खींचता है। पर यह जादू नहीं, विज्ञान है!"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "Will it pull my mango?",
      "hi": "क्या यह मेरा आम खींचेगा?"
     }
    },
    {
     "type": "dialogue",
     "who": "buddy",
     "text": {
      "en": "Woof! It pulled my bell! Give it back!",
      "hi": "भौं! इसने मेरी घंटी खींच ली! वापस दो!"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Kim's bell is iron, so the magnet pulls it. A mango is not iron, so it stays.",
      "hi": "किम की घंटी लोहे की है, इसलिए चुंबक खींचता है। आम लोहे का नहीं, तो वह वहीं रहेगा।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Tap the thing the magnet will pull.",
       "hi": "उस चीज़ को छुओ जिसे चुंबक खींचेगा।"
      },
      "items": [
       {
        "key": "nail",
        "label": {
         "en": "Iron nail",
         "hi": "लोहे की कील"
        },
        "ok": true,
        "icon": "nail"
       },
       {
        "key": "leaf",
        "label": {
         "en": "Leaf",
         "hi": "पत्ता"
        },
        "ok": false,
        "icon": "leaf"
       },
       {
        "key": "mango",
        "label": {
         "en": "Mango",
         "hi": "आम"
        },
        "ok": false,
        "icon": "mango"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Shabash! Iron things come to the magnet.",
      "hi": "शाबाश! लोहे की चीज़ें चुंबक के पास आती हैं।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "Which one will the magnet pull?",
      "hi": "चुंबक किसे खींचेगा?"
     },
     "items": [
      {
       "key": "nail",
       "label": {
        "en": "Iron nail",
        "hi": "लोहे की कील"
       },
       "ok": true,
       "icon": "nail"
      },
      {
       "key": "leaf",
       "label": {
        "en": "Leaf",
        "hi": "पत्ता"
       },
       "ok": false,
       "icon": "leaf"
      },
      {
       "key": "mango",
       "label": {
        "en": "Mango",
        "hi": "आम"
       },
       "ok": false,
       "icon": "mango"
      },
      {
       "key": "pencil",
       "label": {
        "en": "Pencil",
        "hi": "पेंसिल"
       },
       "ok": false,
       "icon": "pencil"
      }
     ],
     "explain": {
      "en": "Kim's bell is iron, so the magnet pulls it. A mango is not iron, so it stays.",
      "hi": "किम की घंटी लोहे की है, इसलिए चुंबक खींचता है। आम लोहे का नहीं, तो वह वहीं रहेगा।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Magnet pulls iron. Not mango, not leaf.",
       "hi": "चुंबक लोहा खींचता है। आम नहीं, पत्ता नहीं।"
      }
     ]
    }
   ],
   "explorer": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "A magnet has two poles. Like poles push apart; unlike poles pull together. Iron, nickel and cobalt are attracted.",
      "hi": "चुंबक के दो ध्रुव होते हैं। समान ध्रुव दूर भागते हैं; असमान पास आते हैं। लोहा, निकल और कोबाल्ट आकर्षित होते हैं।"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "Then why does it not pull this steel-looking spoon?",
      "hi": "तो यह स्टील जैसा चम्मच क्यों नहीं खिंचता?"
     }
    },
    {
     "type": "dialogue",
     "who": "chikki",
     "text": {
      "en": "Hypothesis: that spoon is stainless steel with a lot of nickel and chromium, which can be non-magnetic.",
      "hi": "परिकल्पना: यह स्टेनलेस स्टील है, जिसमें निकल-क्रोमियम ज़्यादा हैं, वह अचुंबकीय हो सकता है।"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Good hypothesis. We test, we do not assume. Try the spoon, the nail, the coin and the pencil.",
      "hi": "अच्छी परिकल्पना। हम जाँचते हैं, मानते नहीं। चम्मच, कील, सिक्का और पेंसिल आज़माओ।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Sort the four objects: attracted or not.",
       "hi": "चारों चीज़ों को बाँटो: खिंचीं या नहीं।"
      },
      "items": [
       {
        "key": "copper",
        "label": {
         "en": "Copper",
         "hi": "ताँबा"
        },
        "ok": true,
        "icon": "copper"
       },
       {
        "key": "iron",
        "label": {
         "en": "Iron",
         "hi": "लोहा"
        },
        "ok": false,
        "icon": "iron"
       },
       {
        "key": "nickel",
        "label": {
         "en": "Nickel",
         "hi": "निकल"
        },
        "ok": false,
        "icon": "nickel"
       },
       {
        "key": "cobalt",
        "label": {
         "en": "Cobalt",
         "hi": "कोबाल्ट"
        },
        "ok": false,
        "icon": "cobalt"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "The iron nail and the bell: attracted. The brass coin and the pencil: not. Molly was right about the spoon.",
      "hi": "लोहे की कील और घंटी: खिंचीं। पीतल का सिक्का और पेंसिल: नहीं। चम्मच के बारे में मॉली सही थी।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "Which metal is NOT attracted by a magnet?",
      "hi": "कौन-सी धातु चुंबक से नहीं खिंचती?"
     },
     "items": [
      {
       "key": "copper",
       "label": {
        "en": "Copper",
        "hi": "ताँबा"
       },
       "ok": true,
       "icon": "copper"
      },
      {
       "key": "iron",
       "label": {
        "en": "Iron",
        "hi": "लोहा"
       },
       "ok": false,
       "icon": "iron"
      },
      {
       "key": "nickel",
       "label": {
        "en": "Nickel",
        "hi": "निकल"
       },
       "ok": false,
       "icon": "nickel"
      },
      {
       "key": "cobalt",
       "label": {
        "en": "Cobalt",
        "hi": "कोबाल्ट"
       },
       "ok": false,
       "icon": "cobalt"
      }
     ],
     "explain": {
      "en": "Good hypothesis. We test, we do not assume. Try the spoon, the nail, the coin and the pencil.",
      "hi": "अच्छी परिकल्पना। हम जाँचते हैं, मानते नहीं। चम्मच, कील, सिक्का और पेंसिल आज़माओ।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Like poles repel. Unlike poles attract. Iron, nickel, cobalt.",
       "hi": "समान ध्रुव दूर। असमान पास। लोहा, निकल, कोबाल्ट।"
      }
     ]
    }
   ]
  },
  "simpler": {
   "en": "Kim's bell is iron, so the magnet pulls it. A mango is not iron, so it stays.",
   "hi": "किम की घंटी लोहे की है, इसलिए चुंबक खींचता है। आम लोहे का नहीं, तो वह वहीं रहेगा।"
  },
  "advanced": {
   "en": "Good hypothesis. We test, we do not assume. Try the spoon, the nail, the coin and the pencil.",
   "hi": "अच्छी परिकल्पना। हम जाँचते हैं, मानते नहीं। चम्मच, कील, सिक्का और पेंसिल आज़माओ।"
  },
  "example": {
   "en": "Woof! It pulled my bell! Give it back!",
   "hi": "भौं! इसने मेरी घंटी खींच ली! वापस दो!"
  },
  "assignment": "rwa.physics.magnetism"
 },
 {
  "meta": {
   "id": "music.hindustani.swaras.01",
   "version": 1,
   "objective": {
    "en": "Hear and sing the seven swaras in order.",
    "hi": "सात स्वरों को क्रम में सुनना और गाना।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "music",
   "subject": "hindustani",
   "topic": "swaras",
   "difficulty": 2,
   "prerequisites": [],
   "provenance": "DADU original script (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "Sa Re Ga Ma",
   "hi": "सा रे गा मा"
  },
  "host": "villa.activity.harmonium",
  "world": "studio",
  "companion": "chikki",
  "concept": "music.hindustani.swaras",
  "steps": {
   "little": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Beta, this is my harmonium. Each key sings one note: Sa, Re, Ga, Ma...",
      "hi": "बेटा, यह मेरा हारमोनियम है। हर पट्टी एक स्वर गाती है: सा, रे, गा, मा..."
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "Sa re ga ma pa dha ni SAAA! Was that right?",
      "hi": "सा रे गा मा पा धा नी साआआ! सही था?"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Sa Re Ga Ma! Sa Re Ga Ma!",
       "hi": "सा रे गा मा! सा रे गा मा!"
      }
     ]
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Mitthu loves it. Seven swaras climb up like the steps of our veranda.",
      "hi": "मिट्ठू को बहुत पसंद है। सात स्वर हमारे बरामदे की सीढ़ियों जैसे ऊपर चढ़ते हैं।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Tap the keys from Sa to Sa.",
       "hi": "सा से सा तक पट्टियाँ दबाओ।"
      },
      "items": [
       {
        "key": "sa",
        "label": {
         "en": "Sa",
         "hi": "सा"
        },
        "ok": true,
        "icon": "sa"
       },
       {
        "key": "ma",
        "label": {
         "en": "Ma",
         "hi": "मा"
        },
        "ok": false,
        "icon": "ma"
       },
       {
        "key": "ni",
        "label": {
         "en": "Ni",
         "hi": "नी"
        },
        "ok": false,
        "icon": "ni"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Shabash! You climbed all seven steps.",
      "hi": "शाबाश! तुमने सातों सीढ़ियाँ चढ़ लीं।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "Which swara comes first?",
      "hi": "सबसे पहला स्वर कौन-सा है?"
     },
     "items": [
      {
       "key": "sa",
       "label": {
        "en": "Sa",
        "hi": "सा"
       },
       "ok": true,
       "icon": "sa"
      },
      {
       "key": "ma",
       "label": {
        "en": "Ma",
        "hi": "मा"
       },
       "ok": false,
       "icon": "ma"
      },
      {
       "key": "ni",
       "label": {
        "en": "Ni",
        "hi": "नी"
       },
       "ok": false,
       "icon": "ni"
      },
      {
       "key": "pa",
       "label": {
        "en": "Pa",
        "hi": "पा"
       },
       "ok": false,
       "icon": "pa"
      }
     ],
     "explain": {
      "en": "Mitthu loves it. Seven swaras climb up like the steps of our veranda.",
      "hi": "मिट्ठू को बहुत पसंद है। सात स्वर हमारे बरामदे की सीढ़ियों जैसे ऊपर चढ़ते हैं।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Sa Re Ga Ma Pa Dha Ni Sa.",
       "hi": "सा रे गा मा पा धा नी सा।"
      }
     ]
    }
   ],
   "explorer": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "The seven swaras make a saptak. Sa and Pa are fixed; Re, Ga, Dha, Ni can be komal (flat) and Ma can be teevra (sharp).",
      "hi": "सात स्वर मिलकर सप्तक बनाते हैं। सा और पा अचल हैं; रे, गा, धा, नी कोमल हो सकते हैं और मा तीव्र।"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "So Raag Bhairav and Raag Yaman use the same seven names but different notes?",
      "hi": "तो राग भैरव और राग यमन में नाम वही सात पर स्वर अलग?"
     }
    },
    {
     "type": "dialogue",
     "who": "chikki",
     "text": {
      "en": "Yes! Twelve possible notes, arranged in patterns. It is set theory with feelings.",
      "hi": "हाँ! बारह संभव स्वर, अलग-अलग क्रम में। यह भावनाओं वाला समुच्चय-सिद्धांत है।"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Bhairav uses komal Re and komal Dha; Yaman uses teevra Ma. Listen to both and feel the morning in one, the evening in the other.",
      "hi": "भैरव में कोमल रे और कोमल धा; यमन में तीव्र मा। दोनों सुनो, एक में सुबह, दूसरे में शाम महसूस करो।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Play the Yaman aaroh: Ni Re Ga Ma(teevra) Dha Ni Sa.",
       "hi": "यमन का आरोह बजाओ: नी रे गा मा(तीव्र) धा नी सा।"
      },
      "items": [
       {
        "key": "sapa",
        "label": {
         "en": "Sa and Pa",
         "hi": "सा और पा"
        },
        "ok": true,
        "icon": "sapa"
       },
       {
        "key": "rega",
        "label": {
         "en": "Re and Ga",
         "hi": "रे और गा"
        },
        "ok": false,
        "icon": "rega"
       },
       {
        "key": "mani",
        "label": {
         "en": "Ma and Ni",
         "hi": "मा और नी"
        },
        "ok": false,
        "icon": "mani"
       },
       {
        "key": "dhani",
        "label": {
         "en": "Dha and Ni",
         "hi": "धा और नी"
        },
        "ok": false,
        "icon": "dhani"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Beautiful. Now you know why Yaman is sung at dusk.",
      "hi": "सुंदर। अब समझे कि यमन शाम को क्यों गाया जाता है।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "Which two swaras never change?",
      "hi": "कौन-से दो स्वर कभी नहीं बदलते?"
     },
     "items": [
      {
       "key": "sapa",
       "label": {
        "en": "Sa and Pa",
        "hi": "सा और पा"
       },
       "ok": true,
       "icon": "sapa"
      },
      {
       "key": "rega",
       "label": {
        "en": "Re and Ga",
        "hi": "रे और गा"
       },
       "ok": false,
       "icon": "rega"
      },
      {
       "key": "mani",
       "label": {
        "en": "Ma and Ni",
        "hi": "मा और नी"
       },
       "ok": false,
       "icon": "mani"
      },
      {
       "key": "dhani",
       "label": {
        "en": "Dha and Ni",
        "hi": "धा और नी"
       },
       "ok": false,
       "icon": "dhani"
      }
     ],
     "explain": {
      "en": "Bhairav uses komal Re and komal Dha; Yaman uses teevra Ma. Listen to both and feel the morning in one, the evening in the other.",
      "hi": "भैरव में कोमल रे और कोमल धा; यमन में तीव्र मा। दोनों सुनो, एक में सुबह, दूसरे में शाम महसूस करो।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Sa and Pa are fixed. Ma can be teevra.",
       "hi": "सा और पा अचल। मा तीव्र हो सकता है।"
      }
     ]
    }
   ]
  },
  "simpler": {
   "en": "Mitthu loves it. Seven swaras climb up like the steps of our veranda.",
   "hi": "मिट्ठू को बहुत पसंद है। सात स्वर हमारे बरामदे की सीढ़ियों जैसे ऊपर चढ़ते हैं।"
  },
  "advanced": {
   "en": "Bhairav uses komal Re and komal Dha; Yaman uses teevra Ma. Listen to both and feel the morning in one, the evening in the other.",
   "hi": "भैरव में कोमल रे और कोमल धा; यमन में तीव्र मा। दोनों सुनो, एक में सुबह, दूसरे में शाम महसूस करो।"
  },
  "example": {
   "en": "Sa Re Ga Ma! Sa Re Ga Ma!",
   "hi": "सा रे गा मा! सा रे गा मा!"
  },
  "assignment": "rwa.hindustani.swaras"
 },
 {
  "meta": {
   "id": "art.rangoli.patterns.01",
   "version": 1,
   "objective": {
    "en": "Continue a repeating pattern of shapes and colours.",
    "hi": "आकृतियों और रंगों का दोहराता पैटर्न आगे बढ़ाना।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "art",
   "subject": "rangoli",
   "topic": "patterns",
   "difficulty": 2,
   "prerequisites": [],
   "provenance": "DADU original script (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "Rangoli patterns",
   "hi": "रंगोली के पैटर्न"
  },
  "host": "villa.activity.rangoli",
  "world": "studio",
  "companion": "chikki",
  "concept": "art.rangoli.patterns",
  "steps": {
   "little": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Look at the floor, beta. Dots, lines and petals make a rangoli.",
      "hi": "ज़मीन देखो, बेटा। बिंदु, रेखाएँ और पंखुड़ियाँ मिलकर रंगोली बनती है।"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "I want to put a big orange blob in the middle!",
      "hi": "मैं बीच में बड़ा नारंगी धब्बा लगाऊँगा!"
     }
    },
    {
     "type": "dialogue",
     "who": "chikki",
     "text": {
      "en": "Pattern alert! Orange, green, orange, green... what comes next?",
      "hi": "पैटर्न! नारंगी, हरा, नारंगी, हरा... आगे क्या?"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "A pattern repeats. If we keep the rule, the rangoli looks balanced and pretty.",
      "hi": "पैटर्न दोहराता है। नियम रखो तो रंगोली संतुलित और सुंदर दिखती है।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Tap the colour that comes next.",
       "hi": "अगला रंग छुओ।"
      },
      "items": [
       {
        "key": "petal",
        "label": {
         "en": "Petal",
         "hi": "पंखुड़ी"
        },
        "ok": true,
        "icon": "petal"
       },
       {
        "key": "dot",
        "label": {
         "en": "Dot",
         "hi": "बिंदु"
        },
        "ok": false,
        "icon": "dot"
       },
       {
        "key": "leaf",
        "label": {
         "en": "Leaf",
         "hi": "पत्ता"
        },
        "ok": false,
        "icon": "leaf"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Shabash! Orange, green, orange, green, orange!",
      "hi": "शाबाश! नारंगी, हरा, नारंगी, हरा, नारंगी!"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "What comes next: petal, dot, petal, dot, ...?",
      "hi": "आगे क्या: पंखुड़ी, बिंदु, पंखुड़ी, बिंदु, ...?"
     },
     "items": [
      {
       "key": "petal",
       "label": {
        "en": "Petal",
        "hi": "पंखुड़ी"
       },
       "ok": true,
       "icon": "petal"
      },
      {
       "key": "dot",
       "label": {
        "en": "Dot",
        "hi": "बिंदु"
       },
       "ok": false,
       "icon": "dot"
      },
      {
       "key": "leaf",
       "label": {
        "en": "Leaf",
        "hi": "पत्ता"
       },
       "ok": false,
       "icon": "leaf"
      },
      {
       "key": "star",
       "label": {
        "en": "Star",
        "hi": "तारा"
       },
       "ok": false,
       "icon": "star"
      }
     ],
     "explain": {
      "en": "A pattern repeats. If we keep the rule, the rangoli looks balanced and pretty.",
      "hi": "पैटर्न दोहराता है। नियम रखो तो रंगोली संतुलित और सुंदर दिखती है।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "A pattern repeats. Keep the rule.",
       "hi": "पैटर्न दोहराता है। नियम रखो।"
      }
     ]
    }
   ],
   "explorer": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Kolam from Tamil Nadu is drawn on a dot grid with one unbroken line. Rangoli from Maharashtra uses symmetry around a centre.",
      "hi": "तमिलनाडु का कोलम बिंदुओं की जाली पर एक अटूट रेखा से बनता है। महाराष्ट्र की रंगोली केंद्र के चारों ओर सममित होती है।"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "One unbroken line around 25 dots? That sounds like a maze.",
      "hi": "25 बिंदुओं के चारों ओर एक अटूट रेखा? यह तो भूलभुलैया लगती है।"
     }
    },
    {
     "type": "dialogue",
     "who": "chikki",
     "text": {
      "en": "It is a graph! Each dot is a node; the line visits every space exactly once. Mathematicians call it a Eulerian path.",
      "hi": "यह ग्राफ़ है! हर बिंदु एक नोड; रेखा हर जगह ठीक एक बार जाती है। गणितज्ञ इसे ऑयलर पथ कहते हैं।"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Art and mathematics were never separate in India. Try a 5 by 5 grid with four-fold symmetry.",
      "hi": "भारत में कला और गणित कभी अलग नहीं थे। 5×5 जाली पर चार-तरफ़ा सममिति आज़माओ।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Complete the mirrored quarter of the design.",
       "hi": "डिज़ाइन का दर्पण-चौथाई पूरा करो।"
      },
      "items": [
       {
        "key": "kolam",
        "label": {
         "en": "Kolam",
         "hi": "कोलम"
        },
        "ok": true,
        "icon": "kolam"
       },
       {
        "key": "madhubani",
        "label": {
         "en": "Madhubani",
         "hi": "मधुबनी"
        },
        "ok": false,
        "icon": "madhubani"
       },
       {
        "key": "warli",
        "label": {
         "en": "Warli",
         "hi": "वारली"
        },
        "ok": false,
        "icon": "warli"
       },
       {
        "key": "mandala",
        "label": {
         "en": "Mandala",
         "hi": "मंडला"
        },
        "ok": false,
        "icon": "mandala"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Perfect symmetry. Fold it in your mind and both halves match.",
      "hi": "पूर्ण सममिति। मन में मोड़ो और दोनों हिस्से मिल जाएँगे।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "Which rangoli style uses a dot grid and one unbroken line?",
      "hi": "कौन-सी शैली बिंदु-जाली और एक अटूट रेखा उपयोग करती है?"
     },
     "items": [
      {
       "key": "kolam",
       "label": {
        "en": "Kolam",
        "hi": "कोलम"
       },
       "ok": true,
       "icon": "kolam"
      },
      {
       "key": "madhubani",
       "label": {
        "en": "Madhubani",
        "hi": "मधुबनी"
       },
       "ok": false,
       "icon": "madhubani"
      },
      {
       "key": "warli",
       "label": {
        "en": "Warli",
        "hi": "वारली"
       },
       "ok": false,
       "icon": "warli"
      },
      {
       "key": "mandala",
       "label": {
        "en": "Mandala",
        "hi": "मंडला"
       },
       "ok": false,
       "icon": "mandala"
      }
     ],
     "explain": {
      "en": "Art and mathematics were never separate in India. Try a 5 by 5 grid with four-fold symmetry.",
      "hi": "भारत में कला और गणित कभी अलग नहीं थे। 5×5 जाली पर चार-तरफ़ा सममिति आज़माओ।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Kolam: dot grid, one line. Symmetry: fold and match.",
       "hi": "कोलम: बिंदु जाली, एक रेखा। सममिति: मोड़ो और मिलाओ।"
      }
     ]
    }
   ]
  },
  "simpler": {
   "en": "A pattern repeats. If we keep the rule, the rangoli looks balanced and pretty.",
   "hi": "पैटर्न दोहराता है। नियम रखो तो रंगोली संतुलित और सुंदर दिखती है।"
  },
  "advanced": {
   "en": "Art and mathematics were never separate in India. Try a 5 by 5 grid with four-fold symmetry.",
   "hi": "भारत में कला और गणित कभी अलग नहीं थे। 5×5 जाली पर चार-तरफ़ा सममिति आज़माओ।"
  },
  "example": {
   "en": "Pattern alert! Orange, green, orange, green... what comes next?",
   "hi": "पैटर्न! नारंगी, हरा, नारंगी, हरा... आगे क्या?"
  },
  "assignment": "rwa.rangoli.patterns"
 },
 {
  "meta": {
   "id": "nature.plants.tulsi.01",
   "version": 1,
   "objective": {
    "en": "Name the parts of a plant and what it needs to grow.",
    "hi": "पौधे के भाग और उसकी ज़रूरतें बताना।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "nature",
   "subject": "plants",
   "topic": "parts-of-a-plant",
   "difficulty": 2,
   "prerequisites": [],
   "provenance": "DADU original script (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "The tulsi plant",
   "hi": "तुलसी का पौधा"
  },
  "host": "garden.vegetables.tulsi",
  "world": "garden",
  "companion": "gauri",
  "concept": "nature.plants.parts",
  "steps": {
   "little": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Beta, look at this beautiful tulsi. It needs sunlight and water.",
      "hi": "बेटा, इस सुंदर तुलसी को देखो। इसे धूप और पानी चाहिए।"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "Can I give it my milk instead of water?",
      "hi": "क्या मैं पानी की जगह अपना दूध दे दूँ?"
     }
    },
    {
     "type": "dialogue",
     "who": "gauri",
     "text": {
      "en": "Hmmm, no, little one. Plants drink water through their roots, under the soil.",
      "hi": "हम्म, नहीं बेटा। पौधे मिट्टी के नीचे जड़ों से पानी पीते हैं।"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Gauri is right. Roots drink, the stem carries, the leaves make food from sunlight.",
      "hi": "गौरी सही कहती है। जड़ें पीती हैं, तना ले जाता है, पत्ते धूप से खाना बनाते हैं।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Tap the watering can to water the tulsi.",
       "hi": "तुलसी को पानी देने के लिए झारी छुओ।"
      },
      "items": [
       {
        "key": "root",
        "label": {
         "en": "Roots",
         "hi": "जड़ें"
        },
        "ok": true,
        "icon": "root"
       },
       {
        "key": "leaf",
        "label": {
         "en": "Leaf",
         "hi": "पत्ता"
        },
        "ok": false,
        "icon": "leaf"
       },
       {
        "key": "flower",
        "label": {
         "en": "Flower",
         "hi": "फूल"
        },
        "ok": false,
        "icon": "flower"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Shabash! See the leaves stand up? The tulsi says thank you.",
      "hi": "शाबाश! देखो पत्ते खड़े हो गए? तुलसी धन्यवाद कह रही है।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "Which part of the plant drinks water?",
      "hi": "पौधे का कौन-सा भाग पानी पीता है?"
     },
     "items": [
      {
       "key": "root",
       "label": {
        "en": "Roots",
        "hi": "जड़ें"
       },
       "ok": true,
       "icon": "root"
      },
      {
       "key": "leaf",
       "label": {
        "en": "Leaf",
        "hi": "पत्ता"
       },
       "ok": false,
       "icon": "leaf"
      },
      {
       "key": "flower",
       "label": {
        "en": "Flower",
        "hi": "फूल"
       },
       "ok": false,
       "icon": "flower"
      },
      {
       "key": "sun",
       "label": {
        "en": "Sun",
        "hi": "सूरज"
       },
       "ok": false,
       "icon": "sun"
      }
     ],
     "explain": {
      "en": "Gauri is right. Roots drink, the stem carries, the leaves make food from sunlight.",
      "hi": "गौरी सही कहती है। जड़ें पीती हैं, तना ले जाता है, पत्ते धूप से खाना बनाते हैं।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Roots drink. Leaves make food.",
       "hi": "जड़ें पीती हैं। पत्ते खाना बनाते हैं।"
      }
     ]
    }
   ],
   "explorer": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Let us understand how sunlight, water and carbon dioxide are used during photosynthesis.",
      "hi": "चलो समझें कि प्रकाश-संश्लेषण में धूप, पानी और कार्बन डाइऑक्साइड कैसे काम आते हैं।"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "So the leaf is a kitchen? What is the recipe?",
      "hi": "तो पत्ता एक रसोई है? विधि क्या है?"
     }
    },
    {
     "type": "dialogue",
     "who": "gauri",
     "text": {
      "en": "Six water, six carbon dioxide, a little sunlight: one sugar and six oxygen. I breathe that oxygen, child.",
      "hi": "छह पानी, छह कार्बन डाइऑक्साइड, थोड़ी धूप: एक शक्कर और छह ऑक्सीजन। वही ऑक्सीजन मैं साँस में लेती हूँ।"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "6CO2 + 6H2O + light gives C6H12O6 + 6O2. Chlorophyll in the leaf traps the light; stomata let the gases in and out.",
      "hi": "6CO2 + 6H2O + प्रकाश से C6H12O6 + 6O2। पत्ते का क्लोरोफ़िल प्रकाश पकड़ता है; रंध्र गैसें अंदर-बाहर करते हैं।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Label the leaf: chlorophyll, stomata, veins.",
       "hi": "पत्ते पर नाम लगाओ: क्लोरोफ़िल, रंध्र, शिराएँ।"
      },
      "items": [
       {
        "key": "co2",
        "label": {
         "en": "Carbon dioxide",
         "hi": "कार्बन डाइऑक्साइड"
        },
        "ok": true,
        "icon": "co2"
       },
       {
        "key": "o2",
        "label": {
         "en": "Oxygen",
         "hi": "ऑक्सीजन"
        },
        "ok": false,
        "icon": "o2"
       },
       {
        "key": "n2",
        "label": {
         "en": "Nitrogen",
         "hi": "नाइट्रोजन"
        },
        "ok": false,
        "icon": "n2"
       },
       {
        "key": "h2",
        "label": {
         "en": "Hydrogen",
         "hi": "हाइड्रोजन"
        },
        "ok": false,
        "icon": "h2"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Correct. And tulsi leaves also hold eugenol, which is why Ayurveda values them.",
      "hi": "सही। और तुलसी के पत्तों में यूजेनॉल होता है, इसलिए आयुर्वेद इन्हें महत्व देता है।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "Which gas does a plant take in for photosynthesis?",
      "hi": "प्रकाश-संश्लेषण के लिए पौधा कौन-सी गैस लेता है?"
     },
     "items": [
      {
       "key": "co2",
       "label": {
        "en": "Carbon dioxide",
        "hi": "कार्बन डाइऑक्साइड"
       },
       "ok": true,
       "icon": "co2"
      },
      {
       "key": "o2",
       "label": {
        "en": "Oxygen",
        "hi": "ऑक्सीजन"
       },
       "ok": false,
       "icon": "o2"
      },
      {
       "key": "n2",
       "label": {
        "en": "Nitrogen",
        "hi": "नाइट्रोजन"
       },
       "ok": false,
       "icon": "n2"
      },
      {
       "key": "h2",
       "label": {
        "en": "Hydrogen",
        "hi": "हाइड्रोजन"
       },
       "ok": false,
       "icon": "h2"
      }
     ],
     "explain": {
      "en": "6CO2 + 6H2O + light gives C6H12O6 + 6O2. Chlorophyll in the leaf traps the light; stomata let the gases in and out.",
      "hi": "6CO2 + 6H2O + प्रकाश से C6H12O6 + 6O2। पत्ते का क्लोरोफ़िल प्रकाश पकड़ता है; रंध्र गैसें अंदर-बाहर करते हैं।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Carbon dioxide in. Oxygen out. Sugar made.",
       "hi": "कार्बन डाइऑक्साइड अंदर। ऑक्सीजन बाहर। शक्कर बनी।"
      }
     ]
    }
   ]
  },
  "simpler": {
   "en": "Gauri is right. Roots drink, the stem carries, the leaves make food from sunlight.",
   "hi": "गौरी सही कहती है। जड़ें पीती हैं, तना ले जाता है, पत्ते धूप से खाना बनाते हैं।"
  },
  "advanced": {
   "en": "6CO2 + 6H2O + light gives C6H12O6 + 6O2. Chlorophyll in the leaf traps the light; stomata let the gases in and out.",
   "hi": "6CO2 + 6H2O + प्रकाश से C6H12O6 + 6O2। पत्ते का क्लोरोफ़िल प्रकाश पकड़ता है; रंध्र गैसें अंदर-बाहर करते हैं।"
  },
  "example": {
   "en": "Hmmm, no, little one. Plants drink water through their roots, under the soil.",
   "hi": "हम्म, नहीं बेटा। पौधे मिट्टी के नीचे जड़ों से पानी पीते हैं।"
  },
  "assignment": "rwa.plants.parts_of_a_plant"
 },
 {
  "meta": {
   "id": "sports.balance.beam.01",
   "version": 1,
   "objective": {
    "en": "Walk a line with arms out and understand why that helps balance.",
    "hi": "हाथ फैलाकर रेखा पर चलना और समझना कि इससे संतुलन क्यों बनता है।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "sports",
   "subject": "balance",
   "topic": "balance-beam",
   "difficulty": 2,
   "prerequisites": [],
   "provenance": "DADU original script (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "Balance",
   "hi": "संतुलन"
  },
  "host": "town.public_garden.balance_beam",
  "world": "sports",
  "companion": "buddy",
  "concept": "sports.balance.beam",
  "steps": {
   "little": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Beta, this low beam is for balancing. Arms out, like a bird!",
      "hi": "बेटा, यह नीचा बीम संतुलन के लिए है। हाथ फैलाओ, चिड़िया की तरह!"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "Like Mitthu! Flap flap!",
      "hi": "मिट्ठू की तरह! फड़-फड़!"
     }
    },
    {
     "type": "dialogue",
     "who": "buddy",
     "text": {
      "en": "Woof! I can do it with four legs. Can you do it with two?",
      "hi": "भौं! मैं चार पैरों से कर सकता हूँ। तुम दो से कर सकते हो?"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Slowly. Look ahead, not at your feet. Arms out help you stay steady.",
      "hi": "धीरे-धीरे। आगे देखो, पैरों की ओर नहीं। फैले हाथ संतुलन रखते हैं।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Tap left, right, left, right to walk the beam.",
       "hi": "बीम पर चलने के लिए बाएँ, दाएँ, बाएँ, दाएँ छुओ।"
      },
      "items": [
       {
        "key": "arms",
        "label": {
         "en": "Arms out",
         "hi": "हाथ फैले"
        },
        "ok": true,
        "icon": "arms"
       },
       {
        "key": "sleep",
        "label": {
         "en": "Lie down",
         "hi": "लेट जाओ"
        },
        "ok": false,
        "icon": "sleep"
       },
       {
        "key": "ball",
        "label": {
         "en": "Throw a ball",
         "hi": "गेंद फेंको"
        },
        "ok": false,
        "icon": "ball"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Shabash! You walked the whole beam.",
      "hi": "शाबाश! तुमने पूरा बीम पार किया।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "What do we do with our arms to balance?",
      "hi": "संतुलन के लिए हाथों का क्या करते हैं?"
     },
     "items": [
      {
       "key": "arms",
       "label": {
        "en": "Arms out",
        "hi": "हाथ फैले"
       },
       "ok": true,
       "icon": "arms"
      },
      {
       "key": "sleep",
       "label": {
        "en": "Lie down",
        "hi": "लेट जाओ"
       },
       "ok": false,
       "icon": "sleep"
      },
      {
       "key": "ball",
       "label": {
        "en": "Throw a ball",
        "hi": "गेंद फेंको"
       },
       "ok": false,
       "icon": "ball"
      },
      {
       "key": "book",
       "label": {
        "en": "Read",
        "hi": "पढ़ो"
       },
       "ok": false,
       "icon": "book"
      }
     ],
     "explain": {
      "en": "Slowly. Look ahead, not at your feet. Arms out help you stay steady.",
      "hi": "धीरे-धीरे। आगे देखो, पैरों की ओर नहीं। फैले हाथ संतुलन रखते हैं।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Arms out. Look ahead. Slow steps.",
       "hi": "हाथ फैलाओ। आगे देखो। धीरे चलो।"
      }
     ]
    }
   ],
   "explorer": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Balance is about your centre of gravity staying above your base of support.",
      "hi": "संतुलन का मतलब है कि तुम्हारा गुरुत्व-केंद्र आधार के ऊपर रहे।"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "So why does a tightrope walker carry that long pole?",
      "hi": "तो रस्सी पर चलने वाला लंबा डंडा क्यों रखता है?"
     }
    },
    {
     "type": "dialogue",
     "who": "buddy",
     "text": {
      "en": "Hmm, a heavy pole makes the body slower to tip? Like my tail when I turn fast!",
      "hi": "हम्म, भारी डंडा शरीर को झुकने में धीमा करता है? जैसे तेज़ मुड़ते समय मेरी पूँछ!"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Exactly, Kim. The pole increases the moment of inertia, so small wobbles take longer to grow, giving time to correct.",
      "hi": "बिल्कुल, किम। डंडा जड़त्व-आघूर्ण बढ़ाता है, इसलिए छोटे डगमगाहट धीरे बढ़ते हैं और सुधारने का समय मिलता है।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Choose the body position that keeps the centre of gravity lowest.",
       "hi": "वह मुद्रा चुनो जिसमें गुरुत्व-केंद्र सबसे नीचा रहे।"
      },
      "items": [
       {
        "key": "base",
        "label": {
         "en": "Above the base",
         "hi": "आधार के ऊपर"
        },
        "ok": true,
        "icon": "base"
       },
       {
        "key": "head",
        "label": {
         "en": "In the head",
         "hi": "सिर में"
        },
        "ok": false,
        "icon": "head"
       },
       {
        "key": "outside",
        "label": {
         "en": "Outside the feet",
         "hi": "पैरों के बाहर"
        },
        "ok": false,
        "icon": "outside"
       },
       {
        "key": "arms",
        "label": {
         "en": "In the arms",
         "hi": "हाथों में"
        },
        "ok": false,
        "icon": "arms"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Knees bent, arms out: lower centre, wider base. That is also the kabaddi raider's stance.",
      "hi": "घुटने मुड़े, हाथ फैले: नीचा केंद्र, चौड़ा आधार। यही कबड्डी के रेडर की मुद्रा है।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "Where must your centre of gravity stay to keep balance?",
      "hi": "संतुलन के लिए गुरुत्व-केंद्र कहाँ रहना चाहिए?"
     },
     "items": [
      {
       "key": "base",
       "label": {
        "en": "Above the base",
        "hi": "आधार के ऊपर"
       },
       "ok": true,
       "icon": "base"
      },
      {
       "key": "head",
       "label": {
        "en": "In the head",
        "hi": "सिर में"
       },
       "ok": false,
       "icon": "head"
      },
      {
       "key": "outside",
       "label": {
        "en": "Outside the feet",
        "hi": "पैरों के बाहर"
       },
       "ok": false,
       "icon": "outside"
      },
      {
       "key": "arms",
       "label": {
        "en": "In the arms",
        "hi": "हाथों में"
       },
       "ok": false,
       "icon": "arms"
      }
     ],
     "explain": {
      "en": "Exactly, Kim. The pole increases the moment of inertia, so small wobbles take longer to grow, giving time to correct.",
      "hi": "बिल्कुल, किम। डंडा जड़त्व-आघूर्ण बढ़ाता है, इसलिए छोटे डगमगाहट धीरे बढ़ते हैं और सुधारने का समय मिलता है।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Centre of gravity above the base. Bend the knees.",
       "hi": "गुरुत्व-केंद्र आधार के ऊपर। घुटने मोड़ो।"
      }
     ]
    }
   ]
  },
  "simpler": {
   "en": "Slowly. Look ahead, not at your feet. Arms out help you stay steady.",
   "hi": "धीरे-धीरे। आगे देखो, पैरों की ओर नहीं। फैले हाथ संतुलन रखते हैं।"
  },
  "advanced": {
   "en": "Exactly, Kim. The pole increases the moment of inertia, so small wobbles take longer to grow, giving time to correct.",
   "hi": "बिल्कुल, किम। डंडा जड़त्व-आघूर्ण बढ़ाता है, इसलिए छोटे डगमगाहट धीरे बढ़ते हैं और सुधारने का समय मिलता है।"
  },
  "example": {
   "en": "Woof! I can do it with four legs. Can you do it with two?",
   "hi": "भौं! मैं चार पैरों से कर सकता हूँ। तुम दो से कर सकते हो?"
  },
  "assignment": "rwa.balance.balance_beam"
 },
 {
  "meta": {
   "id": "academic.stories.monkey_crocodile.01",
   "version": 1,
   "objective": {
    "en": "Listen to a Panchatantra story and say what the monkey did cleverly.",
    "hi": "पंचतंत्र की कहानी सुनना और बताना कि बंदर ने क्या चतुराई की।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "academic",
   "subject": "stories",
   "topic": "panchatantra",
   "difficulty": 2,
   "prerequisites": [],
   "provenance": "DADU original script (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "The Monkey and the Crocodile",
   "hi": "बंदर और मगरमच्छ"
  },
  "host": "town.library.story_shelf",
  "world": "storyland",
  "companion": "chikki",
  "concept": "academic.stories.panchatantra",
  "steps": {
   "little": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Beta, pick a book! This one is from the Panchatantra: a monkey who lived in a jamun tree by the river.",
      "hi": "बेटा, एक किताब चुनो! यह पंचतंत्र से है: नदी किनारे जामुन के पेड़ पर रहने वाला बंदर।"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "Did the monkey eat all the jamuns alone?",
      "hi": "क्या बंदर ने सारे जामुन अकेले खा लिए?"
     }
    },
    {
     "type": "dialogue",
     "who": "chikki",
     "text": {
      "en": "No! He shared them with a crocodile every day. Sharing made them friends.",
      "hi": "नहीं! वह रोज़ मगरमच्छ के साथ बाँटता था। बाँटने से दोस्ती हुई।"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "But the crocodile's wife wanted the monkey's heart. The clever monkey said: \"My heart is on the tree!\" and escaped.",
      "hi": "पर मगरमच्छ की पत्नी को बंदर का दिल चाहिए था। चतुर बंदर बोला: \"मेरा दिल तो पेड़ पर है!\" और बच निकला।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Tap the jamun tree where the monkey kept his \"heart\".",
       "hi": "जामुन का पेड़ छुओ जहाँ बंदर ने \"दिल\" रखा था।"
      },
      "items": [
       {
        "key": "croc",
        "label": {
         "en": "Crocodile",
         "hi": "मगरमच्छ"
        },
        "ok": true,
        "icon": "croc"
       },
       {
        "key": "kim",
        "label": {
         "en": "A dog",
         "hi": "कुत्ता"
        },
        "ok": false,
        "icon": "kim"
       },
       {
        "key": "elephant",
        "label": {
         "en": "Elephant",
         "hi": "हाथी"
        },
        "ok": false,
        "icon": "elephant"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Shabash! The monkey thought fast and stayed safe.",
      "hi": "शाबाश! बंदर ने तेज़ी से सोचा और सुरक्षित रहा।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "Who did the monkey share jamuns with?",
      "hi": "बंदर ने जामुन किसके साथ बाँटे?"
     },
     "items": [
      {
       "key": "croc",
       "label": {
        "en": "Crocodile",
        "hi": "मगरमच्छ"
       },
       "ok": true,
       "icon": "croc"
      },
      {
       "key": "kim",
       "label": {
        "en": "A dog",
        "hi": "कुत्ता"
       },
       "ok": false,
       "icon": "kim"
      },
      {
       "key": "elephant",
       "label": {
        "en": "Elephant",
        "hi": "हाथी"
       },
       "ok": false,
       "icon": "elephant"
      },
      {
       "key": "fish",
       "label": {
        "en": "Fish",
        "hi": "मछली"
       },
       "ok": false,
       "icon": "fish"
      }
     ],
     "explain": {
      "en": "But the crocodile's wife wanted the monkey's heart. The clever monkey said: \"My heart is on the tree!\" and escaped.",
      "hi": "पर मगरमच्छ की पत्नी को बंदर का दिल चाहिए था। चतुर बंदर बोला: \"मेरा दिल तो पेड़ पर है!\" और बच निकला।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Share with friends. Think fast when in danger.",
       "hi": "दोस्तों से बाँटो। ख़तरे में तेज़ी से सोचो।"
      }
     ]
    }
   ],
   "explorer": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "The Panchatantra was composed around 200 BCE by Vishnu Sharma to teach princes niti, the art of wise conduct, through animal fables.",
      "hi": "पंचतंत्र लगभग 200 ईसा पूर्व विष्णु शर्मा ने राजकुमारों को नीति सिखाने के लिए पशु-कथाओं से रचा।"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "So each story is secretly a lesson in strategy?",
      "hi": "तो हर कहानी गुप्त रूप से रणनीति का पाठ है?"
     }
    },
    {
     "type": "dialogue",
     "who": "chikki",
     "text": {
      "en": "Yes. In this one the crocodile breaks trust, and the monkey uses presence of mind. Two moves, one game.",
      "hi": "हाँ। इसमें मगरमच्छ भरोसा तोड़ता है, बंदर हाज़िरजवाबी दिखाता है। दो चालें, एक खेल।"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Notice the structure: friendship, betrayal, quick thinking, escape. Stories inside stories, like boxes inside boxes.",
      "hi": "ढाँचा देखो: दोस्ती, धोखा, तेज़ सोच, बचाव। कहानी के अंदर कहानी, डिब्बे में डिब्बा।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Order the four events of the story.",
       "hi": "कहानी की चार घटनाओं को क्रम में लगाओ।"
      },
      "items": [
       {
        "key": "wit",
        "label": {
         "en": "Presence of mind",
         "hi": "हाज़िरजवाबी"
        },
        "ok": true,
        "icon": "wit"
       },
       {
        "key": "strength",
        "label": {
         "en": "Strength",
         "hi": "ताक़त"
        },
        "ok": false,
        "icon": "strength"
       },
       {
        "key": "speed",
        "label": {
         "en": "Speed",
         "hi": "तेज़ी"
        },
        "ok": false,
        "icon": "speed"
       },
       {
        "key": "luck",
        "label": {
         "en": "Luck",
         "hi": "क़िस्मत"
        },
        "ok": false,
        "icon": "luck"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Correct sequence. The moral is not \"never trust\", it is \"stay alert and keep your wits\".",
      "hi": "सही क्रम। सीख \"कभी भरोसा मत करो\" नहीं, बल्कि \"सजग रहो और बुद्धि रखो\" है।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "What quality saved the monkey?",
      "hi": "किस गुण ने बंदर को बचाया?"
     },
     "items": [
      {
       "key": "wit",
       "label": {
        "en": "Presence of mind",
        "hi": "हाज़िरजवाबी"
       },
       "ok": true,
       "icon": "wit"
      },
      {
       "key": "strength",
       "label": {
        "en": "Strength",
        "hi": "ताक़त"
       },
       "ok": false,
       "icon": "strength"
      },
      {
       "key": "speed",
       "label": {
        "en": "Speed",
        "hi": "तेज़ी"
       },
       "ok": false,
       "icon": "speed"
      },
      {
       "key": "luck",
       "label": {
        "en": "Luck",
        "hi": "क़िस्मत"
       },
       "ok": false,
       "icon": "luck"
      }
     ],
     "explain": {
      "en": "Notice the structure: friendship, betrayal, quick thinking, escape. Stories inside stories, like boxes inside boxes.",
      "hi": "ढाँचा देखो: दोस्ती, धोखा, तेज़ सोच, बचाव। कहानी के अंदर कहानी, डिब्बे में डिब्बा।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Panchatantra: niti through fables. Presence of mind saves.",
       "hi": "पंचतंत्र: कथाओं से नीति। हाज़िरजवाबी बचाती है।"
      }
     ]
    }
   ]
  },
  "simpler": {
   "en": "But the crocodile's wife wanted the monkey's heart. The clever monkey said: \"My heart is on the tree!\" and escaped.",
   "hi": "पर मगरमच्छ की पत्नी को बंदर का दिल चाहिए था। चतुर बंदर बोला: \"मेरा दिल तो पेड़ पर है!\" और बच निकला।"
  },
  "advanced": {
   "en": "Notice the structure: friendship, betrayal, quick thinking, escape. Stories inside stories, like boxes inside boxes.",
   "hi": "ढाँचा देखो: दोस्ती, धोखा, तेज़ सोच, बचाव। कहानी के अंदर कहानी, डिब्बे में डिब्बा।"
  },
  "example": {
   "en": "No! He shared them with a crocodile every day. Sharing made them friends.",
   "hi": "नहीं! वह रोज़ मगरमच्छ के साथ बाँटता था। बाँटने से दोस्ती हुई।"
  },
  "assignment": "rwa.stories.panchatantra"
 },
 {
  "meta": {
   "id": "explore.culture.temple_bell.01",
   "version": 1,
   "objective": {
    "en": "Learn why bells are rung and how a bell makes sound (vibration).",
    "hi": "जानना कि घंटी क्यों बजाई जाती है और घंटी से आवाज़ कैसे बनती है (कंपन)।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "explore",
   "subject": "culture",
   "topic": "sound-vibration",
   "difficulty": 2,
   "prerequisites": [],
   "provenance": "DADU original script (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "The temple bell",
   "hi": "मंदिर की घंटी"
  },
  "host": "town.temple.bell",
  "world": "discovery",
  "companion": "chikki",
  "concept": "explore.culture.vibration",
  "steps": {
   "little": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Beta, this is the temple bell. People ring it when they enter. Tung-tung-tung!",
      "hi": "बेटा, यह मंदिर की घंटी है। लोग अंदर आते समय बजाते हैं। टुन-टुन-टुन!"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "Why does it keep singing after I let go?",
      "hi": "छोड़ने के बाद भी यह क्यों गाती रहती है?"
     }
    },
    {
     "type": "dialogue",
     "who": "nandu",
     "text": {
      "en": "Maa! It is shaking! I can feel it with my nose!",
      "hi": "माँ! यह हिल रही है! मैं नाक से महसूस कर सकता हूँ!"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Dhanu is right. The bell shakes very fast. That shaking is called vibration, and it makes the sound.",
      "hi": "धनु सही है। घंटी बहुत तेज़ हिलती है। इस हिलने को कंपन कहते हैं, और इसी से आवाज़ बनती है।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Tap the bell to ring it.",
       "hi": "घंटी बजाने के लिए उसे छुओ।"
      },
      "items": [
       {
        "key": "shake",
        "label": {
         "en": "Shaking",
         "hi": "हिलना"
        },
        "ok": true,
        "icon": "shake"
       },
       {
        "key": "sun",
        "label": {
         "en": "Sunlight",
         "hi": "धूप"
        },
        "ok": false,
        "icon": "sun"
       },
       {
        "key": "water",
        "label": {
         "en": "Water",
         "hi": "पानी"
        },
        "ok": false,
        "icon": "water"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Shabash! Hear it hum? That hum is vibration.",
      "hi": "शाबाश! गूँज सुनी? वह गूँज कंपन है।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "What makes the bell's sound?",
      "hi": "घंटी की आवाज़ किससे बनती है?"
     },
     "items": [
      {
       "key": "shake",
       "label": {
        "en": "Shaking",
        "hi": "हिलना"
       },
       "ok": true,
       "icon": "shake"
      },
      {
       "key": "sun",
       "label": {
        "en": "Sunlight",
        "hi": "धूप"
       },
       "ok": false,
       "icon": "sun"
      },
      {
       "key": "water",
       "label": {
        "en": "Water",
        "hi": "पानी"
       },
       "ok": false,
       "icon": "water"
      },
      {
       "key": "leaf",
       "label": {
        "en": "Leaves",
        "hi": "पत्ते"
       },
       "ok": false,
       "icon": "leaf"
      }
     ],
     "explain": {
      "en": "Dhanu is right. The bell shakes very fast. That shaking is called vibration, and it makes the sound.",
      "hi": "धनु सही है। घंटी बहुत तेज़ हिलती है। इस हिलने को कंपन कहते हैं, और इसी से आवाज़ बनती है।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Bell shakes. Shaking makes sound.",
       "hi": "घंटी हिलती है। हिलने से आवाज़।"
      }
     ]
    }
   ],
   "explorer": [
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Temple bells are cast from panchadhatu, a five-metal alloy, so they ring with a long sustain. Tradition says the sound clears the mind before prayer. That is belief; the physics is vibration.",
      "hi": "मंदिर की घंटियाँ पंचधातु से ढाली जाती हैं, इसलिए देर तक गूँजती हैं। परंपरा कहती है कि यह ध्वनि प्रार्थना से पहले मन साफ़ करती है। वह मान्यता है; भौतिकी है कंपन।"
     }
    },
    {
     "type": "dialogue",
     "who": "chintu",
     "text": {
      "en": "Why does a bigger bell sound lower?",
      "hi": "बड़ी घंटी की आवाज़ भारी क्यों होती है?"
     }
    },
    {
     "type": "dialogue",
     "who": "chikki",
     "text": {
      "en": "Bigger bell, more mass, slower vibration, lower frequency. Fewer waves per second.",
      "hi": "बड़ी घंटी, ज़्यादा द्रव्यमान, धीमा कंपन, कम आवृत्ति। प्रति सेकंड कम तरंगें।"
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Right. Frequency is measured in hertz. A small bell may ring at 2,000 Hz; a large one near 500 Hz.",
      "hi": "सही। आवृत्ति हर्ट्ज़ में नापी जाती है। छोटी घंटी 2,000 हर्ट्ज़, बड़ी लगभग 500 हर्ट्ज़।"
     },
     "echo": true
    },
    {
     "type": "activity",
     "activity": {
      "kind": "tap-target",
      "prompt": {
       "en": "Match each bell to its sound: big to low, small to high.",
       "hi": "हर घंटी को उसकी आवाज़ से मिलाओ: बड़ी-भारी, छोटी-पतली।"
      },
      "items": [
       {
        "key": "slower",
        "label": {
         "en": "Slower, lower pitch",
         "hi": "धीमा, नीचा स्वर"
        },
        "ok": true,
        "icon": "slower"
       },
       {
        "key": "faster",
        "label": {
         "en": "Faster, higher pitch",
         "hi": "तेज़, ऊँचा स्वर"
        },
        "ok": false,
        "icon": "faster"
       },
       {
        "key": "same",
        "label": {
         "en": "The same",
         "hi": "वैसा ही"
        },
        "ok": false,
        "icon": "same"
       },
       {
        "key": "none",
        "label": {
         "en": "Not at all",
         "hi": "बिल्कुल नहीं"
        },
        "ok": false,
        "icon": "none"
       }
      ],
      "success": {
       "en": "Shabash! That is right.",
       "hi": "शाबाश! बिल्कुल सही।"
      },
      "retry": {
       "en": "Not this one. Let us look again together.",
       "hi": "यह नहीं। चलो फिर से साथ देखते हैं।"
      }
     }
    },
    {
     "type": "dialogue",
     "who": "dadaji",
     "text": {
      "en": "Correct. Remember we label this card \"tradition\" for the belief and \"science\" for the vibration.",
      "hi": "सही। याद रखो, इस कार्ड पर मान्यता के लिए \"परंपरा\" और कंपन के लिए \"विज्ञान\" का लेबल है।"
     }
    },
    {
     "type": "quiz",
     "question": {
      "en": "A bigger bell vibrates...",
      "hi": "बड़ी घंटी कंपन करती है..."
     },
     "items": [
      {
       "key": "slower",
       "label": {
        "en": "Slower, lower pitch",
        "hi": "धीमा, नीचा स्वर"
       },
       "ok": true,
       "icon": "slower"
      },
      {
       "key": "faster",
       "label": {
        "en": "Faster, higher pitch",
        "hi": "तेज़, ऊँचा स्वर"
       },
       "ok": false,
       "icon": "faster"
      },
      {
       "key": "same",
       "label": {
        "en": "The same",
        "hi": "वैसा ही"
       },
       "ok": false,
       "icon": "same"
      },
      {
       "key": "none",
       "label": {
        "en": "Not at all",
        "hi": "बिल्कुल नहीं"
       },
       "ok": false,
       "icon": "none"
      }
     ],
     "explain": {
      "en": "Right. Frequency is measured in hertz. A small bell may ring at 2,000 Hz; a large one near 500 Hz.",
      "hi": "सही। आवृत्ति हर्ट्ज़ में नापी जाती है। छोटी घंटी 2,000 हर्ट्ज़, बड़ी लगभग 500 हर्ट्ज़।"
     }
    },
    {
     "type": "echo",
     "clauses": [
      {
       "en": "Bigger bell, lower sound. Frequency in hertz.",
       "hi": "बड़ी घंटी, भारी आवाज़। आवृत्ति हर्ट्ज़ में।"
      }
     ]
    }
   ]
  },
  "simpler": {
   "en": "Dhanu is right. The bell shakes very fast. That shaking is called vibration, and it makes the sound.",
   "hi": "धनु सही है। घंटी बहुत तेज़ हिलती है। इस हिलने को कंपन कहते हैं, और इसी से आवाज़ बनती है।"
  },
  "advanced": {
   "en": "Right. Frequency is measured in hertz. A small bell may ring at 2,000 Hz; a large one near 500 Hz.",
   "hi": "सही। आवृत्ति हर्ट्ज़ में नापी जाती है। छोटी घंटी 2,000 हर्ट्ज़, बड़ी लगभग 500 हर्ट्ज़।"
  },
  "example": {
   "en": "Maa! It is shaking! I can feel it with my nose!",
   "hi": "माँ! यह हिल रही है! मैं नाक से महसूस कर सकता हूँ!"
  },
  "assignment": "rwa.culture.sound_vibration"
 }
];
export const SEED_ASSIGNMENTS: Record<string, unknown>[] = [
 {
  "meta": {
   "id": "rwa.astronomy.telescope",
   "version": 1,
   "objective": {
    "en": "Tonight, look at the Moon with an adult and draw its shape.",
    "hi": "आज रात किसी बड़े के साथ चाँद देखो और उसका आकार बनाओ।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "explore",
   "subject": "astronomy",
   "topic": "telescope",
   "difficulty": 1,
   "prerequisites": [
    "explore.astronomy.telescope.01"
   ],
   "provenance": "DADU original (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "The telescope",
   "hi": "दूरबीन"
  },
  "intro": {
   "en": "Beta, this one is for the real world. Take an adult with you.",
   "hi": "बेटा, यह असली दुनिया का काम है। किसी बड़े को साथ ले लो।"
  },
  "objective": {
   "en": "Tonight, look at the Moon with an adult and draw its shape.",
   "hi": "आज रात किसी बड़े के साथ चाँद देखो और उसका आकार बनाओ।"
  },
  "instructions": [
   {
    "en": "Tonight, look at the Moon with an adult and draw its shape.",
    "hi": "आज रात किसी बड़े के साथ चाँद देखो और उसका आकार बनाओ।"
   }
  ],
  "materials": [
   {
    "en": "What you have at home",
    "hi": "घर में जो है"
   }
  ],
  "minutes": 15,
  "supervision": "together",
  "safety": [
   {
    "en": "Stay with an adult. Wash hands after.",
    "hi": "बड़े के साथ रहो। बाद में हाथ धोओ।"
   }
  ],
  "completion": {
   "en": "A parent confirms it is done.",
   "hi": "अभिभावक पुष्टि करते हैं।"
  },
  "outcome": {
   "en": "Know that the Moon, planets and stars are far away and a telescope makes them look closer.",
   "hi": "जानना कि चाँद, ग्रह और तारे बहुत दूर हैं और दूरबीन उन्हें पास दिखाती है।"
  },
  "badge": "curious-explorer",
  "lesson": "explore.astronomy.telescope.01"
 },
 {
  "meta": {
   "id": "rwa.geography.globe",
   "version": 1,
   "objective": {
    "en": "Find India on a real map or atlas at home and show it to someone.",
    "hi": "घर के नक्शे या एटलस पर भारत ढूँढकर किसी को दिखाओ।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "academic",
   "subject": "geography",
   "topic": "globe",
   "difficulty": 1,
   "prerequisites": [
    "academic.geography.globe.01"
   ],
   "provenance": "DADU original (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "The globe",
   "hi": "ग्लोब"
  },
  "intro": {
   "en": "Beta, this one is for the real world. Take an adult with you.",
   "hi": "बेटा, यह असली दुनिया का काम है। किसी बड़े को साथ ले लो।"
  },
  "objective": {
   "en": "Find India on a real map or atlas at home and show it to someone.",
   "hi": "घर के नक्शे या एटलस पर भारत ढूँढकर किसी को दिखाओ।"
  },
  "instructions": [
   {
    "en": "Find India on a real map or atlas at home and show it to someone.",
    "hi": "घर के नक्शे या एटलस पर भारत ढूँढकर किसी को दिखाओ।"
   }
  ],
  "materials": [
   {
    "en": "What you have at home",
    "hi": "घर में जो है"
   }
  ],
  "minutes": 15,
  "supervision": "together",
  "safety": [
   {
    "en": "Stay with an adult. Wash hands after.",
    "hi": "बड़े के साथ रहो। बाद में हाथ धोओ।"
   }
  ],
  "completion": {
   "en": "A parent confirms it is done.",
   "hi": "अभिभावक पुष्टि करते हैं।"
  },
  "outcome": {
   "en": "Find India on the globe and name the continent it is in.",
   "hi": "ग्लोब पर भारत ढूँढना और उसका महाद्वीप बताना।"
  },
  "badge": "curious-explorer",
  "lesson": "academic.geography.globe.01"
 },
 {
  "meta": {
   "id": "rwa.physics.magnetism",
   "version": 1,
   "objective": {
    "en": "With an adult, test five safe objects at home with a fridge magnet.",
    "hi": "किसी बड़े के साथ फ्रिज के चुंबक से घर की पाँच सुरक्षित चीज़ें जाँचो।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "stem",
   "subject": "physics",
   "topic": "magnetism",
   "difficulty": 1,
   "prerequisites": [
    "stem.physics.magnet.01"
   ],
   "provenance": "DADU original (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "The magnet",
   "hi": "चुंबक"
  },
  "intro": {
   "en": "Beta, this one is for the real world. Take an adult with you.",
   "hi": "बेटा, यह असली दुनिया का काम है। किसी बड़े को साथ ले लो।"
  },
  "objective": {
   "en": "With an adult, test five safe objects at home with a fridge magnet.",
   "hi": "किसी बड़े के साथ फ्रिज के चुंबक से घर की पाँच सुरक्षित चीज़ें जाँचो।"
  },
  "instructions": [
   {
    "en": "With an adult, test five safe objects at home with a fridge magnet.",
    "hi": "किसी बड़े के साथ फ्रिज के चुंबक से घर की पाँच सुरक्षित चीज़ें जाँचो।"
   }
  ],
  "materials": [
   {
    "en": "What you have at home",
    "hi": "घर में जो है"
   }
  ],
  "minutes": 15,
  "supervision": "together",
  "safety": [
   {
    "en": "Stay with an adult. Wash hands after.",
    "hi": "बड़े के साथ रहो। बाद में हाथ धोओ।"
   }
  ],
  "completion": {
   "en": "A parent confirms it is done.",
   "hi": "अभिभावक पुष्टि करते हैं।"
  },
  "outcome": {
   "en": "Predict which objects a magnet attracts.",
   "hi": "अनुमान लगाना कि चुंबक किन चीज़ों को खींचता है।"
  },
  "badge": "curious-explorer",
  "lesson": "stem.physics.magnet.01"
 },
 {
  "meta": {
   "id": "rwa.hindustani.swaras",
   "version": 1,
   "objective": {
    "en": "Sing Sa Re Ga Ma Pa Dha Ni Sa to a family member tonight.",
    "hi": "आज रात घर में किसी को सा रे गा मा पा धा नी सा गाकर सुनाओ।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "music",
   "subject": "hindustani",
   "topic": "swaras",
   "difficulty": 1,
   "prerequisites": [
    "music.hindustani.swaras.01"
   ],
   "provenance": "DADU original (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "Sa Re Ga Ma",
   "hi": "सा रे गा मा"
  },
  "intro": {
   "en": "Beta, this one is for the real world. Take an adult with you.",
   "hi": "बेटा, यह असली दुनिया का काम है। किसी बड़े को साथ ले लो।"
  },
  "objective": {
   "en": "Sing Sa Re Ga Ma Pa Dha Ni Sa to a family member tonight.",
   "hi": "आज रात घर में किसी को सा रे गा मा पा धा नी सा गाकर सुनाओ।"
  },
  "instructions": [
   {
    "en": "Sing Sa Re Ga Ma Pa Dha Ni Sa to a family member tonight.",
    "hi": "आज रात घर में किसी को सा रे गा मा पा धा नी सा गाकर सुनाओ।"
   }
  ],
  "materials": [
   {
    "en": "What you have at home",
    "hi": "घर में जो है"
   }
  ],
  "minutes": 15,
  "supervision": "together",
  "safety": [
   {
    "en": "Stay with an adult. Wash hands after.",
    "hi": "बड़े के साथ रहो। बाद में हाथ धोओ।"
   }
  ],
  "completion": {
   "en": "A parent confirms it is done.",
   "hi": "अभिभावक पुष्टि करते हैं।"
  },
  "outcome": {
   "en": "Hear and sing the seven swaras in order.",
   "hi": "सात स्वरों को क्रम में सुनना और गाना।"
  },
  "badge": "curious-explorer",
  "lesson": "music.hindustani.swaras.01"
 },
 {
  "meta": {
   "id": "rwa.rangoli.patterns",
   "version": 1,
   "objective": {
    "en": "Make a small rangoli with flower petals or coloured rice at your door.",
    "hi": "अपने दरवाज़े पर फूल की पंखुड़ियों या रंगीन चावल से छोटी रंगोली बनाओ।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "art",
   "subject": "rangoli",
   "topic": "patterns",
   "difficulty": 1,
   "prerequisites": [
    "art.rangoli.patterns.01"
   ],
   "provenance": "DADU original (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "Rangoli patterns",
   "hi": "रंगोली के पैटर्न"
  },
  "intro": {
   "en": "Beta, this one is for the real world. Take an adult with you.",
   "hi": "बेटा, यह असली दुनिया का काम है। किसी बड़े को साथ ले लो।"
  },
  "objective": {
   "en": "Make a small rangoli with flower petals or coloured rice at your door.",
   "hi": "अपने दरवाज़े पर फूल की पंखुड़ियों या रंगीन चावल से छोटी रंगोली बनाओ।"
  },
  "instructions": [
   {
    "en": "Make a small rangoli with flower petals or coloured rice at your door.",
    "hi": "अपने दरवाज़े पर फूल की पंखुड़ियों या रंगीन चावल से छोटी रंगोली बनाओ।"
   }
  ],
  "materials": [
   {
    "en": "What you have at home",
    "hi": "घर में जो है"
   }
  ],
  "minutes": 15,
  "supervision": "together",
  "safety": [
   {
    "en": "Stay with an adult. Wash hands after.",
    "hi": "बड़े के साथ रहो। बाद में हाथ धोओ।"
   }
  ],
  "completion": {
   "en": "A parent confirms it is done.",
   "hi": "अभिभावक पुष्टि करते हैं।"
  },
  "outcome": {
   "en": "Continue a repeating pattern of shapes and colours.",
   "hi": "आकृतियों और रंगों का दोहराता पैटर्न आगे बढ़ाना।"
  },
  "badge": "curious-explorer",
  "lesson": "art.rangoli.patterns.01"
 },
 {
  "meta": {
   "id": "rwa.plants.parts_of_a_plant",
   "version": 1,
   "objective": {
    "en": "Water a plant at home every morning for a week with an adult and draw how it changes.",
    "hi": "एक हफ़्ते तक रोज़ सुबह किसी बड़े के साथ पौधे को पानी दो और बदलाव का चित्र बनाओ।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "nature",
   "subject": "plants",
   "topic": "parts-of-a-plant",
   "difficulty": 1,
   "prerequisites": [
    "nature.plants.tulsi.01"
   ],
   "provenance": "DADU original (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "The tulsi plant",
   "hi": "तुलसी का पौधा"
  },
  "intro": {
   "en": "Beta, this one is for the real world. Take an adult with you.",
   "hi": "बेटा, यह असली दुनिया का काम है। किसी बड़े को साथ ले लो।"
  },
  "objective": {
   "en": "Water a plant at home every morning for a week with an adult and draw how it changes.",
   "hi": "एक हफ़्ते तक रोज़ सुबह किसी बड़े के साथ पौधे को पानी दो और बदलाव का चित्र बनाओ।"
  },
  "instructions": [
   {
    "en": "Water a plant at home every morning for a week with an adult and draw how it changes.",
    "hi": "एक हफ़्ते तक रोज़ सुबह किसी बड़े के साथ पौधे को पानी दो और बदलाव का चित्र बनाओ।"
   }
  ],
  "materials": [
   {
    "en": "What you have at home",
    "hi": "घर में जो है"
   }
  ],
  "minutes": 15,
  "supervision": "together",
  "safety": [
   {
    "en": "Stay with an adult. Wash hands after.",
    "hi": "बड़े के साथ रहो। बाद में हाथ धोओ।"
   }
  ],
  "completion": {
   "en": "A parent confirms it is done.",
   "hi": "अभिभावक पुष्टि करते हैं।"
  },
  "outcome": {
   "en": "Name the parts of a plant and what it needs to grow.",
   "hi": "पौधे के भाग और उसकी ज़रूरतें बताना।"
  },
  "badge": "curious-explorer",
  "lesson": "nature.plants.tulsi.01"
 },
 {
  "meta": {
   "id": "rwa.balance.balance_beam",
   "version": 1,
   "objective": {
    "en": "Walk along a line on the floor at home, ten steps, with arms out.",
    "hi": "घर में फ़र्श की रेखा पर हाथ फैलाकर दस कदम चलो।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "sports",
   "subject": "balance",
   "topic": "balance-beam",
   "difficulty": 1,
   "prerequisites": [
    "sports.balance.beam.01"
   ],
   "provenance": "DADU original (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "Balance",
   "hi": "संतुलन"
  },
  "intro": {
   "en": "Beta, this one is for the real world. Take an adult with you.",
   "hi": "बेटा, यह असली दुनिया का काम है। किसी बड़े को साथ ले लो।"
  },
  "objective": {
   "en": "Walk along a line on the floor at home, ten steps, with arms out.",
   "hi": "घर में फ़र्श की रेखा पर हाथ फैलाकर दस कदम चलो।"
  },
  "instructions": [
   {
    "en": "Walk along a line on the floor at home, ten steps, with arms out.",
    "hi": "घर में फ़र्श की रेखा पर हाथ फैलाकर दस कदम चलो।"
   }
  ],
  "materials": [
   {
    "en": "What you have at home",
    "hi": "घर में जो है"
   }
  ],
  "minutes": 15,
  "supervision": "together",
  "safety": [
   {
    "en": "Stay with an adult. Wash hands after.",
    "hi": "बड़े के साथ रहो। बाद में हाथ धोओ।"
   }
  ],
  "completion": {
   "en": "A parent confirms it is done.",
   "hi": "अभिभावक पुष्टि करते हैं।"
  },
  "outcome": {
   "en": "Walk a line with arms out and understand why that helps balance.",
   "hi": "हाथ फैलाकर रेखा पर चलना और समझना कि इससे संतुलन क्यों बनता है।"
  },
  "badge": "curious-explorer",
  "lesson": "sports.balance.beam.01"
 },
 {
  "meta": {
   "id": "rwa.stories.panchatantra",
   "version": 1,
   "objective": {
    "en": "Tell this story to someone at home in your own words.",
    "hi": "यह कहानी घर में किसी को अपने शब्दों में सुनाओ।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "academic",
   "subject": "stories",
   "topic": "panchatantra",
   "difficulty": 1,
   "prerequisites": [
    "academic.stories.monkey_crocodile.01"
   ],
   "provenance": "DADU original (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "The Monkey and the Crocodile",
   "hi": "बंदर और मगरमच्छ"
  },
  "intro": {
   "en": "Beta, this one is for the real world. Take an adult with you.",
   "hi": "बेटा, यह असली दुनिया का काम है। किसी बड़े को साथ ले लो।"
  },
  "objective": {
   "en": "Tell this story to someone at home in your own words.",
   "hi": "यह कहानी घर में किसी को अपने शब्दों में सुनाओ।"
  },
  "instructions": [
   {
    "en": "Tell this story to someone at home in your own words.",
    "hi": "यह कहानी घर में किसी को अपने शब्दों में सुनाओ।"
   }
  ],
  "materials": [
   {
    "en": "What you have at home",
    "hi": "घर में जो है"
   }
  ],
  "minutes": 15,
  "supervision": "together",
  "safety": [
   {
    "en": "Stay with an adult. Wash hands after.",
    "hi": "बड़े के साथ रहो। बाद में हाथ धोओ।"
   }
  ],
  "completion": {
   "en": "A parent confirms it is done.",
   "hi": "अभिभावक पुष्टि करते हैं।"
  },
  "outcome": {
   "en": "Listen to a Panchatantra story and say what the monkey did cleverly.",
   "hi": "पंचतंत्र की कहानी सुनना और बताना कि बंदर ने क्या चतुराई की।"
  },
  "badge": "curious-explorer",
  "lesson": "academic.stories.monkey_crocodile.01"
 },
 {
  "meta": {
   "id": "rwa.culture.sound_vibration",
   "version": 1,
   "objective": {
    "en": "Gently tap a steel glass and a plastic cup at home and listen to the difference.",
    "hi": "घर में स्टील का गिलास और प्लास्टिक का कप हल्के से बजाकर फ़र्क सुनो।"
   },
   "bands": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5"
   ],
   "section": "explore",
   "subject": "culture",
   "topic": "sound-vibration",
   "difficulty": 1,
   "prerequisites": [
    "explore.culture.temple_bell.01"
   ],
   "provenance": "DADU original (prototype v2, ported)",
   "rights": "original",
   "languages": [
    "en",
    "hi"
   ],
   "review": "published"
  },
  "title": {
   "en": "The temple bell",
   "hi": "मंदिर की घंटी"
  },
  "intro": {
   "en": "Beta, this one is for the real world. Take an adult with you.",
   "hi": "बेटा, यह असली दुनिया का काम है। किसी बड़े को साथ ले लो।"
  },
  "objective": {
   "en": "Gently tap a steel glass and a plastic cup at home and listen to the difference.",
   "hi": "घर में स्टील का गिलास और प्लास्टिक का कप हल्के से बजाकर फ़र्क सुनो।"
  },
  "instructions": [
   {
    "en": "Gently tap a steel glass and a plastic cup at home and listen to the difference.",
    "hi": "घर में स्टील का गिलास और प्लास्टिक का कप हल्के से बजाकर फ़र्क सुनो।"
   }
  ],
  "materials": [
   {
    "en": "What you have at home",
    "hi": "घर में जो है"
   }
  ],
  "minutes": 15,
  "supervision": "together",
  "safety": [
   {
    "en": "Stay with an adult. Wash hands after.",
    "hi": "बड़े के साथ रहो। बाद में हाथ धोओ।"
   }
  ],
  "completion": {
   "en": "A parent confirms it is done.",
   "hi": "अभिभावक पुष्टि करते हैं।"
  },
  "outcome": {
   "en": "Learn why bells are rung and how a bell makes sound (vibration).",
   "hi": "जानना कि घंटी क्यों बजाई जाती है और घंटी से आवाज़ कैसे बनती है (कंपन)।"
  },
  "badge": "curious-explorer",
  "lesson": "explore.culture.temple_bell.01"
 }
];
