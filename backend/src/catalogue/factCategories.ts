// Topic categories for Did You Know? — keys are stable (facts reference them).
export const FACT_CATEGORIES = [
  { key: 'space', name: 'Space & Astronomy', icon: 'rocket', color: '#7C5CFF' },
  { key: 'animals', name: 'Animals & Wildlife', icon: 'paw', color: '#FF8A3D' },
  { key: 'senses', name: 'Human Body, Senses & Healthy Habits', icon: 'eye', color: '#F472B6' },
  { key: 'oceans', name: 'Oceans & Marine Life', icon: 'waves', color: '#2DB7FF' },
  { key: 'dinosaurs', name: 'Dinosaurs & Prehistoric Life', icon: 'bone', color: '#A3E635' },
  { key: 'experiments', name: 'Science Experiments', icon: 'flask', color: '#00C2A8' },
  { key: 'physics', name: 'Physics & Everyday Phenomena', icon: 'zap', color: '#FACC15' },
  { key: 'plants', name: 'Plants & Forests', icon: 'leaf', color: '#4ADE80' },
  { key: 'inventions', name: 'Inventions & Discoveries', icon: 'lightbulb', color: '#FFB800' },
  { key: 'india', name: 'Indian History & Heritage', icon: 'landmark', color: '#FF6B9D' },
  { key: 'geography', name: 'Geography & Unusual Places', icon: 'globe', color: '#38BDF8' },
  { key: 'weather', name: 'Weather, Environment & Climate', icon: 'cloud', color: '#94A3B8' },
  { key: 'maths', name: 'Mathematics & Patterns', icon: 'hash', color: '#C084FC' },
  { key: 'technology', name: 'Technology & Robotics', icon: 'cpu', color: '#60A5FA' },
  { key: 'engineering', name: 'Engineering & Machines', icon: 'wrench', color: '#FB923C' },
  { key: 'food', name: 'Food & How Things Are Made', icon: 'utensils', color: '#F87171' },
  { key: 'adaptations', name: "Nature's Unusual Adaptations", icon: 'sparkles', color: '#34D399' },
  { key: 'ancient', name: 'Ancient Civilisations', icon: 'scroll', color: '#D4A574' },
  { key: 'mysteries', name: 'Puzzles, Paradoxes & Mysteries', icon: 'puzzle', color: '#A78BFA' },
  { key: 'arts', name: 'Art, Music & Literature', icon: 'palette', color: '#F59E0B' },
  { key: 'general', name: 'General Knowledge', icon: 'book', color: '#64748B' },
] as const;

export type FactCategoryKey = (typeof FACT_CATEGORIES)[number]['key'];
export const FACT_CATEGORY_KEYS = FACT_CATEGORIES.map((c) => c.key) as [FactCategoryKey, ...FactCategoryKey[]];

// The fifteen topics the fact pipeline is organised around, and the category
// each one is filed under. (Several topics share a category on purpose: the
// category list is what children browse, the topic list is what we ingest.)
export const FACT_TOPICS: { key: string; name: string; category: FactCategoryKey }[] = [
  { key: 'animals_wildlife', name: 'Animals and wildlife', category: 'animals' },
  { key: 'plants_flowers', name: 'Plants and flowers', category: 'plants' },
  { key: 'space_astronomy', name: 'Space and astronomy', category: 'space' },
  { key: 'science_inventions', name: 'Science and inventions', category: 'inventions' },
  { key: 'maths_logic', name: 'Mathematics and logic', category: 'maths' },
  { key: 'geography_countries', name: 'Geography and countries', category: 'geography' },
  { key: 'indian_history_culture', name: 'Indian history and culture', category: 'india' },
  { key: 'human_body_health', name: 'Human body and healthy habits', category: 'senses' },
  { key: 'environment_climate', name: 'Environment and climate', category: 'weather' },
  { key: 'oceans_marine', name: 'Oceans and marine life', category: 'oceans' },
  { key: 'technology_computers', name: 'Technology and computers', category: 'technology' },
  { key: 'food_nutrition', name: 'Food and nutrition', category: 'food' },
  { key: 'art_music_literature', name: 'Art, music, and literature', category: 'arts' },
  { key: 'general_knowledge', name: 'General knowledge', category: 'general' },
  { key: 'critical_thinking', name: 'Age-appropriate critical thinking', category: 'mysteries' },
];
