// The learning academy catalogue: three sections, their subjects (academic
// subjects, instruments, sports) and the age framework. Lessons live in the
// database (seeded from catalogue/lessons/*.ts, authored in the console);
// this file decides how subjects are grouped, named and labelled.

export type Section = 'study' | 'music' | 'sports';
export type SubjectKind = 'academic' | 'instrument' | 'sport';

export interface SubjectDef {
  key: string;
  section: Section;
  kind: SubjectKind;
  name: string;
  emoji: string;
  color: string;
  description: string;
  /** Ages the subject is offered for (lessons may still exist outside this range). */
  ages: [number, number];
  topics: string[];
  safety?: string[];
  adultAssistedBelowAge?: number;
  sortOrder: number;
}

export const AGES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const bracketForAge = (age: number): 'A' | 'B' | 'C' | 'D' => (age <= 5 ? 'A' : age <= 8 ? 'B' : age <= 10 ? 'C' : 'D');
export const AGE_FOCUS: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: 'Recognition, listening, observation, movement, first words and numbers, rhythms and sounds. Very short, picture-led lessons for learning together with a grown-up.',
  B: 'Foundations: simple explanations, reading and numeracy, early scientific reasoning, basic instrument skills and fundamental sports movements, guided experiments.',
  C: 'Deeper understanding: step-by-step problem solving, richer diagrams, structured instrument practice, sport-specific technique, simple investigations and first coding ideas.',
  D: 'Detail and reasoning: multi-step problems, applied maths, scientific models, interpreting history, geography and environmental systems, structured music practice, advanced technique, independent projects.',
};

export const SECTIONS: { key: Section; name: string; emoji: string; color: string; tagline: string }[] = [
  { key: 'study', name: 'Study Playfully', emoji: '📚', color: '#7C5CFF', tagline: 'Maths, science, history, geography and more — explained with pictures and play.' },
  { key: 'music', name: 'Music', emoji: '🎹', color: '#FF6B9D', tagline: 'Piano, tabla, guitar and more, one small step at a time.' },
  { key: 'sports', name: 'Sports', emoji: '🏏', color: '#7ED957', tagline: 'Rules, techniques, fitness and fair play for eight sports.' },
];

export const SUBJECTS: SubjectDef[] = [
  // ---- Study Playfully ---------------------------------------------------
  { key: 'maths', section: 'study', kind: 'academic', name: 'Mathematics', emoji: '🔢', color: '#4FB3FF', description: 'Counting, numbers, shapes, fractions, measuring, patterns and puzzles.', ages: [3, 12], topics: ['Counting', 'Number recognition', 'Place value', 'Addition and subtraction', 'Multiplication and division', 'Fractions', 'Decimals', 'Percentages', 'Patterns', 'Measurement', 'Time', 'Money', 'Shapes', 'Geometry', 'Perimeter and area', 'Angles', 'Symmetry', 'Coordinates', 'Ratios and proportions', 'Integers', 'Introductory algebra', 'Data handling', 'Graphs', 'Logical reasoning', 'Mathematical puzzles', 'Real-life mathematics'], sortOrder: 1 },
  { key: 'vedic-maths', section: 'study', kind: 'academic', name: 'Vedic Maths', emoji: '🧮', color: '#FF8A3D', description: 'Mental calculation tricks that build on ordinary arithmetic.', ages: [7, 12], topics: ['Number sense', 'Mental addition', 'Mental subtraction', 'Multiplication strategies', 'Multiplying by numbers ending in zero', 'Multiplication patterns', 'Squares of suitable numbers', 'Divisibility patterns', 'Complements', 'Estimation', 'Mental arithmetic challenges'], sortOrder: 2 },
  { key: 'physics', section: 'study', kind: 'academic', name: 'Physics', emoji: '⚡', color: '#FFC93C', description: 'Pushes, pulls, gravity, light, sound, heat, magnets and machines.', ages: [4, 12], topics: ['Motion', 'Push and pull', 'Forces', 'Gravity', 'Friction', 'Energy', 'Light', 'Shadows', 'Sound', 'Heat', 'Magnets', 'Electricity fundamentals', 'Simple machines', 'Floating and sinking', 'Pressure', 'States of matter', 'Waves', 'Speed and distance', 'Basic mechanics', 'Scientific observation'], sortOrder: 3 },
  { key: 'chemistry', section: 'study', kind: 'academic', name: 'Chemistry', emoji: '🧪', color: '#4FD1C5', description: 'Materials, mixing, changes, water, air, atoms and everyday chemistry.', ages: [5, 12], topics: ['Materials around us', 'Solids, liquids and gases', 'Properties of materials', 'Mixing and separating', 'Reversible and irreversible changes', 'Water', 'Air', 'Mixtures', 'Elements and compounds', 'Atoms and molecules', 'Acids and bases', 'Chemical reactions', 'Everyday chemistry', 'Environmental chemistry'], safety: ['Never mix household chemicals, use flames or taste anything in an experiment. Every experiment in LoJi is safe to do with water, paper and kitchen items under a grown-up\'s eye.'], adultAssistedBelowAge: 9, sortOrder: 4 },
  { key: 'biology', section: 'study', kind: 'academic', name: 'Biology', emoji: '🌱', color: '#7ED957', description: 'Living things, plants, animals, habitats and the human body.', ages: [3, 12], topics: ['Living and non-living', 'Plants', 'Animals', 'Habitats', 'Food chains', 'Human body systems', 'Digestion', 'Respiration', 'Circulation', 'Senses', 'Nutrition', 'Microorganisms', 'Plant reproduction', 'Cells', 'Ecosystems', 'Adaptations', 'Biodiversity', 'Genetics fundamentals'], sortOrder: 5 },
  { key: 'environment', section: 'study', kind: 'academic', name: 'Environment', emoji: '🌍', color: '#34D399', description: 'Air, water, soil, forests, weather, recycling and caring for our planet.', ages: [3, 12], topics: ['Air, water and soil', 'Forests', 'Wildlife', 'Food chains', 'Ecosystems', 'Weather', 'Climate', 'Seasons', 'Natural resources', 'Water conservation', 'Waste segregation', 'Recycling', 'Renewable energy', 'Pollution', 'Biodiversity', 'Sustainable living', 'Climate change', 'Environmental protection', 'Indian ecosystems', 'Conservation efforts'], sortOrder: 6 },
  { key: 'history', section: 'study', kind: 'academic', name: 'History', emoji: '🏺', color: '#D4A574', description: 'Timelines, ancient India, civilisations, inventions and heritage.', ages: [5, 12], topics: ['Family and community history', 'Timelines', 'Ancient civilisations', 'Archaeology', 'Early human societies', 'Ancient India', 'Indus Valley civilisation', 'Ancient Indian kingdoms', 'Major periods', 'Medieval India', 'Modern Indian history', 'Important inventions', 'Historical figures', 'World civilisations', 'Cultural heritage', 'Monuments', 'Primary and secondary sources', 'Chronology and evidence'], sortOrder: 7 },
  { key: 'geography', section: 'study', kind: 'academic', name: 'Geography', emoji: '🗺️', color: '#38BDF8', description: 'Directions, maps, continents, rivers, mountains, weather and India.', ages: [3, 12], topics: ['Directions', 'Maps', 'Continents and oceans', 'Countries and capitals', 'Landforms', 'Rivers', 'Mountains', 'Deserts', 'Forests', 'Weather and climate', 'Natural resources', 'Population and settlements', 'Agriculture', 'Transport', 'Indian states and union territories', 'Indian physical geography', 'World geography', 'Latitude and longitude', 'Map scales', 'Ecosystems', 'Natural hazards', 'Human-environment relationships'], sortOrder: 8 },
  { key: 'computers', section: 'study', kind: 'academic', name: 'Computer Studies', emoji: '💻', color: '#60A5FA', description: 'Computer parts, safe internet use, algorithms, coding and robots.', ages: [4, 12], topics: ['Computer parts', 'Input and output', 'Hardware and software', 'Operating systems', 'Files and folders', 'Keyboard and mouse', 'Touchscreens', 'Digital literacy', 'Safe internet use', 'Privacy and passwords', 'Suspicious messages', 'Typing', 'Algorithms', 'Sequencing', 'Block coding', 'Programming concepts', 'Variables and conditions', 'Loops', 'Debugging', 'Data', 'Networks', 'Robotics', 'Artificial intelligence', 'Responsible use'], sortOrder: 9 },
  { key: 'english', section: 'study', kind: 'academic', name: 'English', emoji: '🔤', color: '#C084FC', description: 'Letters, words, reading, grammar, spelling and story writing.', ages: [3, 12], topics: ['Letters and sounds', 'Vocabulary', 'Reading comprehension', 'Grammar', 'Spelling', 'Creative writing', 'Communication'], sortOrder: 10 },
  { key: 'hindi', section: 'study', kind: 'academic', name: 'Hindi', emoji: '🪔', color: '#F87171', description: 'वर्ण, शब्द, वाक्य और कहानियाँ।', ages: [3, 12], topics: ['Varnamala', 'Matras', 'Words', 'Sentences', 'Reading', 'Stories'], sortOrder: 11 },
  { key: 'general-knowledge', section: 'study', kind: 'academic', name: 'General Knowledge', emoji: '💡', color: '#FFB800', description: 'India, the world, civics, money sense and everyday know-how.', ages: [4, 12], topics: ['India', 'The world', 'Civics and citizenship', 'Financial literacy', 'Everyday knowledge'], sortOrder: 12 },
  { key: 'thinking', section: 'study', kind: 'academic', name: 'Thinking Skills', emoji: '🧩', color: '#A78BFA', description: 'Logic, critical thinking, problem solving and communication.', ages: [5, 12], topics: ['Logical reasoning', 'Critical thinking', 'Problem solving', 'Communication'], sortOrder: 13 },
  // ---- Music -------------------------------------------------------------
  { key: 'piano', section: 'music', kind: 'instrument', name: 'Piano & Keyboard', emoji: '🎹', color: '#2E2A4A', description: 'From high and low sounds to two-hand pieces and chords.', ages: [3, 12], topics: ['High and low', 'Groups of keys', 'Rhythm', 'Finger numbers', 'Hand placement', 'Simple melodies', 'Steady beat', 'Note reading', 'Scales', 'Hands together', 'Notation', 'Chords', 'Phrasing', 'Repertoire', 'Practice routines'], adultAssistedBelowAge: 6, sortOrder: 1 },
  { key: 'tabla', section: 'music', kind: 'instrument', name: 'Tabla', emoji: '🥁', color: '#FF8A3D', description: 'Rhythm, bols, posture and thekas, step by step.', ages: [3, 12], topics: ['Percussion sounds', 'Clapping rhythms', 'Parts of the tabla', 'Sitting posture', 'Basic bols', 'Beginner patterns', 'Simple thekas', 'Rhythmic cycles', 'Hand technique', 'Compositions', 'Variations'], adultAssistedBelowAge: 7, safety: ['The tabla is heavy: a grown-up should carry and place it. Play with relaxed hands and stop if your hands hurt.'], sortOrder: 2 },
  { key: 'guitar', section: 'music', kind: 'instrument', name: 'Guitar', emoji: '🎸', color: '#D4A574', description: 'Strings, posture, strumming, first chords and songs.', ages: [3, 12], topics: ['String sounds', 'Parts of the guitar', 'Safe handling', 'Posture', 'Strumming', 'String names', 'First chords', 'Rhythm patterns', 'Simple melodies', 'Chord changes', 'Strumming variations', 'Scales', 'Timing', 'Chord progressions', 'Picking patterns', 'Songs'], adultAssistedBelowAge: 7, safety: ['Use a guitar that fits: a 1/2 or 3/4 size for small hands. Tuning changes string tension; a grown-up should tune and check for sharp string ends.'], sortOrder: 3 },
  { key: 'drums', section: 'music', kind: 'instrument', name: 'Drums & Percussion', emoji: '🪘', color: '#F59E0B', description: 'Beat, tempo and simple patterns on drums and hand percussion.', ages: [3, 12], topics: ['Steady beat', 'Loud and soft', 'Simple patterns', 'Drum kit parts', 'Coordination'], sortOrder: 4 },
  { key: 'flute', section: 'music', kind: 'instrument', name: 'Flute (Bansuri)', emoji: '🎶', color: '#4FD1C5', description: 'Breath, holes, first notes and simple tunes.', ages: [6, 12], topics: ['Breathing', 'Holding the flute', 'First notes', 'Simple tunes'], sortOrder: 5 },
  { key: 'violin', section: 'music', kind: 'instrument', name: 'Violin', emoji: '🎻', color: '#9B6BFF', description: 'Posture, bow hold, open strings and first melodies.', ages: [5, 12], topics: ['Posture', 'Bow hold', 'Open strings', 'First melodies'], sortOrder: 6 },
  // ---- Sports ------------------------------------------------------------
  { key: 'cricket', section: 'sports', kind: 'sport', name: 'Cricket', emoji: '🏏', color: '#7ED957', description: 'Batting, bowling, fielding, rules and team play.', ages: [4, 12], topics: ['Introduction', 'Equipment', 'Field positions', 'Basic rules', 'Batting stance', 'Grip', 'Defensive and attacking shots', 'Bowling', 'Fielding', 'Catching', 'Throwing', 'Wicketkeeping', 'Scoring', 'Overs and wickets', 'Team strategy'], safety: ['A hard cricket ball needs a helmet, pads and gloves. Younger children practise with a soft ball.'], sortOrder: 1 },
  { key: 'football', section: 'sports', kind: 'sport', name: 'Football', emoji: '⚽', color: '#4FB3FF', description: 'Ball control, passing, dribbling, shooting, positions and rules.', ages: [4, 12], topics: ['Ball control', 'Passing', 'Dribbling', 'Shooting', 'First touch', 'Goalkeeping', 'Positioning', 'Formations', 'Rules', 'Offside', 'Teamwork', 'Warm-ups'], sortOrder: 2 },
  { key: 'badminton', section: 'sports', kind: 'sport', name: 'Badminton', emoji: '🏸', color: '#FF6B9D', description: 'Grip, footwork, serves, clears, drops and smashes.', ages: [5, 12], topics: ['Court layout', 'Grip', 'Ready position', 'Footwork', 'Serve', 'Clear', 'Drop shot', 'Smash', 'Net play', 'Scoring', 'Singles and doubles', 'Placement'], sortOrder: 3 },
  { key: 'squash', section: 'sports', kind: 'sport', name: 'Squash', emoji: '🎾', color: '#FFC93C', description: 'Court, safety, grip, forehand, backhand, serves and rallies.', ages: [7, 12], topics: ['Court layout', 'Equipment', 'Safety', 'Grip', 'Ready position', 'Forehand and backhand', 'Movement', 'Service', 'Positioning', 'Rallies', 'Rules and scoring'], safety: ['Always wear protective eyewear in a squash court. Two players share a small space: call "let" and stop if someone is in the way. Play only with a grown-up or coach present.'], sortOrder: 4 },
  { key: 'basketball', section: 'sports', kind: 'sport', name: 'Basketball', emoji: '🏀', color: '#FF8A3D', description: 'Dribbling, passing, shooting, layups, defence and teamwork.', ages: [5, 12], topics: ['Ball handling', 'Dribbling', 'Passing', 'Shooting', 'Layups', 'Rebounding', 'Defensive stance', 'Positions', 'Rules', 'Teamwork', 'Tactics'], sortOrder: 5 },
  { key: 'volleyball', section: 'sports', kind: 'sport', name: 'Volleyball', emoji: '🏐', color: '#A78BFA', description: 'Passing, setting, serving, rotation and safe jumping.', ages: [6, 12], topics: ['Court layout', 'Ready position', 'Forearm pass', 'Setting', 'Serving', 'Movement', 'Rotation', 'Rules', 'Safe jumping and landing', 'Coordination'], sortOrder: 6 },
  { key: 'table-tennis', section: 'sports', kind: 'sport', name: 'Table Tennis', emoji: '🏓', color: '#4FD1C5', description: 'Grip, stance, forehand, backhand, serves, spin and scoring.', ages: [5, 12], topics: ['Bat and table', 'Grip', 'Ready stance', 'Forehand', 'Backhand', 'Service', 'Returning serves', 'Spin', 'Footwork', 'Scoring', 'Etiquette'], sortOrder: 7 },
  { key: 'swimming', section: 'sports', kind: 'sport', name: 'Swimming', emoji: '🏊', color: '#38BDF8', description: 'Water safety first, then floating, breathing and stroke basics.', ages: [3, 12], topics: ['Water safety', 'Pool rules', 'Depth and supervision', 'Floating', 'Breathing', 'Body position', 'Stroke demonstrations', 'Pool behaviour', 'Vocabulary'], safety: ['These lessons explain ideas only. Nobody learns to swim from a screen: real swimming needs a qualified instructor, a grown-up watching at all times and proper water-safety rules. Never practise in water without supervision.'], adultAssistedBelowAge: 13, sortOrder: 8 },
];

export const SUBJECT_BY_KEY = new Map(SUBJECTS.map((s) => [s.key, s]));

export const CURRICULUM_FRAMEWORKS = [
  { key: 'ncert', name: 'NCERT', description: 'National Council of Educational Research and Training textbooks and learning outcomes.' },
  { key: 'cbse', name: 'CBSE', description: 'Central Board of Secondary Education (follows NCERT textbooks).' },
  { key: 'cisce', name: 'CISCE (ICSE / ISC)', description: 'Council for the Indian School Certificate Examinations.' },
  { key: 'state', name: 'State board', description: 'A state education board (name it in the console).' },
  { key: 'ib_pyp', name: 'IB Primary Years Programme', description: 'Inquiry-led transdisciplinary learning for ages 3–12.' },
  { key: 'ib_myp', name: 'IB Middle Years Programme', description: 'Concept-driven learning from age 11 (MYP year 1).' },
] as const;
