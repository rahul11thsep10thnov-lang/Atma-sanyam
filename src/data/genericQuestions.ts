import { Difficulty } from "@/types";

export interface GenericQuestion {
  subject: string;
  topic: string;
  difficulty: Difficulty;
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
  explanation: string;
}

// Reusable, state-agnostic question bank. These cover the common subjects
// tested across Police Constable/SI exams nationally and are combined with
// state-specific facts (see stateFacts.ts) at seed-generation time.
export const GENERIC_QUESTIONS: GenericQuestion[] = [
  // ---------- Indian Polity & Constitution ----------
  { subject: "polity", topic: "Constitution", difficulty: "easy", question: "Bharat ka samvidhan kab lagu hua tha?", options: ["15 August 1947", "26 January 1950", "26 November 1949", "2 October 1950"], correctAnswer: 1, explanation: "Bharatiya Samvidhan 26 January 1950 ko lagu hua; ismein isse 26 November 1949 ko apnaya gaya tha." },
  { subject: "polity", topic: "President", difficulty: "easy", question: "Bharat ke rashtrapati ka karyakal kitne varsh ka hota hai?", options: ["4 saal", "5 saal", "6 saal", "7 saal"], correctAnswer: 1, explanation: "Bharat ke rashtrapati ka karyakal 5 varsh ka hota hai." },
  { subject: "polity", topic: "Parliament", difficulty: "easy", question: "Bharatiya sansad ke kitne sadan (houses) hain?", options: ["1", "2", "3", "4"], correctAnswer: 1, explanation: "Bharatiya sansad ke 2 sadan hain — Lok Sabha aur Rajya Sabha." },
  { subject: "polity", topic: "Fundamental Rights", difficulty: "moderate", question: "Samvidhan ke kis anuched (article) me samta ka adhikar (Right to Equality) varnit hai?", options: ["Article 14-18", "Article 19-22", "Article 25-28", "Article 32"], correctAnswer: 0, explanation: "Article 14 se 18 tak samta ka adhikar (Right to Equality) diya gaya hai." },
  { subject: "polity", topic: "Constitution", difficulty: "moderate", question: "Samvidhan ki 'Prastavana' (Preamble) me sabse pehle kaunse shabd hain?", options: ["We, the People of India", "Bharat ek Ganrajya hai", "Sovereign Socialist Secular", "Justice, Liberty, Equality"], correctAnswer: 0, explanation: "Prastavana 'We, the People of India' (Hum, Bharat ke Log) se shuru hoti hai." },
  { subject: "polity", topic: "Judiciary", difficulty: "easy", question: "Bharat ka sarvochh nyayalay (Supreme Court) kahan sthit hai?", options: ["Mumbai", "New Delhi", "Kolkata", "Chennai"], correctAnswer: 1, explanation: "Bharat ka Supreme Court New Delhi me sthit hai." },
  { subject: "polity", topic: "Prime Minister", difficulty: "easy", question: "Bharat ke pratham Pradhan Mantri kaun the?", options: ["Jawaharlal Nehru", "Sardar Patel", "Rajendra Prasad", "Lal Bahadur Shastri"], correctAnswer: 0, explanation: "Pandit Jawaharlal Nehru Bharat ke pratham Pradhan Mantri the." },
  { subject: "polity", topic: "Fundamental Duties", difficulty: "moderate", question: "Maulik kartavya (Fundamental Duties) samvidhan me kaunse sanshodhan se joDe gaye?", options: ["42nd Amendment", "44th Amendment", "73rd Amendment", "86th Amendment"], correctAnswer: 0, explanation: "42nd Constitutional Amendment (1976) ke tahat Maulik Kartavya jode gaye." },
  { subject: "constitution", topic: "Articles", difficulty: "moderate", question: "Samvidhan ka kaunsa anuched Right to Constitutional Remedies se sambandhit hai?", options: ["Article 32", "Article 21", "Article 19", "Article 14"], correctAnswer: 0, explanation: "Article 32 ko Dr. Ambedkar ne samvidhan ki 'aatma' kaha tha, yeh Right to Constitutional Remedies deta hai." },
  { subject: "constitution", topic: "Emergency", difficulty: "moderate", question: "Rashtriya aapatkaal (National Emergency) samvidhan ke kis anuched ke tahat lagta hai?", options: ["Article 352", "Article 356", "Article 360", "Article 368"], correctAnswer: 0, explanation: "Article 352 ke tahat Rashtriya Aapatkaal lagaya jaata hai." },

  // ---------- History ----------
  { subject: "history", topic: "Freedom Movement", difficulty: "easy", question: "Bharat Chhodo Andolan (Quit India Movement) kab shuru hua?", options: ["1930", "1942", "1947", "1920"], correctAnswer: 1, explanation: "Quit India Movement 8 August 1942 ko shuru hua tha." },
  { subject: "history", topic: "Freedom Movement", difficulty: "easy", question: "'Dandi March' kisne netritva kiya tha?", options: ["Mahatma Gandhi", "Jawaharlal Nehru", "Subhash Chandra Bose", "Bal Gangadhar Tilak"], correctAnswer: 0, explanation: "1930 me Mahatma Gandhi ne Namak Satyagraha ke tahat Dandi March kiya tha." },
  { subject: "history", topic: "Freedom Movement", difficulty: "easy", question: "Bharat ko azadi kab mili?", options: ["15 August 1947", "26 January 1950", "2 October 1948", "15 August 1950"], correctAnswer: 0, explanation: "Bharat 15 August 1947 ko azad hua tha." },
  { subject: "history", topic: "Freedom Movement", difficulty: "moderate", question: "Bhartiya Rashtriya Congress ki sthapna kis varsh hui?", options: ["1857", "1885", "1905", "1920"], correctAnswer: 1, explanation: "Indian National Congress ki sthapna 1885 me A.O. Hume dwara ki gayi thi." },
  { subject: "history", topic: "Ancient India", difficulty: "moderate", question: "Ashoka kis vansh (dynasty) ke shasak the?", options: ["Maurya", "Gupta", "Kushan", "Chola"], correctAnswer: 0, explanation: "Samrat Ashoka, Maurya vansh ke shasak the." },
  { subject: "history", topic: "Freedom Movement", difficulty: "moderate", question: "1857 ke Sangram (Revolt) ko sabse pehle kahan chinha gaya tha?", options: ["Meerut", "Lucknow", "Kanpur", "Jhansi"], correctAnswer: 0, explanation: "1857 ka sangram Meerut se shuru hua maana jaata hai." },
  { subject: "history", topic: "Freedom Movement", difficulty: "easy", question: "'Jai Hind' naara kisne diya tha?", options: ["Subhash Chandra Bose", "Bhagat Singh", "Mahatma Gandhi", "Chandrashekhar Azad"], correctAnswer: 0, explanation: "Subhash Chandra Bose ne 'Jai Hind' ka naara diya tha." },
  { subject: "history", topic: "Modern India", difficulty: "moderate", question: "Jallianwala Bagh hatyakand kab hua tha?", options: ["1919", "1929", "1942", "1857"], correctAnswer: 0, explanation: "13 April 1919 ko Jallianwala Bagh hatyakand hua tha." },

  // ---------- Geography (India) ----------
  { subject: "geography", topic: "Rivers", difficulty: "easy", question: "Bharat ki sabse lambi nadi kaunsi hai?", options: ["Yamuna", "Ganga", "Godavari", "Brahmaputra"], correctAnswer: 1, explanation: "Ganga, Bharat me sabse lambi nadi hai." },
  { subject: "geography", topic: "Mountains", difficulty: "easy", question: "Bharat ki sabse unchi choti (peak) kaunsi hai?", options: ["Kangchenjunga", "Nanda Devi", "K2", "Anai Mudi"], correctAnswer: 0, explanation: "Kangchenjunga (Sikkim) Bharat ki sabse unchi choti hai (K2 Bharat ke prashasit kshetra me nahi hai)." },
  { subject: "geography", topic: "States", difficulty: "easy", question: "Bharat me kul kitne rajya hain?", options: ["26", "28", "29", "30"], correctAnswer: 1, explanation: "Bharat me vartaman me 28 rajya hain (aur 8 Kendra Shasit Pradesh)." },
  { subject: "geography", topic: "Climate", difficulty: "moderate", question: "Bharat me monsoon (varsha ritu) mukhya roop se kaunse mahine me aata hai?", options: ["March-April", "June-September", "October-November", "December-January"], correctAnswer: 1, explanation: "Bharat me Southwest Monsoon June se September tak sakriya rehta hai." },
  { subject: "geography", topic: "Physical Geography", difficulty: "moderate", question: "Thar Registan mukhya roop se kis rajya me hai?", options: ["Gujarat", "Rajasthan", "Haryana", "Punjab"], correctAnswer: 1, explanation: "Thar Registan mukhya roop se Rajasthan me hai." },
  { subject: "geography", topic: "Rivers", difficulty: "moderate", question: "Brahmaputra nadi Bharat me kis rajya se hoker behti hai?", options: ["Assam", "Kerala", "Gujarat", "Punjab"], correctAnswer: 0, explanation: "Brahmaputra nadi Assam se hoker behti hai." },

  // ---------- General Science ----------
  { subject: "science", topic: "Physics", difficulty: "easy", question: "Prakash ki gati (speed of light) lagbhag kitni hoti hai?", options: ["3 lakh km/sec", "3 lakh km/hour", "30 hazar km/sec", "3 crore km/sec"], correctAnswer: 0, explanation: "Prakash ki gati lagbhag 3,00,000 km prati second hoti hai." },
  { subject: "science", topic: "Biology", difficulty: "easy", question: "Manav sharir me sabse badi grandhi (largest gland) kaunsi hai?", options: ["Kidney", "Liver", "Pancreas", "Thyroid"], correctAnswer: 1, explanation: "Liver (yakrit) manav sharir ki sabse badi grandhi hai." },
  { subject: "science", topic: "Chemistry", difficulty: "easy", question: "Paani ka rasayanik sutra (chemical formula) kya hai?", options: ["CO2", "H2O", "NaCl", "O2"], correctAnswer: 1, explanation: "Paani ka rasayanik sutra H2O hota hai." },
  { subject: "science", topic: "Biology", difficulty: "easy", question: "Manav sharir me haddiyon (bones) ki kul sankhya kitni hoti hai (vayask me)?", options: ["186", "206", "226", "246"], correctAnswer: 1, explanation: "Ek vayask manav sharir me 206 haddiyan hoti hain." },
  { subject: "science", topic: "Physics", difficulty: "moderate", question: "SI ikai me bal (force) ko kis roop me maapte hain?", options: ["Joule", "Newton", "Watt", "Pascal"], correctAnswer: 1, explanation: "Bal (Force) ki SI ikai Newton hoti hai." },
  { subject: "science", topic: "Biology", difficulty: "moderate", question: "Photosynthesis (prakash sanshleshan) ke liye paudhon ko kya chahiye?", options: ["Sirf paani", "Sunlight, CO2 aur paani", "Sirf CO2", "Sirf mitti"], correctAnswer: 1, explanation: "Photosynthesis ke liye paudhon ko sunlight, carbon dioxide aur paani ki zaroorat hoti hai." },
  { subject: "science", topic: "Chemistry", difficulty: "moderate", question: "Sabse halka gas (lightest gas) kaunsa hai?", options: ["Oxygen", "Hydrogen", "Nitrogen", "Helium"], correctAnswer: 1, explanation: "Hydrogen sabse halka gas hai." },

  // ---------- Mathematics (easy/moderate, low-calculation) ----------
  { subject: "maths", topic: "Percentage", difficulty: "easy", question: "50 ka 20% kitna hota hai?", options: ["5", "10", "15", "20"], correctAnswer: 1, explanation: "50 ka 20% = 50 × 20/100 = 10." },
  { subject: "maths", topic: "Average", difficulty: "easy", question: "2, 4 aur 6 ka average (ausat) kya hai?", options: ["3", "4", "5", "6"], correctAnswer: 1, explanation: "Average = (2+4+6)/3 = 12/3 = 4." },
  { subject: "maths", topic: "Simplification", difficulty: "easy", question: "15 + 5 × 2 ka mान kya hoga? (BODMAS)", options: ["40", "25", "20", "35"], correctAnswer: 1, explanation: "BODMAS ke anusar pehle 5×2=10, phir 15+10=25." },
  { subject: "maths", topic: "Profit-Loss", difficulty: "easy", question: "Agar cost price ₹100 hai aur selling price ₹120 hai, to profit kitna hua?", options: ["₹10", "₹15", "₹20", "₹25"], correctAnswer: 2, explanation: "Profit = Selling Price − Cost Price = 120 − 100 = ₹20." },
  { subject: "maths", topic: "Ratio", difficulty: "moderate", question: "Agar do sankhyaon ka anupaat (ratio) 3:4 hai aur pehli sankhya 15 hai, to doosri sankhya kya hogi?", options: ["18", "20", "22", "16"], correctAnswer: 1, explanation: "3 units = 15, to 1 unit = 5; doosri sankhya = 4 units = 20." },
  { subject: "maths", topic: "Time-Speed-Distance", difficulty: "moderate", question: "Agar ek train 60 km/hr ki speed se 2 ghante chalti hai, to woh kitni doori tay karegi?", options: ["100 km", "110 km", "120 km", "130 km"], correctAnswer: 2, explanation: "Doori = Speed × Time = 60 × 2 = 120 km." },
  { subject: "maths", topic: "Simple Interest", difficulty: "moderate", question: "₹1000 par 5% varshik dar se 2 saal ka simple interest kitna hoga?", options: ["₹50", "₹100", "₹150", "₹200"], correctAnswer: 1, explanation: "SI = (P×R×T)/100 = (1000×5×2)/100 = ₹100." },
  { subject: "maths", topic: "Percentage", difficulty: "moderate", question: "Agar kisi sankhya ka 25% 50 hai, to poori sankhya kya hogi?", options: ["150", "175", "200", "225"], correctAnswer: 2, explanation: "25% = 50, to 100% = 50 × 4 = 200." },

  // ---------- Reasoning ----------
  { subject: "reasoning", topic: "Series", difficulty: "easy", question: "Is series ko poora karein: 2, 4, 6, 8, ?", options: ["9", "10", "11", "12"], correctAnswer: 1, explanation: "Yeh 2 ke gunj (multiples) ki series hai, agla number 10 hoga." },
  { subject: "reasoning", topic: "Coding-Decoding", difficulty: "easy", question: "Agar CAT ko DBU likha jaata hai, to DOG ko kaise likhenge?", options: ["EPH", "EOH", "FPH", "EPG"], correctAnswer: 0, explanation: "Har letter ko +1 kiya gaya hai: D→E, O→P, G→H, isliye DOG = EPH." },
  { subject: "reasoning", topic: "Blood Relation", difficulty: "easy", question: "Agar A, B ka bhai hai aur B, C ki beti hai, to A, C ka kya lagta hai?", options: ["Beta", "Beti", "Bhai", "Pati"], correctAnswer: 0, explanation: "A, B ka bhai hai aur B, C ki beti hai, isliye A bhi C ka beta hoga." },
  { subject: "reasoning", topic: "Direction Sense", difficulty: "easy", question: "Agar aap uttar (North) ki taraf mukh karke khade hain aur dayi (right) taraf mudte hain, to aapka mukh kis disha me hoga?", options: ["Poorv (East)", "Pashchim (West)", "Dakshin (South)", "Uttar (North)"], correctAnswer: 0, explanation: "Uttar se dayi taraf 90° mudne par mukh Poorv (East) disha me ho jaata hai." },
  { subject: "reasoning", topic: "Analogy", difficulty: "easy", question: "Kitab : Padhna :: Bhojan : ?", options: ["Khana", "Sona", "Chalna", "Dekhna"], correctAnswer: 0, explanation: "Jaise kitab ka sambandh padhne se hai, waise bhojan ka sambandh khane se hai." },
  { subject: "reasoning", topic: "Series", difficulty: "moderate", question: "Is series ko poora karein: 3, 6, 12, 24, ?", options: ["30", "36", "48", "42"], correctAnswer: 2, explanation: "Har number pichhle number se dugna hai, isliye agla number 48 hoga." },
  { subject: "reasoning", topic: "Odd One Out", difficulty: "moderate", question: "In me se odd one out chunein:", options: ["Aam", "Kela", "Aloo", "Seb"], correctAnswer: 2, explanation: "Aloo ek sabzi hai, baaki teeno phal (fruits) hain." },
  { subject: "reasoning", topic: "Coding-Decoding", difficulty: "moderate", question: "Agar 'SUN' ko '19-21-14' likha jaata hai (alphabet position), to 'SKY' ko kaise likhenge?", options: ["19-11-25", "19-12-25", "18-11-25", "19-11-24"], correctAnswer: 0, explanation: "S=19, K=11, Y=25 — alphabet position ke anusar." },

  // ---------- Hindi Vyakaran ----------
  { subject: "hindi", topic: "Sandhi", difficulty: "easy", question: "'Vidyalaya' shabd me kaunsi sandhi hai?", options: ["Vidya + Alaya", "Vidy + Alaya", "Vidya + Laya", "Vid + Yalaya"], correctAnswer: 0, explanation: "'Vidya' + 'Alaya' = 'Vidyalaya' (Dirgha sandhi)." },
  { subject: "hindi", topic: "Samas", difficulty: "easy", question: "'Rajpath' shabd me kaunsa samas hai?", options: ["Tatpurush samas", "Dwandva samas", "Bahuvrihi samas", "Karmadharaya samas"], correctAnswer: 0, explanation: "'Rajpath' (raja ka path) Tatpurush samas ka udaharan hai." },
  { subject: "hindi", topic: "Vilom Shabd", difficulty: "easy", question: "'Ujala' ka vilom shabd (opposite) kya hai?", options: ["Andhera", "Roshni", "Prakash", "Chamak"], correctAnswer: 0, explanation: "'Ujala' ka vilom (opposite) shabd 'Andhera' hai." },
  { subject: "hindi", topic: "Muhavare", difficulty: "moderate", question: "'Aankh ka tara hona' muhavare ka arth kya hai?", options: ["Bahut pyara hona", "Naraz hona", "Gussa aana", "Dukhi hona"], correctAnswer: 0, explanation: "'Aankh ka tara hona' ka arth hai — bahut pyara ya priya hona." },
  { subject: "hindi", topic: "Paryayvachi", difficulty: "moderate", question: "'Suraj' ka paryayvachi (synonym) shabd kaunsa hai?", options: ["Chandrama", "Aditya", "Tara", "Nakshatra"], correctAnswer: 1, explanation: "'Aditya' 'Suraj' (surya) ka paryayvachi shabd hai." },

  // ---------- Computer basics ----------
  { subject: "computer", topic: "Basics", difficulty: "easy", question: "CPU ka pura naam kya hai?", options: ["Central Processing Unit", "Computer Processing Unit", "Central Program Unit", "Control Processing Unit"], correctAnswer: 0, explanation: "CPU ka pura naam Central Processing Unit hai." },
  { subject: "computer", topic: "Basics", difficulty: "easy", question: "In me se konsa input device hai?", options: ["Monitor", "Printer", "Keyboard", "Speaker"], correctAnswer: 2, explanation: "Keyboard ek input device hai; monitor, printer aur speaker output devices hain." },
  { subject: "computer", topic: "Internet", difficulty: "moderate", question: "WWW ka pura naam kya hai?", options: ["World Wide Web", "World Wide Wire", "Wide World Web", "World Web Wide"], correctAnswer: 0, explanation: "WWW ka pura naam World Wide Web hai." },

  // ---------- Police / Law basics ----------
  { subject: "police-law", topic: "Basics", difficulty: "easy", question: "FIR ka pura naam kya hai?", options: ["First Information Report", "Final Investigation Report", "First Inquiry Report", "Field Incident Report"], correctAnswer: 0, explanation: "FIR ka pura naam First Information Report hai, jo kisi sangyaey apraadh (cognizable offence) ki suchna par darj hoti hai." },
  { subject: "police-law", topic: "Basics", difficulty: "moderate", question: "Bharat me naye Criminal Laws (BNS, BNSS, BSA) ne kis purane kanoon ki jagah li, jisme IPC shamil tha?", options: ["Indian Penal Code (IPC)", "Right to Information Act", "Consumer Protection Act", "Motor Vehicles Act"], correctAnswer: 0, explanation: "Bharatiya Nyaya Sanhita (BNS) ne Indian Penal Code (IPC) ki jagah li hai." },
];
