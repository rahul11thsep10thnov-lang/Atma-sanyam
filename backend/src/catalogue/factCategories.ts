// Topic categories for Did You Know? — keys are stable (facts reference them).
export const FACT_CATEGORIES = [
  { key: 'space', name: 'Space & Astronomy', icon: 'rocket', color: '#7C5CFF' },
  { key: 'animals', name: 'Animals & Wildlife', icon: 'paw', color: '#FF8A3D' },
  { key: 'senses', name: 'Human Senses & Nature', icon: 'eye', color: '#F472B6' },
  { key: 'oceans', name: 'Oceans & Marine Life', icon: 'waves', color: '#2DB7FF' },
  { key: 'dinosaurs', name: 'Dinosaurs & Prehistoric Life', icon: 'bone', color: '#A3E635' },
  { key: 'experiments', name: 'Science Experiments', icon: 'flask', color: '#00C2A8' },
  { key: 'physics', name: 'Physics & Everyday Phenomena', icon: 'zap', color: '#FACC15' },
  { key: 'plants', name: 'Plants & Forests', icon: 'leaf', color: '#4ADE80' },
  { key: 'inventions', name: 'Inventions & Discoveries', icon: 'lightbulb', color: '#FFB800' },
  { key: 'india', name: 'Indian History & Heritage', icon: 'landmark', color: '#FF6B9D' },
  { key: 'geography', name: 'Geography & Unusual Places', icon: 'globe', color: '#38BDF8' },
  { key: 'weather', name: 'Weather & Climate', icon: 'cloud', color: '#94A3B8' },
  { key: 'maths', name: 'Mathematics & Patterns', icon: 'hash', color: '#C084FC' },
  { key: 'technology', name: 'Technology & Robotics', icon: 'cpu', color: '#60A5FA' },
  { key: 'engineering', name: 'Engineering & Machines', icon: 'wrench', color: '#FB923C' },
  { key: 'food', name: 'Food & How Things Are Made', icon: 'utensils', color: '#F87171' },
  { key: 'adaptations', name: "Nature's Unusual Adaptations", icon: 'sparkles', color: '#34D399' },
  { key: 'ancient', name: 'Ancient Civilisations', icon: 'scroll', color: '#D4A574' },
  { key: 'mysteries', name: 'Puzzles, Paradoxes & Mysteries', icon: 'puzzle', color: '#A78BFA' },
] as const;

export type FactCategoryKey = (typeof FACT_CATEGORIES)[number]['key'];
export const FACT_CATEGORY_KEYS = FACT_CATEGORIES.map((c) => c.key) as [FactCategoryKey, ...FactCategoryKey[]];
