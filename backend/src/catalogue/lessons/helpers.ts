// Builders for seeded lessons. Every lesson follows the nine-step chapter
// template (objective → look & discover → understand → example → try it →
// real world → quick revision → Did You Know? → chapter challenge); the
// builders make that order impossible to get wrong and keep the content
// files readable. Curriculum mappings are seeded as pending_review: a fact
// checker verifies each one against the named syllabus document in the
// console before the app may call a lesson "aligned".
import type { CurriculumMapping, LessonStep } from '../../database/schema.js';
import type { Section } from '../learning.js';

export interface SourceRef {
  title: string;
  publisher: string;
  url: string;
  accessedOn?: string;
}

export interface LessonSeed {
  id: string;
  section: Section;
  subject: string;
  topic: string;
  subtopic?: string;
  title: string;
  summary: string;
  recommendedAge: number;
  minAge?: number;
  maxAge?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  level?: number;
  learningObjective: string;
  prerequisites?: string[];
  steps: LessonStep[];
  estimatedMinutes?: number;
  curriculum?: CurriculumMapping[];
  sources: SourceRef[];
  safetyNotes?: string[];
  adultAssisted?: boolean;
  sortOrder?: number;
}

type Visual = { kind: string; props?: Record<string, unknown> };
type Bracketed = Partial<Record<'A' | 'B' | 'C' | 'D', string>>;

export const step = {
  objective: (text: string, visual?: Visual): LessonStep => ({ kind: 'objective', title: 'Today you will learn', text, visual }),
  discover: (text: string, visual: Visual, textByBracket?: Bracketed): LessonStep => ({ kind: 'discover', title: 'Look & discover', text, visual, textByBracket }),
  understand: (text: string, points: string[], visual?: Visual, textByBracket?: Bracketed): LessonStep => ({ kind: 'understand', title: 'Understand', text, points, visual, textByBracket }),
  example: (steps: string[], visual?: Visual, text?: string): LessonStep => ({ kind: 'example', title: 'Example', text, example: { steps, visual } }),
  tryIt: (activity: Record<string, unknown>, text?: string, safety?: string): LessonStep => ({ kind: 'tryIt', title: 'Try it', text, activity, safety }),
  realWorld: (text: string, points?: string[], visual?: Visual): LessonStep => ({ kind: 'realWorld', title: 'In the real world', text, points, visual }),
  revision: (points: string[]): LessonStep => ({ kind: 'revision', title: 'Quick revision', points }),
  didYouKnow: (headline: string, body: string, source: SourceRef): LessonStep => ({ kind: 'didYouKnow', title: 'Did You Know?', fact: { headline, body, source: { title: source.title, publisher: source.publisher, url: source.url } } }),
  challenge: (questions: { question: string; options: string[]; correctIndex: number; explanation?: string }[], activity?: Record<string, unknown>): LessonStep => ({ kind: 'challenge', title: 'Chapter challenge', questions, activity }),
};

/** A curriculum mapping awaiting review (the default for everything seeded). */
export function mapping(framework: CurriculumMapping['framework'], grade: string, syllabusTopic: string, sourceRef: string, learningOutcome?: string, board?: string): CurriculumMapping {
  return { framework, grade, syllabusTopic, learningOutcome, sourceRef, verificationStatus: 'pending_review', board };
}

export const ncert = (grade: string, topic: string, outcome?: string) => mapping('ncert', grade, topic, 'NCERT textbooks and Learning Outcomes documents, https://ncert.nic.in/textbook.php', outcome);
export const cbse = (grade: string, topic: string, outcome?: string) => mapping('cbse', grade, topic, 'CBSE Academic curriculum documents, https://cbseacademic.nic.in/', outcome);
export const cisce = (grade: string, topic: string, outcome?: string) => mapping('cisce', grade, topic, 'CISCE curriculum documents, https://cisce.org/', outcome);
export const ibPyp = (grade: string, topic: string, outcome?: string) => mapping('ib_pyp', grade, topic, 'IB Primary Years Programme scope and sequence (publicly described at https://www.ibo.org/programmes/primary-years-programme/)', outcome);
export const ibMyp = (grade: string, topic: string, outcome?: string) => mapping('ib_myp', grade, topic, 'IB Middle Years Programme subject guides (publicly described at https://www.ibo.org/programmes/middle-years-programme/)', outcome);

/** Grade a child of this age is usually in, in Indian schools (Class 1 at 6). */
export const classFor = (age: number) => (age <= 5 ? (age <= 3 ? 'Nursery' : age === 4 ? 'LKG' : 'UKG') : `Class ${age - 5}`);

// Publisher pages the seeded lessons cite. Editors wrote the lessons with
// these as references; nothing is copied from them.
export const SRC = {
  ncertTextbooks: { title: 'NCERT textbooks', publisher: 'NCERT', url: 'https://ncert.nic.in/textbook.php' },
  khanMath: { title: 'Khan Academy – Math', publisher: 'Khan Academy', url: 'https://www.khanacademy.org/math' },
  bitesize: { title: 'BBC Bitesize', publisher: 'BBC', url: 'https://www.bbc.co.uk/bitesize' },
  britannicaGravity: { title: 'Gravity', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/science/gravity-physics' },
  britannicaPhotosynthesis: { title: 'Photosynthesis', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/science/photosynthesis' },
  britannicaIndus: { title: 'Indus civilization', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/place/Indus-civilization' },
  britannicaPiano: { title: 'Piano', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/art/piano' },
  britannicaTabla: { title: 'Tabla', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/art/tabla' },
  britannicaGuitar: { title: 'Guitar', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/art/guitar' },
  britannicaAtom: { title: 'Atom', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/science/atom' },
  britannicaDigestion: { title: 'Human digestive system', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/science/human-digestive-system' },
  britannicaVedic: { title: 'Vedic Mathematics (book)', publisher: 'Wikipedia (CC BY-SA)', url: 'https://en.wikipedia.org/wiki/Vedic_Mathematics' },
  usgsWaterCycle: { title: 'The Water Cycle', publisher: 'U.S. Geological Survey', url: 'https://www.usgs.gov/special-topics/water-science-school/science/water-cycle' },
  nasaSpacePlace: { title: 'NASA Space Place', publisher: 'NASA', url: 'https://spaceplace.nasa.gov/' },
  nasaMoon: { title: 'Moon: Overview', publisher: 'NASA Science', url: 'https://science.nasa.gov/moon/' },
  noaaWeather: { title: 'Weather and atmosphere education resources', publisher: 'NOAA', url: 'https://www.noaa.gov/education/resource-collections/weather-atmosphere' },
  unClimate: { title: 'What Is Climate Change?', publisher: 'United Nations', url: 'https://www.un.org/en/climatechange/what-is-climate-change' },
  whoDrowning: { title: 'Drowning – fact sheet', publisher: 'World Health Organization', url: 'https://www.who.int/news-room/fact-sheets/detail/drowning' },
  redCrossWater: { title: 'Water Safety', publisher: 'American Red Cross', url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/water-safety.html' },
  mccLaws: { title: 'The Laws of Cricket', publisher: 'Marylebone Cricket Club', url: 'https://www.lords.org/mcc/the-laws-of-cricket' },
  ifabLaws: { title: 'Laws of the Game', publisher: 'The IFAB', url: 'https://www.theifab.com/laws/latest/' },
  bwf: { title: 'Badminton World Federation', publisher: 'BWF', url: 'https://bwfbadminton.com/' },
  worldSquash: { title: 'World Squash Federation', publisher: 'World Squash', url: 'https://www.worldsquash.org/' },
  fiba: { title: 'FIBA – Official Basketball Rules', publisher: 'FIBA', url: 'https://www.fiba.basketball/' },
  fivb: { title: 'Official Volleyball Rules', publisher: 'FIVB', url: 'https://www.fivb.com/' },
  ittf: { title: 'ITTF Handbook', publisher: 'International Table Tennis Federation', url: 'https://www.ittf.com/handbook/' },
  asi: { title: 'Archaeological Survey of India', publisher: 'ASI, Ministry of Culture', url: 'https://asi.nic.in/' },
  surveyOfIndia: { title: 'Survey of India', publisher: 'Survey of India', url: 'https://surveyofindia.gov.in/' },
  cpcb: { title: 'Central Pollution Control Board', publisher: 'CPCB, Government of India', url: 'https://cpcb.nic.in/' },
  swachh: { title: 'Swachh Bharat Mission', publisher: 'Government of India', url: 'https://swachhbharatmission.gov.in/' },
  rbiFinEd: { title: 'Financial Education', publisher: 'Reserve Bank of India', url: 'https://www.rbi.org.in/FinancialEducation/Home.aspx' },
  cybercrimeIndia: { title: 'National Cyber Crime Reporting Portal – Cyber Safety Tips', publisher: 'Ministry of Home Affairs, India', url: 'https://cybercrime.gov.in/' },
  codeOrg: { title: 'Code.org', publisher: 'Code.org', url: 'https://code.org/' },
  scratch: { title: 'Scratch – Imagine, Program, Share', publisher: 'MIT Media Lab', url: 'https://scratch.mit.edu/' },
  natGeoKids: { title: 'National Geographic Kids', publisher: 'National Geographic', url: 'https://kids.nationalgeographic.com/' },
  smithsonian: { title: 'Smithsonian Institution', publisher: 'Smithsonian', url: 'https://www.si.edu/' },
  isro: { title: 'Indian Space Research Organisation', publisher: 'ISRO', url: 'https://www.isro.gov.in/' },
  openMusicTheory: { title: 'Open Music Theory', publisher: 'Open Music Theory (CC BY-SA)', url: 'https://viva.pressbooks.pub/openmusictheory/' },
  wikiTeentaal: { title: 'Teentaal', publisher: 'Wikipedia (CC BY-SA)', url: 'https://en.wikipedia.org/wiki/Teentaal' },
  wikiHindiAlphabet: { title: 'Devanagari', publisher: 'Wikipedia (CC BY-SA)', url: 'https://en.wikipedia.org/wiki/Devanagari' },
  wikiBansuri: { title: 'Bansuri', publisher: 'Wikipedia (CC BY-SA)', url: 'https://en.wikipedia.org/wiki/Bansuri' },
  britannicaBrahmagupta: { title: 'Brahmagupta', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/biography/Brahmagupta' },
  britannicaHoneybee: { title: 'Honeybee', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/animal/honeybee' },
  britannicaNumerals: { title: 'Hindu-Arabic numerals', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/topic/Hindu-Arabic-numerals' },
  britannicaAlgebra: { title: 'Algebra', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/science/algebra' },
  wikiShakuntala: { title: 'Shakuntala Devi', publisher: 'Wikipedia (CC BY-SA)', url: 'https://en.wikipedia.org/wiki/Shakuntala_Devi' },
  britannicaMagnet: { title: 'Magnet', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/science/magnet' },
  britannicaArchimedes: { title: 'Archimedes', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/biography/Archimedes' },
  usgsWaterSchool: { title: 'Water Science School', publisher: 'U.S. Geological Survey', url: 'https://www.usgs.gov/special-topics/water-science-school' },
  usgsHowMuchWater: { title: 'How Much Water is There on Earth?', publisher: 'U.S. Geological Survey', url: 'https://www.usgs.gov/special-topics/water-science-school/science/how-much-water-there-earth' },
  noaaSalty: { title: 'Why is the ocean salty?', publisher: 'NOAA National Ocean Service', url: 'https://oceanservice.noaa.gov/facts/whysalty.html' },
  noaaOceans: { title: 'How many oceans are there?', publisher: 'NOAA National Ocean Service', url: 'https://oceanservice.noaa.gov/facts/howmanyoceans.html' },
  unescoBhimbetka: { title: 'Rock Shelters of Bhimbetka', publisher: 'UNESCO World Heritage Centre', url: 'https://whc.unesco.org/en/list/925/' },
  britannicaAshoka: { title: 'Ashoka', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/biography/Ashoka' },
  britannicaGanges: { title: 'Ganges River', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/place/Ganges-River' },
  britannicaEngelbart: { title: 'Douglas Engelbart', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/biography/Douglas-Engelbart' },
  britannicaAlgorithm: { title: 'Algorithm', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/science/algorithm' },
  britannicaFibonacci: { title: 'Fibonacci sequence', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/science/Fibonacci-number' },
  britannicaPlant: { title: 'Plant', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/plant/plant' },
  britannicaCricket: { title: 'Cricket (sport)', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/sports/cricket-sport' },
  britannicaFootball: { title: 'Football (soccer)', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/sports/football-soccer' },
  britannicaBadminton: { title: 'Badminton', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/sports/badminton' },
  britannicaSquash: { title: 'Squash rackets', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/sports/squash-rackets' },
  britannicaBasketball: { title: 'Basketball', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/sports/basketball' },
  britannicaVolleyball: { title: 'Volleyball', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/sports/volleyball' },
  britannicaTableTennis: { title: 'Table tennis', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/sports/table-tennis' },
  britannicaSwimming: { title: 'Swimming', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/sports/swimming-sport' },
  britannicaMetronome: { title: 'Metronome', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/art/metronome' },
} satisfies Record<string, SourceRef>;

/** Validates the template; called by the seed so a broken seed fails loudly. */
export function assertTemplate(l: LessonSeed): void {
  const order = ['objective', 'discover', 'understand', 'example', 'tryIt', 'realWorld', 'revision', 'didYouKnow', 'challenge'];
  const kinds = l.steps.map((s) => s.kind);
  if (kinds.join() !== order.join()) throw new Error(`Lesson ${l.id} does not follow the chapter template: ${kinds.join(' → ')}`);
  const dyk = l.steps[7]!;
  if (!dyk.fact?.source.url) throw new Error(`Lesson ${l.id}: Did You Know? needs a sourced fact`);
  if (!l.steps[4]!.activity) throw new Error(`Lesson ${l.id}: Try It needs an activity`);
  if (!(l.steps[8]!.questions?.length || l.steps[8]!.activity)) throw new Error(`Lesson ${l.id}: the challenge needs questions`);
  if (l.sources.length === 0) throw new Error(`Lesson ${l.id} needs a source`);
  if (l.recommendedAge < 3 || l.recommendedAge > 12) throw new Error(`Lesson ${l.id}: age out of range`);
}
