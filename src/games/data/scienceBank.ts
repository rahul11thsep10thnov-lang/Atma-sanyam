// Question bank for scienceQuiz. Pure data so the rules tests can check it.
import type { QuizQuestion } from '../shared/quiz';

export const SCIENCE_BANK: QuizQuestion[] = [
  // easy (ages 6–8)
  { level: 'easy', emoji: '☀️', q: 'What gives plants the energy to grow?', options: ['Sunlight', 'Moonlight', 'Wind', 'Sand'], why: 'Plants use sunlight, water and air to make their own food. This is called photosynthesis.' },
  { level: 'easy', emoji: '🧊', q: 'What happens to water when it gets very cold?', options: ['It turns into ice', 'It turns into steam', 'It disappears', 'It turns red'], why: 'Water freezes into solid ice at 0 °C.' },
  { level: 'easy', emoji: '🦴', q: 'How many legs does a spider have?', options: ['8', '6', '4', '10'], why: 'Spiders have eight legs. Insects, like ants and bees, have six.' },
  { level: 'easy', emoji: '🌙', q: 'Which one is a source of light?', options: ['The Sun', 'A mirror', 'A rock', 'A shadow'], why: 'The Sun makes its own light. A mirror only reflects light that comes from somewhere else.' },
  { level: 'easy', emoji: '🐸', q: 'What do we call a baby frog?', options: ['A tadpole', 'A kitten', 'A calf', 'A chick'], why: 'A frog starts life as an egg, hatches into a tadpole with a tail, and then grows legs.' },
  { level: 'easy', emoji: '🧲', q: 'Which of these will a magnet pick up?', options: ['An iron nail', 'A plastic spoon', 'A wooden stick', 'A rubber ball'], why: 'Magnets attract iron and steel. Plastic, wood and rubber are not magnetic.' },
  { level: 'easy', emoji: '🫁', q: 'Which part of your body do you use to breathe?', options: ['Lungs', 'Stomach', 'Bones', 'Ears'], why: 'Your lungs take oxygen from the air into your blood.' },
  { level: 'easy', emoji: '🌧️', q: 'Where does rain come from?', options: ['Clouds', 'Trees', 'Rivers', 'Mountains'], why: 'Clouds are made of tiny water drops. When the drops join and get heavy, they fall as rain.' },
  { level: 'easy', emoji: '🪨', q: 'Which of these is a living thing?', options: ['A tree', 'A stone', 'A car', 'A cloud'], why: 'Living things grow, need food or water, and make new living things. A tree does all of these.' },
  { level: 'easy', emoji: '👂', q: 'Which sense do you use with your ears?', options: ['Hearing', 'Taste', 'Smell', 'Sight'], why: 'Ears catch sound waves and send signals to your brain.' },
  { level: 'easy', emoji: '🐦', q: 'Which animal lays eggs?', options: ['A hen', 'A cow', 'A dog', 'A cat'], why: 'Birds like hens lay eggs. Cows, dogs and cats give birth to live babies and are mammals.' },
  { level: 'easy', emoji: '🔥', q: 'What do we feel from a fire?', options: ['Heat', 'Cold', 'Wet', 'Sour'], why: 'Burning releases energy as heat and light.' },
  // normal (ages 9–10)
  { level: 'normal', emoji: '🪐', q: 'Which planet is known as the Red Planet?', options: ['Mars', 'Venus', 'Jupiter', 'Mercury'], why: 'Mars looks red because its soil contains rusty iron oxide.' },
  { level: 'normal', emoji: '💧', q: 'What are the three states of water?', options: ['Solid, liquid and gas', 'Hot, warm and cold', 'Ice, snow and hail', 'River, lake and sea'], why: 'Ice is solid, water is liquid and steam (water vapour) is gas.' },
  { level: 'normal', emoji: '❤️', q: 'What does the heart pump around the body?', options: ['Blood', 'Air', 'Water', 'Food'], why: 'The heart is a muscle that pushes blood through tubes called arteries and veins.' },
  { level: 'normal', emoji: '🌍', q: 'How long does the Earth take to go once around the Sun?', options: ['About 365 days', 'About 24 hours', 'About 30 days', 'About 7 days'], why: 'One trip around the Sun is one year. One spin of the Earth is one day.' },
  { level: 'normal', emoji: '🦋', q: 'What is the change from caterpillar to butterfly called?', options: ['Metamorphosis', 'Photosynthesis', 'Evaporation', 'Migration'], why: 'Metamorphosis means a big change of body shape as an animal grows.' },
  { level: 'normal', emoji: '🌋', q: 'What is the hot melted rock that comes out of a volcano called?', options: ['Lava', 'Mud', 'Sand', 'Steam'], why: 'Inside the Earth it is called magma; once it flows out it is called lava.' },
  { level: 'normal', emoji: '🔊', q: 'Sound travels fastest through which of these?', options: ['Steel', 'Air', 'Empty space', 'Fog'], why: 'Sound needs something to travel through. It moves faster in solids than in air, and not at all in empty space.' },
  { level: 'normal', emoji: '🥦', q: 'Which gas do plants take in from the air to make food?', options: ['Carbon dioxide', 'Oxygen', 'Helium', 'Nitrogen'], why: 'Plants take in carbon dioxide and give out oxygen, which we breathe.' },
  { level: 'normal', emoji: '🦷', q: 'What is the hardest substance in the human body?', options: ['Tooth enamel', 'Bone', 'Hair', 'Nail'], why: 'Enamel, the outer layer of teeth, is harder than bone.' },
  { level: 'normal', emoji: '🧪', q: 'What do we call a mixture of a solid dissolved in a liquid, like sugar in water?', options: ['A solution', 'A rock', 'A gas', 'A shadow'], why: 'When sugar dissolves, it spreads out evenly in the water and makes a solution.' },
  { level: 'normal', emoji: '🌡️', q: 'What instrument measures temperature?', options: ['A thermometer', 'A barometer', 'A ruler', 'A compass'], why: 'Thermo means heat; a thermometer measures how hot or cold something is.' },
  { level: 'normal', emoji: '🦴', q: 'About how many bones does an adult human have?', options: ['206', '20', '1,000', '52'], why: 'Babies are born with about 300 bones; many join together to make 206 in adults.' },
  // hard (ages 11–12)
  { level: 'hard', emoji: '⚡', q: 'Which of these materials is a good conductor of electricity?', options: ['Copper', 'Rubber', 'Glass', 'Dry wood'], why: 'Metals like copper let electric charge flow easily. Rubber and glass are insulators.' },
  { level: 'hard', emoji: '🧬', q: 'What molecule carries the instructions for how living things grow?', options: ['DNA', 'Oxygen', 'Glucose', 'Salt'], why: 'DNA, found in almost every cell, holds the genetic instructions of an organism.' },
  { level: 'hard', emoji: '🌕', q: 'What causes the tides in the sea?', options: ["Mostly the Moon's gravity", 'Wind', 'Fish moving', 'The Earth getting hotter'], why: "The Moon's gravity pulls the oceans, making the water rise and fall twice a day. The Sun helps a little too." },
  { level: 'hard', emoji: '🔭', q: 'What is the closest star to the Earth?', options: ['The Sun', 'Sirius', 'The North Star', 'Alpha Centauri'], why: 'The Sun is a star. The next nearest, Proxima Centauri, is about 4.2 light years away.' },
  { level: 'hard', emoji: '⚖️', q: 'What is the force that pulls objects towards the Earth?', options: ['Gravity', 'Friction', 'Magnetism', 'Pressure'], why: 'Gravity pulls everything with mass towards each other. The Earth is big, so its pull is strong.' },
  { level: 'hard', emoji: '🧫', q: 'Which of these is NOT a type of microbe?', options: ['A mosquito', 'A bacterium', 'A virus', 'A fungus'], why: 'Microbes are too small to see without a microscope. A mosquito is an insect.' },
  { level: 'hard', emoji: '🌈', q: 'Why does a prism split white light into colours?', options: ['Each colour bends by a different amount', 'The glass paints the light', 'The light gets hotter', 'The prism is magnetic'], why: 'White light is a mix of colours. Glass bends violet light more than red, so the colours spread out.' },
  { level: 'hard', emoji: '🫀', q: 'Which blood vessels carry blood away from the heart?', options: ['Arteries', 'Veins', 'Nerves', 'Tendons'], why: 'Arteries carry blood away from the heart; veins bring it back.' },
  { level: 'hard', emoji: '🧊', q: 'Why does ice float on water?', options: ['Ice is less dense than liquid water', 'Ice is warmer than water', 'Ice is lighter than air', 'Water pushes it up with wind'], why: 'When water freezes its molecules spread out into a crystal, so ice takes more space and is less dense.' },
  { level: 'hard', emoji: '🔋', q: 'In a battery, chemical energy is changed into which kind of energy?', options: ['Electrical energy', 'Sound energy', 'Nuclear energy', 'Wind energy'], why: 'Chemical reactions inside a battery push electrons around a circuit.' },
  { level: 'hard', emoji: '🌬️', q: 'What is most of the air around us made of?', options: ['Nitrogen', 'Oxygen', 'Carbon dioxide', 'Hydrogen'], why: 'Air is about 78% nitrogen and 21% oxygen, with small amounts of other gases.' },
  { level: 'hard', emoji: '🪞', q: 'What happens to light when it hits a mirror?', options: ['It reflects', 'It stops', 'It turns into heat only', 'It becomes sound'], why: 'A smooth shiny surface bounces light back. The angle in equals the angle out.' },
];
