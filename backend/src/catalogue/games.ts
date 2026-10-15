// The game catalogue the server seeds (database/seedCatalogue.ts). The app
// ships the same list (src/games/registry.ts) with the actual rules; the
// server is authoritative for who may see which game. `status` here is the
// initial value only: admins change it from the console.
//
// implementation: 'playable' means the app has real rules, win/loss and a
// completion screen for it; 'in_development' games are seeded with that
// status, so they never reach the production Player Console.

export type BracketKey = 'A' | 'B' | 'C' | 'D';

export interface GameSeed {
  id: string;
  name: string;
  tagline: string;
  description: string;
  instructions: string;
  categoryId: string;
  brackets: BracketKey[];
  difficulties: { key: string; label: string; brackets?: BracketKey[] }[];
  skills: string[];
  estimatedMinutes: number;
  offlineCapable?: boolean;
  implementation: 'playable' | 'in_development';
  sortOrder: number;
}

export const GAME_CATEGORIES = [
  { id: 'matching', name: 'Matching & Memory', icon: 'puzzle', color: '#FF6B9D' },
  { id: 'puzzles', name: 'Puzzles', icon: 'grid', color: '#FFB800' },
  { id: 'words', name: 'Words & Letters', icon: 'book', color: '#7C5CFF' },
  { id: 'numbers', name: 'Numbers & Logic', icon: 'hash', color: '#00C2A8' },
  { id: 'board', name: 'Board & Strategy', icon: 'crown', color: '#FF8A3D' },
  { id: 'arcade', name: 'Arcade', icon: 'zap', color: '#2DB7FF' },
  { id: 'sports', name: 'Sports', icon: 'trophy', color: '#4ADE80' },
  { id: 'creative', name: 'Creative', icon: 'palette', color: '#F472B6' },
  { id: 'simulation', name: 'Simulation', icon: 'home', color: '#A78BFA' },
  { id: 'learning', name: 'Learning & Quizzes', icon: 'lightbulb', color: '#FACC15' },
] as const;

const easyNormalHard = [
  { key: 'easy', label: 'Easy' },
  { key: 'normal', label: 'Normal' },
  { key: 'hard', label: 'Hard' },
];

export const GAME_SEEDS: GameSeed[] = [
  {
    id: 'picture-matching', name: 'Picture Matching', tagline: 'Find the two that are the same!', categoryId: 'matching',
    description: 'Pairs of friendly pictures are shown face up. Tap the two that match.',
    instructions: 'Look at all the pictures. Tap one picture, then tap the one that looks exactly the same. Match every pair to win!',
    brackets: ['A', 'B'], difficulties: [{ key: 'easy', label: '3 pairs' }, { key: 'normal', label: '6 pairs' }, { key: 'hard', label: '8 pairs' }],
    skills: ['attention', 'visual discrimination'], estimatedMinutes: 3, implementation: 'playable', sortOrder: 1,
  },
  {
    id: 'memory-cards', name: 'Memory Cards', tagline: 'Flip, remember, match!', categoryId: 'matching',
    description: 'Cards lie face down. Turn two over; if they match they stay open.',
    instructions: 'Tap a card to turn it over, then tap another. If they match, they stay face up. Remember where each picture is to find all the pairs in as few turns as you can.',
    brackets: ['A', 'B', 'C', 'D'], difficulties: [{ key: 'easy', label: '4 pairs' }, { key: 'normal', label: '8 pairs' }, { key: 'hard', label: '12 pairs' }, { key: 'expert', label: '18 pairs', brackets: ['C', 'D'] }],
    skills: ['memory', 'concentration'], estimatedMinutes: 4, implementation: 'playable', sortOrder: 2,
  },
  {
    id: 'jigsaw', name: 'Jigsaw Puzzle', tagline: 'Put the picture back together.', categoryId: 'puzzles',
    description: 'A picture cut into pieces. Drag each piece to where it belongs.',
    instructions: 'Drag a piece onto the board. When it is in the right place it clicks in. Finish the whole picture to win.',
    brackets: ['A', 'B', 'C', 'D'], difficulties: [{ key: 'easy', label: '4 pieces' }, { key: 'normal', label: '9 pieces' }, { key: 'hard', label: '16 pieces' }, { key: 'expert', label: '36 pieces', brackets: ['C', 'D'] }],
    skills: ['spatial reasoning', 'patience'], estimatedMinutes: 5, implementation: 'playable', sortOrder: 3,
  },
  {
    id: 'shape-sorting', name: 'Shape Sorting', tagline: 'Every shape has a home.', categoryId: 'matching',
    description: 'Drag circles, squares, triangles and stars into the matching holes.',
    instructions: 'Pick up a shape and drop it on the hole with the same shape. Sort them all!',
    brackets: ['A'], difficulties: [{ key: 'easy', label: '3 shapes' }, { key: 'normal', label: '5 shapes' }, { key: 'hard', label: '7 shapes' }],
    skills: ['shapes', 'fine motor'], estimatedMinutes: 3, implementation: 'playable', sortOrder: 4,
  },
  {
    id: 'colour-matching', name: 'Colour Matching', tagline: 'Red to red, blue to blue!', categoryId: 'matching',
    description: 'Tap the thing that is the same colour as the big splash.',
    instructions: 'Look at the big colour. Tap the picture that has the same colour. Get 10 right to win!',
    brackets: ['A'], difficulties: [{ key: 'easy', label: '3 choices' }, { key: 'normal', label: '4 choices' }, { key: 'hard', label: '6 choices' }],
    skills: ['colours', 'attention'], estimatedMinutes: 3, implementation: 'playable', sortOrder: 5,
  },
  {
    id: 'spot-the-difference', name: 'Spot the Difference', tagline: 'Two pictures, a few sneaky changes.', categoryId: 'puzzles',
    description: 'Two almost identical scenes. Find everything that is different.',
    instructions: 'Compare the two pictures. Tap a spot on the bottom picture where something is different. Find all the differences before you run out of tries.',
    brackets: ['B', 'C', 'D'], difficulties: [{ key: 'easy', label: '3 differences' }, { key: 'normal', label: '5 differences' }, { key: 'hard', label: '7 differences' }],
    skills: ['observation', 'attention'], estimatedMinutes: 4, implementation: 'playable', sortOrder: 6,
  },
  {
    id: 'hidden-object', name: 'Find the Hidden Object', tagline: 'Where did it go?', categoryId: 'puzzles',
    description: 'A busy scene full of things. Find the ones on your list.',
    instructions: 'Look at the list at the bottom. Find each thing in the picture and tap it. Find them all to win!',
    brackets: ['B', 'C'], difficulties: [{ key: 'easy', label: '4 objects' }, { key: 'normal', label: '6 objects' }, { key: 'hard', label: '9 objects' }],
    skills: ['observation', 'vocabulary'], estimatedMinutes: 4, implementation: 'playable', sortOrder: 7,
  },
  {
    id: 'maze-runner', name: 'Maze Runner', tagline: 'Find the way out!', categoryId: 'puzzles',
    description: 'Guide the explorer through the maze to the flag.',
    instructions: 'Swipe or use the arrows to move. Walls block you. Reach the flag in as few moves as you can.',
    brackets: ['A', 'B', 'C', 'D'], difficulties: [{ key: 'easy', label: 'Small maze' }, { key: 'normal', label: 'Medium maze' }, { key: 'hard', label: 'Big maze' }, { key: 'expert', label: 'Huge maze', brackets: ['C', 'D'] }],
    skills: ['planning', 'spatial reasoning'], estimatedMinutes: 4, implementation: 'playable', sortOrder: 8,
  },
  {
    id: 'sliding-puzzle', name: 'Sliding Puzzle', tagline: 'Slide the tiles into order.', categoryId: 'puzzles',
    description: 'Numbered tiles with one empty space. Slide them until they are in order.',
    instructions: 'Tap a tile next to the empty space to slide it. Arrange the tiles 1, 2, 3… with the empty space last.',
    brackets: ['B', 'C', 'D'], difficulties: [{ key: 'easy', label: '3 × 3' }, { key: 'normal', label: '4 × 4' }, { key: 'hard', label: '5 × 5', brackets: ['C', 'D'] }],
    skills: ['logic', 'planning'], estimatedMinutes: 6, implementation: 'playable', sortOrder: 9,
  },
  {
    id: 'sudoku', name: 'Sudoku', tagline: 'Every row, column and box once.', categoryId: 'numbers',
    description: 'Fill the grid so each row, column and box has every number once.',
    instructions: 'Tap an empty cell, then tap a number. Each row, each column and each box must contain every number exactly once. Younger players use a 4 × 4 grid.',
    brackets: ['B', 'C', 'D'], difficulties: [{ key: 'mini', label: '4 × 4', brackets: ['B'] }, { key: 'easy', label: '6 × 6' }, { key: 'normal', label: '9 × 9 easy', brackets: ['C', 'D'] }, { key: 'hard', label: '9 × 9 hard', brackets: ['C', 'D'] }, { key: 'expert', label: '9 × 9 expert', brackets: ['D'] }],
    skills: ['logic', 'numbers'], estimatedMinutes: 10, implementation: 'playable', sortOrder: 10,
  },
  {
    id: 'word-search', name: 'Word Search', tagline: 'Words hiding in a grid of letters.', categoryId: 'words',
    description: 'Find the listed words hidden across, down and diagonally.',
    instructions: 'Drag your finger from the first letter of a word to its last letter. Found words are crossed off the list. Find them all!',
    brackets: ['B', 'C', 'D'], difficulties: [{ key: 'easy', label: '6 × 6, 4 words' }, { key: 'normal', label: '8 × 8, 6 words' }, { key: 'hard', label: '10 × 10, 8 words' }],
    skills: ['spelling', 'scanning'], estimatedMinutes: 6, implementation: 'playable', sortOrder: 11,
  },
  {
    id: 'anagram-builder', name: 'Anagram Builder', tagline: 'Unscramble the letters.', categoryId: 'words',
    description: 'Letters in a jumble. Put them in order to make the word.',
    instructions: 'Tap the letters in the right order to spell the word. The picture clue helps. Use a hint if you are stuck.',
    brackets: ['B', 'C', 'D'], difficulties: [{ key: 'easy', label: '3–4 letters' }, { key: 'normal', label: '5–6 letters' }, { key: 'hard', label: '7+ letters' }],
    skills: ['spelling', 'vocabulary'], estimatedMinutes: 5, implementation: 'playable', sortOrder: 12,
  },
  {
    id: 'tangram', name: 'Tangram', tagline: 'Seven pieces, endless shapes.', categoryId: 'puzzles',
    description: 'Fit the seven tangram pieces into the outline.',
    instructions: 'Drag a piece onto the shadow. Tap a piece to rotate it. Fill the whole outline to win.',
    brackets: ['B', 'C', 'D'], difficulties: [{ key: 'easy', label: 'Outlined pieces' }, { key: 'normal', label: 'Silhouette' }, { key: 'hard', label: 'Tricky shapes' }],
    skills: ['geometry', 'spatial reasoning'], estimatedMinutes: 6, implementation: 'playable', sortOrder: 13,
  },
  {
    id: 'connect-four', name: 'Connect Four', tagline: 'Four in a row wins.', categoryId: 'board',
    description: 'Drop discs into the grid and line up four before the computer does.',
    instructions: 'Tap a column to drop your disc. Get four of your discs in a row — across, down or diagonally — before your opponent.',
    brackets: ['B', 'C', 'D'], difficulties: [{ key: 'easy', label: 'Friendly robot' }, { key: 'normal', label: 'Clever robot' }, { key: 'hard', label: 'Master robot' }],
    skills: ['strategy', 'planning'], estimatedMinutes: 5, implementation: 'playable', sortOrder: 14,
  },
  {
    id: 'checkers', name: 'Checkers', tagline: 'Jump and capture.', categoryId: 'board',
    description: 'Classic draughts against the computer, with kings.',
    instructions: 'Tap a piece, then tap where it should go. Pieces move diagonally forward and jump over an opponent to capture it. Reach the far side to make a king that moves both ways. Capture all the opponent\'s pieces to win.',
    brackets: ['B', 'C', 'D'], difficulties: [{ key: 'easy', label: 'Beginner' }, { key: 'normal', label: 'Normal' }, { key: 'hard', label: 'Hard' }],
    skills: ['strategy', 'foresight'], estimatedMinutes: 10, implementation: 'playable', sortOrder: 15,
  },
  {
    id: 'chess', name: 'Chess', tagline: 'The royal game, against the computer.', categoryId: 'board',
    description: 'Full chess with legal-move hints against a computer opponent.',
    instructions: 'Tap a piece to see where it can move, then tap a square. Checkmate the opposing king to win. Beginners get move hints and a tutorial.',
    brackets: ['B', 'C', 'D'], difficulties: [{ key: 'tutorial', label: 'Learn the moves', brackets: ['B', 'C'] }, { key: 'easy', label: 'Beginner' }, { key: 'normal', label: 'Club player', brackets: ['C', 'D'] }, { key: 'hard', label: 'Advanced', brackets: ['D'] }],
    skills: ['strategy', 'planning', 'patience'], estimatedMinutes: 15, implementation: 'playable', sortOrder: 16,
  },
  {
    id: 'ludo', name: 'Ludo', tagline: 'Race your tokens home.', categoryId: 'board',
    description: 'The classic Indian race game against computer players.',
    instructions: 'Tap the dice to roll. Roll a six to bring a token out. Move tokens around the board and into your home column. Landing on an opponent sends them back. First to bring all four tokens home wins.',
    brackets: ['B', 'C', 'D'], difficulties: [{ key: 'easy', label: '2 players' }, { key: 'normal', label: '4 players' }],
    skills: ['counting', 'turn taking'], estimatedMinutes: 12, implementation: 'playable', sortOrder: 17,
  },
  {
    id: 'snakes-and-ladders', name: 'Snakes and Ladders', tagline: 'Climb up, slide down!', categoryId: 'board',
    description: 'Roll the dice and race to 100, climbing ladders and dodging snakes.',
    instructions: 'Tap the dice to roll and move. A ladder takes you up, a snake slides you down. Reach square 100 first to win.',
    brackets: ['B', 'C'], difficulties: [{ key: 'normal', label: 'Classic' }],
    skills: ['counting', 'number recognition'], estimatedMinutes: 6, implementation: 'playable', sortOrder: 18,
  },
  {
    id: 'bubble-shooter', name: 'Bubble Shooter', tagline: 'Pop three of a kind.', categoryId: 'arcade',
    description: 'Aim and shoot bubbles to make groups of three or more.',
    instructions: 'Tap where you want to shoot. Match three or more bubbles of the same colour to pop them. Clear the board before the bubbles reach the bottom.',
    brackets: ['C', 'D'], difficulties: easyNormalHard,
    skills: ['aim', 'colour matching', 'planning'], estimatedMinutes: 6, implementation: 'playable', sortOrder: 19,
  },
  {
    id: 'match-3', name: 'Match-3', tagline: 'Swap and match sweets.', categoryId: 'arcade',
    description: 'Swap neighbouring gems to make lines of three or more.',
    instructions: 'Swap two gems next to each other to make a row or column of three or more of the same kind. Reach the target score before the moves run out.',
    brackets: ['C', 'D'], difficulties: easyNormalHard,
    skills: ['pattern recognition', 'planning'], estimatedMinutes: 6, implementation: 'playable', sortOrder: 20,
  },
  {
    id: 'block-puzzle', name: 'Block Puzzle', tagline: 'Fit the blocks, clear the lines.', categoryId: 'arcade',
    description: 'Place blocks on the grid to complete rows and columns.',
    instructions: 'Drag a block onto the grid. Fill a whole row or column to clear it. The game ends when no block fits.',
    brackets: ['C', 'D'], difficulties: [{ key: 'normal', label: 'Classic' }, { key: 'hard', label: 'Big pieces' }],
    skills: ['spatial reasoning', 'planning'], estimatedMinutes: 6, implementation: 'playable', sortOrder: 21,
  },
  {
    id: 'connect-the-dots', name: 'Connect the Dots', tagline: '1, 2, 3… what will it be?', categoryId: 'creative',
    description: 'Tap the dots in number order to reveal a picture.',
    instructions: 'Tap dot 1, then dot 2, then 3… A line joins them. When you reach the last dot the picture appears!',
    brackets: ['A', 'B'], difficulties: [{ key: 'easy', label: '1–10' }, { key: 'normal', label: '1–20' }, { key: 'hard', label: '1–30' }],
    skills: ['counting', 'number order'], estimatedMinutes: 3, implementation: 'playable', sortOrder: 22,
  },
  {
    id: 'colouring-book', name: 'Colouring Book', tagline: 'Fill the picture with colour.', categoryId: 'creative',
    description: 'Pick a colour and tap a part of the picture to fill it.',
    instructions: 'Choose a colour at the bottom. Tap a part of the picture to colour it. There is no wrong way — colour it how you like!',
    brackets: ['A', 'B', 'C'], difficulties: [{ key: 'normal', label: 'Free colouring' }],
    skills: ['creativity', 'colours'], estimatedMinutes: 6, implementation: 'playable', sortOrder: 23,
  },
  {
    id: 'drawing-canvas', name: 'Drawing Canvas', tagline: 'Draw anything you can imagine.', categoryId: 'creative',
    description: 'Finger painting with brushes, colours, stamps and undo.',
    instructions: 'Pick a colour and a brush size, then draw with your finger. Use the stamps for quick shapes and undo if you change your mind.',
    brackets: ['A', 'B', 'C', 'D'], difficulties: [{ key: 'normal', label: 'Free drawing' }],
    skills: ['creativity', 'fine motor'], estimatedMinutes: 8, implementation: 'playable', sortOrder: 24,
  },
  {
    id: 'origami-studio', name: 'Origami Studio', tagline: 'Fold paper, step by step.', categoryId: 'creative',
    description: 'Animated folding instructions for real paper origami, by age.',
    instructions: 'Choose a model. Follow each fold on the screen with a real sheet of paper. Tap Next when your fold matches. Ask an adult to help with the tricky ones.',
    brackets: ['A', 'B', 'C', 'D'], difficulties: [{ key: 'normal', label: 'By model' }],
    skills: ['following instructions', 'fine motor', 'geometry'], estimatedMinutes: 10, implementation: 'playable', sortOrder: 25,
  },
  {
    id: 'paper-airplane', name: 'Paper Airplane Designer', tagline: 'Fold it, then fly it!', categoryId: 'creative',
    description: 'Folding guides for real paper planes, then a flight test on screen.',
    instructions: 'Follow the folds for your plane with real paper. Then test the design on screen: choose the nose weight and wing shape and see how far it glides.',
    brackets: ['B', 'C', 'D'], difficulties: [{ key: 'normal', label: 'By design' }],
    skills: ['physics', 'fine motor'], estimatedMinutes: 8, implementation: 'playable', sortOrder: 26,
  },
  {
    id: 'virtual-garden', name: 'Virtual Garden', tagline: 'Plant, water, watch it grow.', categoryId: 'simulation',
    description: 'Plant seeds, water them and keep the weeds away.',
    instructions: 'Tap a bed to plant a seed. Water it when the soil looks dry and pull out weeds. Each plant grows through stages until it blooms. Grow every bed to win.',
    brackets: ['A', 'B'], difficulties: [{ key: 'easy', label: '3 beds' }, { key: 'normal', label: '6 beds' }],
    skills: ['care', 'patience', 'cause and effect'], estimatedMinutes: 6, implementation: 'playable', sortOrder: 27,
  },
  {
    id: 'physics-lab', name: 'Simple Physics Lab', tagline: 'Ramps, balls and bounces.', categoryId: 'learning',
    description: 'Place ramps and bumpers so the ball reaches the goal.',
    instructions: 'Drag ramps and bumpers onto the scene, then tap Play to drop the ball. Change the pieces until the ball lands in the cup.',
    brackets: ['B', 'C', 'D'], difficulties: easyNormalHard,
    skills: ['physics', 'experimentation'], estimatedMinutes: 6, implementation: 'playable', sortOrder: 28,
  },
  {
    id: 'coding-sequence', name: 'Coding Sequence Puzzle', tagline: 'Program the robot.', categoryId: 'learning',
    description: 'Build a list of commands that walks the robot to the star.',
    instructions: 'Tap the arrows to add commands to the program. Tap Run and the robot follows them one by one. Get it to the star without hitting a wall. Loops make long programs short!',
    brackets: ['B', 'C', 'D'], difficulties: [{ key: 'easy', label: 'Steps only' }, { key: 'normal', label: 'Turns' }, { key: 'hard', label: 'Loops', brackets: ['C', 'D'] }],
    skills: ['sequencing', 'logic', 'coding'], estimatedMinutes: 6, implementation: 'playable', sortOrder: 29,
  },
  {
    id: 'science-quiz', name: 'Science Quiz', tagline: 'How does the world work?', categoryId: 'learning',
    description: 'Multiple-choice science questions with explanations.',
    instructions: 'Read the question and tap the answer you think is right. You will see why it is right or wrong. Answer 10 questions.',
    brackets: ['B', 'C', 'D'], difficulties: easyNormalHard,
    skills: ['science', 'reasoning'], estimatedMinutes: 5, implementation: 'playable', sortOrder: 30,
  },
  {
    id: 'geography-quiz', name: 'Geography Quiz', tagline: 'Rivers, mountains, countries.', categoryId: 'learning',
    description: 'Questions about India and the world, with map pictures.',
    instructions: 'Read the question and tap the answer. Each round has 10 questions. Learn something new about the world!',
    brackets: ['B', 'C', 'D'], difficulties: easyNormalHard,
    skills: ['geography', 'memory'], estimatedMinutes: 5, implementation: 'playable', sortOrder: 31,
  },
  {
    id: 'animal-sounds', name: 'Animal Sound Quiz', tagline: 'Who says moo?', categoryId: 'learning',
    description: 'Hear a sound, tap the animal that makes it.',
    instructions: 'Tap the speaker to hear an animal. Then tap the animal that makes that sound. Spoken help is always on for little ones.',
    brackets: ['A', 'B'], difficulties: [{ key: 'easy', label: '2 animals' }, { key: 'normal', label: '4 animals' }],
    skills: ['listening', 'animals'], estimatedMinutes: 3, implementation: 'playable', sortOrder: 32,
  },
  {
    id: 'cricket', name: 'Cricket Batting', tagline: 'Time your shot!', categoryId: 'sports',
    description: 'Bat against a bowler and score as many runs as you can in six balls.',
    instructions: 'Watch the ball come towards you and tap at the right moment to hit it. Perfect timing means a six! Score as many runs as you can in one over.',
    brackets: ['B', 'C', 'D'], difficulties: easyNormalHard,
    skills: ['timing', 'reaction'], estimatedMinutes: 3, implementation: 'playable', sortOrder: 33,
  },
  {
    id: 'football-penalty', name: 'Football Penalty', tagline: 'Beat the goalkeeper.', categoryId: 'sports',
    description: 'Five penalty kicks: pick your spot and power.',
    instructions: 'Swipe towards the corner you want to shoot at. The goalkeeper dives — can you fool them? Score as many of your five kicks as you can.',
    brackets: ['B', 'C', 'D'], difficulties: easyNormalHard,
    skills: ['aim', 'decision making'], estimatedMinutes: 3, implementation: 'playable', sortOrder: 34,
  },
  {
    id: 'bowling', name: 'Bowling', tagline: 'Strike!', categoryId: 'sports',
    description: 'Ten frames of ten-pin bowling with real scoring.',
    instructions: 'Drag to aim, release to bowl. Knock down all ten pins for a strike. Ten frames; spares and strikes score bonus points.',
    brackets: ['B', 'C', 'D'], difficulties: easyNormalHard,
    skills: ['aim', 'scoring'], estimatedMinutes: 5, implementation: 'playable', sortOrder: 35,
  },
  {
    id: 'virtual-cooking', name: 'Virtual Cooking', tagline: 'Follow the recipe!', categoryId: 'simulation',
    description: 'Make dosa, lemonade and more by adding the right ingredients in order.',
    instructions: 'Read the recipe card. Tap the ingredients in the right order and do each step (stir, pour, flip). Serve the dish to win a star.',
    brackets: ['A', 'B'], difficulties: [{ key: 'easy', label: 'Short recipes' }, { key: 'normal', label: 'Long recipes' }],
    skills: ['sequencing', 'following instructions'], estimatedMinutes: 5, implementation: 'playable', sortOrder: 36,
  },
  {
    id: 'farm-manager', name: 'Farm Manager', tagline: 'Sow, grow, sell.', categoryId: 'simulation',
    description: 'Buy seeds, grow crops, feed animals and sell at the market across the seasons.',
    instructions: 'Each day choose what to plant and which animals to feed. Crops take a few days to grow; sell them at the market for coins. Reach the coin goal before the season ends.',
    brackets: ['B', 'C', 'D'], difficulties: easyNormalHard,
    skills: ['planning', 'arithmetic', 'resource management'], estimatedMinutes: 8, implementation: 'playable', sortOrder: 37,
  },
  {
    id: 'traffic-logic', name: 'Traffic Logic Puzzle', tagline: 'Unblock the road.', categoryId: 'numbers',
    description: 'Slide the cars and trucks so the red car can get out.',
    instructions: 'Cars only move forwards and backwards along their lane. Slide the vehicles out of the way so the red car can reach the exit. Fewer moves earns more stars.',
    brackets: ['C', 'D'], difficulties: easyNormalHard,
    skills: ['logic', 'planning'], estimatedMinutes: 5, implementation: 'playable', sortOrder: 38,
  },
  {
    id: 'chess-tactics', name: 'Chess Tactics', tagline: 'Find the winning move.', categoryId: 'board',
    description: 'Checkmate-in-one and tactic puzzles from real positions.',
    instructions: 'Look at the position and find the best move. Tap the piece, then the square. Solve the puzzle to earn a star.',
    brackets: ['C', 'D'], difficulties: [{ key: 'easy', label: 'Mate in 1' }, { key: 'normal', label: 'Win material' }, { key: 'hard', label: 'Mate in 2', brackets: ['D'] }],
    skills: ['chess', 'calculation'], estimatedMinutes: 5, implementation: 'playable', sortOrder: 39,
  },
  {
    id: 'detective-mystery', name: 'Detective Mystery', tagline: 'Whodunnit?', categoryId: 'learning',
    description: 'Read the clues, question the suspects, and work out who did it.',
    instructions: 'Read the case. Tap clues and suspects to learn more. Use the clue board to rule suspects out, then accuse the one that fits every clue.',
    brackets: ['C', 'D'], difficulties: [{ key: 'easy', label: '3 suspects' }, { key: 'normal', label: '4 suspects' }, { key: 'hard', label: '5 suspects' }],
    skills: ['deduction', 'reading'], estimatedMinutes: 8, implementation: 'playable', sortOrder: 40,
  },
];

export const ACHIEVEMENT_SEEDS = [
  { key: 'first_game', name: 'First Steps', description: 'Finished your very first game.', icon: 'star', rule: { type: 'completions', count: 1 } },
  { key: 'five_games', name: 'Game Explorer', description: 'Played five different games.', icon: 'compass', rule: { type: 'games_played', count: 5 } },
  { key: 'ten_wins', name: 'Ten Wins', description: 'Finished ten games.', icon: 'trophy', rule: { type: 'completions', count: 10 } },
  { key: 'fifty_wins', name: 'Champion', description: 'Finished fifty games.', icon: 'crown', rule: { type: 'completions', count: 50 } },
  { key: 'memory_master', name: 'Memory Master', description: 'Finished Memory Cards on hard.', icon: 'brain', rule: { type: 'completions', gameId: 'memory-cards', difficulty: 'hard', count: 1 } },
  { key: 'puzzle_pro', name: 'Puzzle Pro', description: 'Finished five jigsaw puzzles.', icon: 'puzzle', rule: { type: 'completions', gameId: 'jigsaw', count: 5 } },
  { key: 'curious_mind', name: 'Curious Mind', description: 'Read ten Did You Know? facts.', icon: 'lightbulb', rule: { type: 'facts_read', count: 10 } },
  { key: 'quiz_whiz', name: 'Quiz Whiz', description: 'Answered ten quiz questions correctly.', icon: 'check', rule: { type: 'quiz_correct', count: 10 } },
  { key: 'paper_folder', name: 'Paper Folder', description: 'Completed your first craft.', icon: 'scissors', rule: { type: 'crafts_done', count: 1 } },
  { key: 'craft_club', name: 'Craft Club', description: 'Completed five crafts.', icon: 'palette', rule: { type: 'crafts_done', count: 5 } },
] as const;
