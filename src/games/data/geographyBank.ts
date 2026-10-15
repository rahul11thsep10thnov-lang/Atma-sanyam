// Question bank for geographyQuiz. Pure data so the rules tests can check it.
import type { QuizQuestion } from '../shared/quiz';

export const GEOGRAPHY_BANK: QuizQuestion[] = [
  // easy
  { level: 'easy', emoji: '🇮🇳', q: 'What is the capital city of India?', options: ['New Delhi', 'Mumbai', 'Kolkata', 'Chennai'], why: 'New Delhi has been the capital of India since 1931. Mumbai is the largest city.' },
  { level: 'easy', emoji: '🌊', q: 'Which is the biggest ocean in the world?', options: ['Pacific Ocean', 'Indian Ocean', 'Atlantic Ocean', 'Arctic Ocean'], why: 'The Pacific is so big that all the land on Earth could fit inside it.' },
  { level: 'easy', emoji: '🏔️', q: 'Which mountains lie to the north of India?', options: ['The Himalayas', 'The Alps', 'The Andes', 'The Rockies'], why: 'The Himalayas are the highest mountains on Earth and form the northern border of India.' },
  { level: 'easy', emoji: '🐫', q: 'Which Indian state has the Thar Desert?', options: ['Rajasthan', 'Kerala', 'Assam', 'Goa'], why: 'The Thar, or Great Indian Desert, is mostly in Rajasthan.' },
  { level: 'easy', emoji: '🌍', q: 'How many continents are there?', options: ['7', '5', '10', '3'], why: 'Asia, Africa, North America, South America, Antarctica, Europe and Australia.' },
  { level: 'easy', emoji: '🧭', q: 'Which direction does the Sun rise in?', options: ['East', 'West', 'North', 'South'], why: 'The Earth spins towards the east, so the Sun appears to rise in the east.' },
  { level: 'easy', emoji: '🐧', q: 'Which continent is covered in ice and has penguins?', options: ['Antarctica', 'Africa', 'Asia', 'Europe'], why: 'Antarctica is the coldest continent. Penguins live there and in the southern seas.' },
  { level: 'easy', emoji: '🏝️', q: 'What is a piece of land with water all around it called?', options: ['An island', 'A desert', 'A valley', 'A hill'], why: 'Islands are surrounded by water. Sri Lanka and Madagascar are islands.' },
  { level: 'easy', emoji: '🚩', q: 'How many colours are on the flag of India?', options: ['3 stripes plus a blue wheel', '2', '5', '1'], why: 'Saffron, white and green stripes, with the blue Ashoka Chakra in the middle.' },
  { level: 'easy', emoji: '🏞️', q: 'Which of these is a river in India?', options: ['The Ganga', 'The Nile', 'The Amazon', 'The Thames'], why: 'The Ganga (Ganges) flows from the Himalayas across northern India to the Bay of Bengal.' },
  { level: 'easy', emoji: '🗺️', q: 'What do we call a book of maps?', options: ['An atlas', 'A diary', 'A novel', 'A menu'], why: 'An atlas is a collection of maps.' },
  { level: 'easy', emoji: '🌴', q: 'Which Indian state is famous for its backwaters and coconuts?', options: ['Kerala', 'Punjab', 'Haryana', 'Bihar'], why: 'Kerala, on the south-west coast, has long backwaters and many coconut palms.' },
  // normal
  { level: 'normal', emoji: '🗻', q: 'What is the highest mountain in the world?', options: ['Mount Everest', 'K2', 'Kangchenjunga', 'Mount Kilimanjaro'], why: 'Mount Everest is 8,849 metres tall, on the border of Nepal and China.' },
  { level: 'normal', emoji: '🏜️', q: 'Which is the largest hot desert in the world?', options: ['The Sahara', 'The Thar', 'The Gobi', 'The Kalahari'], why: 'The Sahara covers most of northern Africa.' },
  { level: 'normal', emoji: '🌊', q: 'The longest river in the world is usually said to be the…', options: ['Nile', 'Ganga', 'Danube', 'Yamuna'], why: 'The Nile in Africa is about 6,650 km long. The Amazon is a close rival.' },
  { level: 'normal', emoji: '🇮🇳', q: 'How many states does India have?', options: ['28', '20', '35', '12'], why: 'India has 28 states and 8 union territories.' },
  { level: 'normal', emoji: '🌏', q: 'Which is the largest continent?', options: ['Asia', 'Africa', 'Europe', 'Australia'], why: 'Asia is the largest by both land and population. India is in Asia.' },
  { level: 'normal', emoji: '🧭', q: 'What is the imaginary line around the middle of the Earth called?', options: ['The Equator', 'The Prime Meridian', 'The Tropic of Cancer', 'The horizon'], why: 'The Equator divides the Earth into the Northern and Southern Hemispheres.' },
  { level: 'normal', emoji: '🏙️', q: 'Which city is the capital of Maharashtra?', options: ['Mumbai', 'Pune', 'Nagpur', 'Nashik'], why: 'Mumbai is the state capital and India\'s financial centre.' },
  { level: 'normal', emoji: '🐘', q: 'Which country shares the longest border with India?', options: ['Bangladesh', 'Nepal', 'China', 'Pakistan'], why: 'The India–Bangladesh border is over 4,000 km long.' },
  { level: 'normal', emoji: '🌋', q: 'Which country is made up of many islands and has lots of volcanoes, including Mount Fuji?', options: ['Japan', 'Egypt', 'Brazil', 'Canada'], why: 'Japan has over 100 active volcanoes. Mount Fuji is its highest mountain.' },
  { level: 'normal', emoji: '🏛️', q: 'In which Indian city is the Taj Mahal?', options: ['Agra', 'Jaipur', 'Delhi', 'Lucknow'], why: 'The Taj Mahal was built in Agra, Uttar Pradesh, in the 1600s.' },
  { level: 'normal', emoji: '🌧️', q: 'What do we call the rainy season winds that bring most of India\'s rain?', options: ['The monsoon', 'A tornado', 'A blizzard', 'The trade winds'], why: 'The south-west monsoon blows in from the Indian Ocean between June and September.' },
  { level: 'normal', emoji: '🗼', q: 'Which city is the capital of France?', options: ['Paris', 'Rome', 'Berlin', 'Madrid'], why: 'Paris, on the river Seine, is the capital of France.' },
  // hard
  { level: 'hard', emoji: '🏞️', q: 'Which Indian state is the largest by area?', options: ['Rajasthan', 'Madhya Pradesh', 'Maharashtra', 'Uttar Pradesh'], why: 'Rajasthan covers about 342,000 square kilometres. Uttar Pradesh has the most people.' },
  { level: 'hard', emoji: '🌏', q: 'Which country has the largest population in the world (as of 2023)?', options: ['India', 'China', 'USA', 'Indonesia'], why: 'The United Nations estimated that India overtook China in 2023.' },
  { level: 'hard', emoji: '🧭', q: 'The Tropic of Cancer passes through which of these Indian states?', options: ['Gujarat', 'Kerala', 'Punjab', 'Tamil Nadu'], why: 'It crosses eight states, including Gujarat, Rajasthan, Madhya Pradesh and West Bengal.' },
  { level: 'hard', emoji: '🌊', q: 'The Andaman and Nicobar Islands lie in which sea?', options: ['The Bay of Bengal', 'The Arabian Sea', 'The Red Sea', 'The Mediterranean Sea'], why: 'They are a union territory of India in the Bay of Bengal, east of the mainland.' },
  { level: 'hard', emoji: '🏔️', q: 'What is the highest mountain in India?', options: ['Kangchenjunga', 'Mount Everest', 'Nanda Devi', 'K2'], why: 'Kangchenjunga, on the Sikkim–Nepal border, is 8,586 m. Everest is in Nepal and China.' },
  { level: 'hard', emoji: '🌍', q: 'Which country is both in Europe and Asia?', options: ['Turkey', 'Italy', 'Thailand', 'Kenya'], why: 'Turkey straddles the Bosphorus strait: a small part is in Europe, the rest in Asia. Russia does too.' },
  { level: 'hard', emoji: '🏜️', q: 'Which is the smallest continent?', options: ['Australia', 'Europe', 'Antarctica', 'South America'], why: 'Australia is the smallest continent and a single country.' },
  { level: 'hard', emoji: '🌊', q: 'Which strait separates India from Sri Lanka?', options: ['The Palk Strait', 'The Bering Strait', 'The Strait of Gibraltar', 'The Strait of Hormuz'], why: 'The Palk Strait lies between Tamil Nadu and northern Sri Lanka.' },
  { level: 'hard', emoji: '🌐', q: 'Which line of longitude is used as 0° for time zones?', options: ['The Prime (Greenwich) Meridian', 'The Equator', 'The International Date Line', 'The Tropic of Capricorn'], why: 'Indian Standard Time is 5 hours 30 minutes ahead of the time at Greenwich.' },
  { level: 'hard', emoji: '🏛️', q: 'Which is the capital of Australia?', options: ['Canberra', 'Sydney', 'Melbourne', 'Perth'], why: 'Canberra was built as the capital to settle an argument between Sydney and Melbourne.' },
  { level: 'hard', emoji: '🏞️', q: 'Which river flows through the Grand Canyon in the USA?', options: ['The Colorado River', 'The Mississippi River', 'The Hudson River', 'The Missouri River'], why: 'The Colorado River carved the canyon over millions of years.' },
  { level: 'hard', emoji: '🚢', q: 'Which man-made waterway connects the Mediterranean Sea and the Red Sea?', options: ['The Suez Canal', 'The Panama Canal', 'The Grand Canal', 'The Kiel Canal'], why: 'The Suez Canal in Egypt lets ships sail from Europe to Asia without going around Africa.' },
];
