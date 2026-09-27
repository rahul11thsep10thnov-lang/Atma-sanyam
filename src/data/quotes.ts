import { Quote } from '../types';

export const QUOTES: Quote[] = [
  {
    id: 'q1',
    text: 'The successful warrior is the average man, with laser-like focus.',
    author: 'Bruce Lee',
  },
  {
    id: 'q2',
    text: 'Where focus goes, energy flows.',
    author: 'Tony Robbins',
  },
  {
    id: 'q3',
    text: 'Concentrate all your thoughts upon the work at hand.',
    author: 'Alexander Graham Bell',
  },
  {
    id: 'q4',
    text: 'It is not that I am so smart. I just stay with problems longer.',
    author: 'Albert Einstein',
  },
  {
    id: 'q5',
    text: 'Starve your distractions, feed your focus.',
    author: 'Unknown',
  },
  {
    id: 'q6',
    text: 'The shorter way to do many things is to do only one thing at a time.',
    author: 'Wolfgang Amadeus Mozart',
  },
  {
    id: 'q7',
    text: 'Almost everything will work again if you unplug it for a few minutes, including you.',
    author: 'Anne Lamott',
  },
  {
    id: 'q8',
    text: 'You will never reach your destination if you stop and throw stones at every dog that barks.',
    author: 'Winston Churchill',
  },
];

const QUOTE_PALETTES: Array<{ background: string; textColor: string }> = [
  { background: '#2C3E50', textColor: '#F5F7FA' },
  { background: '#3E5C3A', textColor: '#F1F7EE' },
  { background: '#5C3A55', textColor: '#F8EEF6' },
  { background: '#3A4A5C', textColor: '#EEF4F8' },
  { background: '#5C4A2E', textColor: '#FBF3E7' },
];

export function randomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export function paletteForQuote(quoteId: string) {
  let hash = 0;
  for (let i = 0; i < quoteId.length; i++) {
    hash = (hash * 31 + quoteId.charCodeAt(i)) % QUOTE_PALETTES.length;
  }
  return QUOTE_PALETTES[Math.abs(hash) % QUOTE_PALETTES.length];
}
