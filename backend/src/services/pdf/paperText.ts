// Printed-paper wording in the test's language. Kept in step with the
// console's print view (admin/src/app/(console)/mock-tests/[id]/print).

export interface PaperText {
  paper: string;
  key: string;
  time: string;
  minutes: string;
  maxMarks: string;
  questions: string;
  marking: string;
  correct: (m: string) => string;
  wrong: (n: string | null) => string;
  name: string;
  roll: string;
  date: string;
  instructionsTitle: string;
  instructions: (q: number, m: string) => string[];
  section: string;
  ans: string;
  solutions: string;
  staffCopy: string;
  endOfPaper: string;
  page: (n: number, of: number) => string;
}

const en: PaperText = {
  paper: 'Question Paper',
  key: 'Answer Key & Solutions',
  time: 'Time allowed',
  minutes: 'minutes',
  maxMarks: 'Maximum marks',
  questions: 'Questions',
  marking: 'Marking',
  correct: (m) => `+${m} for each correct answer`,
  wrong: (n) => (n ? `−${n} for each wrong answer` : 'no negative marking'),
  name: 'Name',
  roll: 'Roll no.',
  date: 'Date',
  instructionsTitle: 'Instructions',
  instructions: (q, m) => [
    `This paper has ${q} questions. Each question has four options; exactly one is correct.`,
    'Choose the best answer and mark it clearly on the answer sheet.',
    'Unattempted questions carry no marks.',
    'Use of calculators, phones or books is not allowed.',
    `The paper carries a total of ${m} marks.`,
  ],
  section: 'Section',
  ans: 'Ans',
  solutions: 'Solutions',
  staffCopy: 'STAFF COPY — DO NOT GIVE TO CANDIDATES',
  endOfPaper: '— End of paper —',
  page: (n, of) => `Page ${n} of ${of}`,
};

const hiLatn: PaperText = {
  ...en,
  key: 'Answer Key aur Solutions',
  time: 'Samay',
  minutes: 'minute',
  maxMarks: 'Poorna ank',
  questions: 'Prashn',
  correct: (m) => `Har sahi uttar par +${m}`,
  wrong: (n) => (n ? `Har galat uttar par −${n}` : 'Negative marking nahi'),
  name: 'Naam',
  date: 'Tarikh',
  instructionsTitle: 'Nirdesh',
  instructions: (q, m) => [
    `Is paper mein ${q} prashn hain. Har prashn ke chaar vikalp hain; sirf ek sahi hai.`,
    'Sabse uchit uttar chunkar answer sheet par saaf nishaan lagayein.',
    'Chhode gaye prashnon ke ank nahi milte.',
    'Calculator, phone ya kitab ka upyog mana hai.',
    `Paper ke kul ank ${m} hain.`,
  ],
  ans: 'Uttar',
  staffCopy: 'STAFF COPY — CANDIDATES KO NA DEIN',
  endOfPaper: '— Paper samaapt —',
  page: (n, of) => `Page ${n} / ${of}`,
};

const hi: PaperText = {
  paper: 'प्रश्न-पत्र',
  key: 'उत्तर-कुंजी एवं हल',
  time: 'समय',
  minutes: 'मिनट',
  maxMarks: 'पूर्णांक',
  questions: 'प्रश्न',
  marking: 'अंकन',
  correct: (m) => `प्रत्येक सही उत्तर के +${m} अंक`,
  wrong: (n) => (n ? `प्रत्येक गलत उत्तर के −${n} अंक` : 'ऋणात्मक अंकन नहीं'),
  name: 'नाम',
  roll: 'अनुक्रमांक',
  date: 'दिनांक',
  instructionsTitle: 'निर्देश',
  instructions: (q, m) => [
    `इस प्रश्न-पत्र में ${q} प्रश्न हैं। प्रत्येक प्रश्न के चार विकल्प हैं, जिनमें से केवल एक सही है।`,
    'सबसे उपयुक्त उत्तर चुनकर उत्तर-पत्रक पर स्पष्ट चिह्न लगाइए।',
    'अनुत्तरित प्रश्नों के कोई अंक नहीं मिलेंगे।',
    'कैलकुलेटर, मोबाइल या पुस्तक का प्रयोग वर्जित है।',
    `प्रश्न-पत्र कुल ${m} अंक का है।`,
  ],
  section: 'खंड',
  ans: 'उत्तर',
  solutions: 'हल',
  staffCopy: 'केवल स्टाफ़ के लिए — परीक्षार्थियों को न दें',
  endOfPaper: '— प्रश्न-पत्र समाप्त —',
  page: (n, of) => `पृष्ठ ${n} / ${of}`,
};

const TEXT: Record<string, PaperText> = { en, 'hi-Latn': hiLatn, hi };

export function paperText(language: string): PaperText {
  return TEXT[language] ?? en;
}
