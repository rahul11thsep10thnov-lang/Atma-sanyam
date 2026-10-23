// The forty tutorials. Each one describes the controls the game really has
// (see src/games/defs/*.tsx): tap, drag, swipe, roll, select. The "try it"
// step asks for one real-looking move on a tiny board.
import type { GridScene, IconsScene, GestureScene, TutorialDefinition, TutorialStep } from './types';

const grid = (rows: string[][], extra: Partial<GridScene> = {}): GridScene => ({ kind: 'grid', rows, ...extra });
const icons = (items: { emoji: string; label: string }[], caption?: string): IconsScene => ({ kind: 'icons', items, caption });
const gesture = (g: GestureScene['gesture'], emoji: string, caption?: string): GestureScene => ({ kind: 'gesture', gesture: g, emoji, caption });

function tutorial(gameId: string, meet: Omit<TutorialStep, 'kind'>, controls: Omit<TutorialStep, 'kind'>, demo: Omit<TutorialStep, 'kind'>, tryIt: Omit<TutorialStep, 'kind'> & { target: { prompt: string; label?: string } }, play: Omit<TutorialStep, 'kind'>): TutorialDefinition {
  return { gameId, steps: [{ kind: 'meet', ...meet }, { kind: 'controls', ...controls }, { kind: 'demo', ...demo }, { kind: 'tryIt', ...tryIt }, { kind: 'play', ...play }] };
}

const PLAY = (text: string, emoji: string, little?: string): Omit<TutorialStep, 'kind'> => ({ text, textByBracket: little ? { A: little } : undefined, scene: gesture('tap', emoji) });

export const TUTORIALS: Record<string, TutorialDefinition> = {
  // ---------------------------------------------------------------- matching & memory
  'picture-matching': tutorial(
    'picture-matching',
    { text: 'All the pictures are face up. Every picture has a twin somewhere on the board.', textByBracket: { A: 'Find two pictures that are the same!' }, scene: grid([['🐥', '🐶', '🐱'], ['🐶', '🐱', '🐥']]) },
    { text: 'Tap a picture, then tap its twin. Matched pairs light up and stay.', textByBracket: { A: 'Tap one. Then tap the same one.' }, scene: gesture('tap', '🐥', 'Tap, then tap the twin') },
    { text: 'Watch: tap the duck… then the other duck. A match!', scene: grid([['🐥', '🐶', '🐱'], ['🐶', '🐱', '🐥']], { highlight: [[0, 0], [1, 2]], frames: [[['🐥', '🐶', '🐱'], ['🐶', '🐱', '🐥']], [['✨', '🐶', '🐱'], ['🐶', '🐱', '🐥']], [['✨', '🐶', '🐱'], ['🐶', '🐱', '✨']]] }) },
    { text: 'Your turn: the dog is picked. Tap the other dog.', textByBracket: { A: 'Tap the other dog!' }, scene: grid([['✨', '🐶', '🐱'], ['🐶', '🐱', '✨']], { highlight: [[1, 0]] }), target: { prompt: 'Tap the other dog' } },
    PLAY('Match every pair to win. Fewer wrong taps, more stars!', '🐥', 'Find all the twins!')
  ),
  'memory-cards': tutorial(
    'memory-cards',
    { text: 'The cards are face down. Each picture is hidden on two cards.', textByBracket: { A: 'The cards are hiding. Find two the same!' }, scene: grid([['🂠', '🂠', '🂠', '🂠'], ['🂠', '🂠', '🂠', '🂠']]) },
    { text: 'Tap a card to flip it. Tap a second card. If they match, they stay open; if not, they flip back.', textByBracket: { A: 'Tap a card. Tap another. Same? They stay!' }, scene: gesture('tap', '🂠', 'Flip two cards') },
    { text: 'Watch: flip… a star. Flip… a star! They match and stay open.', scene: grid([['🂠', '🂠', '🂠', '🂠'], ['🂠', '🂠', '🂠', '🂠']], { frames: [[['⭐', '🂠', '🂠', '🂠'], ['🂠', '🂠', '🂠', '🂠']], [['⭐', '🂠', '🂠', '🂠'], ['🂠', '🂠', '⭐', '🂠']], [['✅', '🂠', '🂠', '🂠'], ['🂠', '🂠', '✅', '🂠']]] }) },
    { text: 'You remember a 🍎 was here. Tap the glowing card to flip it.', textByBracket: { A: 'Tap the glowing card!' }, scene: grid([['🍎', '🂠', '🂠', '🂠'], ['🂠', '🂠', '🂠', '🂠']], { highlight: [[1, 3]] }), target: { prompt: 'Tap the glowing card' } },
    PLAY('Remember where the pictures are. Fewer moves = more stars.', '🃏', 'Find all the pairs!')
  ),
  'shape-sorting': tutorial(
    'shape-sorting',
    { text: 'Shapes on one side, holes on the other. Every shape fits one hole.', textByBracket: { A: 'Put each shape in its hole!' }, scene: icons([{ emoji: '🔵', label: 'circle' }, { emoji: '🟥', label: 'square' }, { emoji: '🔺', label: 'triangle' }]) },
    { text: 'Press a shape and drag it onto the hole with the same shape. Let go to drop it.', textByBracket: { A: 'Hold a shape. Pull it to its hole. Let go!' }, scene: gesture('drag', '🔵', 'Drag a shape to its hole') },
    { text: 'Watch: the circle slides over to the round hole and clicks in.', scene: grid([['🔵', '', '⚪'], ['🟥', '', '⬜']], { arrow: { from: [0, 0], to: [0, 2] }, frames: [[['🔵', '', '⚪'], ['🟥', '', '⬜']], [['', '🔵', '⚪'], ['🟥', '', '⬜']], [['', '', '✅'], ['🟥', '', '⬜']]] }) },
    { text: 'Your turn: where does the square go? Tap the square hole.', textByBracket: { A: 'Tap the square hole!' }, scene: grid([['', '', '✅'], ['🟥', '', '⬜']], { highlight: [[1, 2]] }), target: { prompt: 'Tap the matching hole' } },
    PLAY('Sort every shape into its hole. Spoken help tells you the names.', '🔷', 'Sort all the shapes!')
  ),
  'colour-matching': tutorial(
    'colour-matching',
    { text: 'A colour is shown. Some things are the same colour, some are not.', textByBracket: { A: 'Find the same colour!' }, scene: icons([{ emoji: '🔴', label: 'red' }, { emoji: '🍎', label: 'apple' }, { emoji: '🍌', label: 'banana' }]) },
    { text: 'Tap the thing that is the same colour as the big splash.', textByBracket: { A: 'Tap the same colour.' }, scene: gesture('tap', '🍎', 'Tap the matching colour') },
    { text: 'Watch: the splash is red… the apple is red! Tap the apple.', scene: grid([['🔴'], ['🍎', '🍌', '🥦']], { highlight: [[1, 0]] }) },
    { text: 'Your turn: the splash is yellow. Tap the yellow thing.', textByBracket: { A: 'Tap yellow!' }, scene: grid([['🟡'], ['🍎', '🍌', '🥦']], { highlight: [[1, 1]] }), target: { prompt: 'Tap the yellow one' } },
    PLAY('Keep matching colours. Every right tap makes the rainbow grow.', '🌈', 'Match the colours!')
  ),
  // ---------------------------------------------------------------- puzzles
  jigsaw: tutorial(
    'jigsaw',
    { text: 'A picture is cut into pieces. The pieces wait in the tray below the board.', textByBracket: { A: 'Put the picture back together!' }, scene: grid([['🟦', '🟩'], ['🟨', '🟥']], { caption: 'The finished picture' }) },
    { text: 'Press a piece in the tray and drag it onto the board. Drop it where it belongs; wrong spots bounce back.', textByBracket: { A: 'Hold a piece. Pull it to its place.' }, scene: gesture('drag', '🧩', 'Drag pieces onto the board') },
    { text: 'Watch: the blue corner slides up to the top-left and snaps in.', scene: grid([['', ''], ['', ''], ['🟦', '🟩']], { arrow: { from: [2, 0], to: [0, 0] }, frames: [[['', ''], ['', ''], ['🟦', '🟩']], [['', ''], ['🟦', ''], ['', '🟩']], [['🟦', ''], ['', ''], ['', '🟩']]] }) },
    { text: 'Your turn: the green piece goes top-right. Tap that empty spot.', textByBracket: { A: 'Tap the glowing spot!' }, scene: grid([['🟦', ''], ['', ''], ['', '🟩']], { highlight: [[0, 1]] }), target: { prompt: 'Tap where the green piece goes' } },
    PLAY('Place every piece. Bigger puzzles have more pieces and more stars.', '🧩', 'Finish the picture!')
  ),
  'spot-the-difference': tutorial(
    'spot-the-difference',
    { text: 'Two pictures look the same, but a few things are different in the second one.', scene: grid([['🌳', '🏠', '☀️'], ['🌳', '🏠', '🌙']], { caption: 'Top: picture 1 · Bottom: picture 2' }) },
    { text: 'Look carefully, then tap a thing in the SECOND picture that is different. Found ones get a tick.', scene: gesture('tap', '👀', 'Tap the difference in picture 2') },
    { text: 'Watch: sun in picture 1, moon in picture 2. Tap the moon!', scene: grid([['🌳', '🏠', '☀️'], ['🌳', '🏠', '🌙']], { highlight: [[1, 2]], frames: [[['🌳', '🏠', '☀️'], ['🌳', '🏠', '🌙']], [['🌳', '🏠', '☀️'], ['🌳', '🏠', '✅']]] }) },
    { text: 'Your turn: find what changed and tap it in the second picture.', scene: grid([['🐱', '🚗', '🌼'], ['🐶', '🚗', '🌼']], { highlight: [[1, 0]] }), target: { prompt: 'Tap the thing that changed' } },
    PLAY('Find every difference before the clock runs down. Wrong taps cost a little time.', '👀')
  ),
  'hidden-object': tutorial(
    'hidden-object',
    { text: 'A busy scene full of things. A list shows which ones to find.', scene: grid([['🌳', '🎈', '🐦'], ['🏠', '🔑', '🌼'], ['🚲', '🐸', '⭐']], { caption: 'Find: 🔑 ⭐ 🐸' }) },
    { text: 'Look through the scene and tap each thing on the list. Found ones are crossed off.', scene: gesture('tap', '🔎', 'Tap the listed objects') },
    { text: 'Watch: the list wants a key… there it is, in the middle. Tap!', scene: grid([['🌳', '🎈', '🐦'], ['🏠', '🔑', '🌼'], ['🚲', '🐸', '⭐']], { highlight: [[1, 1]], frames: [[['🌳', '🎈', '🐦'], ['🏠', '🔑', '🌼'], ['🚲', '🐸', '⭐']], [['🌳', '🎈', '🐦'], ['🏠', '✅', '🌼'], ['🚲', '🐸', '⭐']]] }) },
    { text: 'Your turn: find the star.', scene: grid([['🌳', '🎈', '🐦'], ['🏠', '✅', '🌼'], ['🚲', '🐸', '⭐']], { highlight: [[2, 2]] }), target: { prompt: 'Tap the star' } },
    PLAY('Find everything on the list. Harder levels hide more things in bigger scenes.', '🔎')
  ),
  'maze-runner': tutorial(
    'maze-runner',
    { text: 'You are the runner. The flag is the goal. Walls block the way.', textByBracket: { A: 'Help the runner reach the flag!' }, scene: grid([['🏃', '', '⬛'], ['⬛', '', '⬛'], ['⬛', '', '🏁']]) },
    { text: 'Swipe up, down, left or right — or tap the arrow buttons — to move one step.', textByBracket: { A: 'Tap the arrows to move.' }, scene: gesture('swipe', '🏃', 'Swipe or tap arrows') },
    { text: 'Watch: right, down, down, right — the runner reaches the flag.', scene: grid([['🏃', '', '⬛'], ['⬛', '', '⬛'], ['⬛', '', '🏁']], { frames: [[['🏃', '', '⬛'], ['⬛', '', '⬛'], ['⬛', '', '🏁']], [['', '🏃', '⬛'], ['⬛', '', '⬛'], ['⬛', '', '🏁']], [['', '', '⬛'], ['⬛', '🏃', '⬛'], ['⬛', '', '🏁']], [['', '', '⬛'], ['⬛', '', '⬛'], ['⬛', '🏃', '🏁']], [['', '', '⬛'], ['⬛', '', '⬛'], ['⬛', '', '🎉']]] }) },
    { text: 'Your turn: which way first? Tap the open square next to the runner.', textByBracket: { A: 'Tap the glowing square!' }, scene: grid([['🏃', '', '⬛'], ['⬛', '', '⬛'], ['⬛', '', '🏁']], { highlight: [[0, 1]] }), target: { prompt: 'Tap the way forward' } },
    PLAY('Reach the flag in as few moves as you can. Bigger mazes, more stars.', '🏃', 'Find the flag!')
  ),
  'sliding-puzzle': tutorial(
    'sliding-puzzle',
    { text: 'Numbered tiles with one empty space. The goal: 1, 2, 3… in order.', scene: grid([['1️⃣', '2️⃣', '3️⃣'], ['4️⃣', '5️⃣', '6️⃣'], ['7️⃣', '', '8️⃣']]) },
    { text: 'Tap a tile next to the empty space to slide it in. Only neighbours of the gap can move.', scene: gesture('tap', '8️⃣', 'Tap a tile beside the gap') },
    { text: 'Watch: the 8 is beside the gap. Tap it — it slides left. Solved!', scene: grid([['1️⃣', '2️⃣', '3️⃣'], ['4️⃣', '5️⃣', '6️⃣'], ['7️⃣', '', '8️⃣']], { highlight: [[2, 2]], frames: [[['1️⃣', '2️⃣', '3️⃣'], ['4️⃣', '5️⃣', '6️⃣'], ['7️⃣', '', '8️⃣']], [['1️⃣', '2️⃣', '3️⃣'], ['4️⃣', '5️⃣', '6️⃣'], ['7️⃣', '8️⃣', '✅']]] }) },
    { text: 'Your turn: tap the tile that can slide into the gap.', scene: grid([['1️⃣', '2️⃣', '3️⃣'], ['4️⃣', '', '6️⃣'], ['7️⃣', '5️⃣', '8️⃣']], { highlight: [[2, 1]] }), target: { prompt: 'Tap the 5' } },
    PLAY('Slide the tiles into order. Fewer moves, more stars.', '🔢')
  ),
  sudoku: tutorial(
    'sudoku',
    { text: 'A grid with some numbers filled in. Every row, column and box must have each number once.', scene: grid([['1', '2', '', '4'], ['', '4', '1', ''], ['2', '', '4', '1'], ['4', '1', '', '']], { caption: '4×4: use 1–4 once per row, column and box' }) },
    { text: 'Tap an empty cell to select it, then tap a number from the pad. Mistakes glow red; tap again to change.', scene: gesture('tap', '9️⃣', 'Select a cell, tap a number') },
    { text: 'Watch: top row has 1, 2, 4 — only 3 is missing. Select the gap, tap 3.', scene: grid([['1', '2', '', '4'], ['', '4', '1', ''], ['2', '', '4', '1'], ['4', '1', '', '']], { highlight: [[0, 2]], frames: [[['1', '2', '', '4'], ['', '4', '1', ''], ['2', '', '4', '1'], ['4', '1', '', '']], [['1', '2', '3', '4'], ['', '4', '1', ''], ['2', '', '4', '1'], ['4', '1', '', '']]] }) },
    { text: 'Your turn: the last row has 4 and 1. Which cell will you fill first? Tap an empty cell in it.', scene: grid([['1', '2', '3', '4'], ['', '4', '1', ''], ['2', '', '4', '1'], ['4', '1', '', '']], { highlight: [[3, 2]] }), target: { prompt: 'Tap an empty cell in the last row' } },
    PLAY('Fill the whole grid with no repeats. Start small and work up to 9×9.', '9️⃣')
  ),
  'word-search': tutorial(
    'word-search',
    { text: 'Letters in a grid hide words from the list — across, down or diagonally.', scene: grid([['C', 'A', 'T'], ['X', 'O', 'P'], ['D', 'G', 'Q']], { caption: 'Find: CAT' }) },
    { text: 'Press the first letter and drag in a straight line to the last letter, then let go.', scene: gesture('drag', '🔠', 'Drag across the letters') },
    { text: 'Watch: C… A… T — drag across the top row. Found!', scene: grid([['C', 'A', 'T'], ['X', 'O', 'P'], ['D', 'G', 'Q']], { arrow: { from: [0, 0], to: [0, 2] }, frames: [[['C', 'A', 'T'], ['X', 'O', 'P'], ['D', 'G', 'Q']], [['✅', '✅', '✅'], ['X', 'O', 'P'], ['D', 'G', 'Q']]] }) },
    { text: 'Your turn: DOG starts at the bottom-left D. Tap it to begin.', scene: grid([['C', 'A', 'T'], ['X', 'O', 'P'], ['D', 'O', 'G']], { highlight: [[2, 0]] }), target: { prompt: 'Tap the D' } },
    PLAY('Find every word in the list. Longer lists and bigger grids on harder levels.', '🔠')
  ),
  'anagram-builder': tutorial(
    'anagram-builder',
    { text: 'Jumbled letters and a picture clue. Spell the word the picture shows.', scene: icons([{ emoji: '🐱', label: 'clue' }, { emoji: 'T', label: '' }, { emoji: 'A', label: '' }, { emoji: 'C', label: '' }]) },
    { text: 'Tap the letters in order to build the word. Tap Undo to take one back, Hint for help.', scene: gesture('tap', '🔡', 'Tap letters in order') },
    { text: 'Watch: picture is a cat. Tap C, then A, then T.', scene: grid([['T', 'A', 'C'], ['', '', '']], { frames: [[['T', 'A', 'C'], ['', '', '']], [['T', 'A', ''], ['C', '', '']], [['T', '', ''], ['C', 'A', '']], [['', '', ''], ['C', 'A', 'T']]] }) },
    { text: 'Your turn: the picture is a dog. Which letter comes first? Tap it.', scene: grid([['G', 'D', 'O'], ['', '', '']], { highlight: [[0, 1]], caption: '🐶' }), target: { prompt: 'Tap the first letter of DOG' } },
    PLAY('Spell each word. Fewer hints, more stars.', '🔡')
  ),
  tangram: tutorial(
    'tangram',
    { text: 'Seven flat pieces make a picture when they fit inside the outline.', scene: icons([{ emoji: '🔺', label: 'triangles' }, { emoji: '🟥', label: 'square' }, { emoji: '🔶', label: 'parallelogram' }]) },
    { text: 'Drag a piece onto the outline. Tap a piece to rotate it. Pieces snap when they fit.', scene: gesture('drag', '📐', 'Drag to move, tap to rotate') },
    { text: 'Watch: the big triangle drags into the roof of the house and snaps.', scene: grid([['', '⬜', ''], ['⬜', '⬜', '⬜'], ['🔺', '', '']], { arrow: { from: [2, 0], to: [0, 1] }, frames: [[['', '⬜', ''], ['⬜', '⬜', '⬜'], ['🔺', '', '']], [['', '🔺', ''], ['⬜', '⬜', '⬜'], ['', '', '']]] }) },
    { text: 'Your turn: the square fits the middle. Tap the middle outline.', scene: grid([['', '🔺', ''], ['⬜', '⬜', '⬜'], ['🟥', '', '']], { highlight: [[1, 1]] }), target: { prompt: 'Tap where the square goes' } },
    PLAY('Fit all seven pieces. Easy levels show the outline of each piece.', '📐')
  ),
  // ---------------------------------------------------------------- board & strategy
  'connect-four': tutorial(
    'connect-four',
    { text: 'You are red, the computer is yellow. Discs fall to the bottom of a column.', scene: grid([['', '', '', ''], ['', '', '', ''], ['', '🔴', '🟡', '']]) },
    { text: 'Tap a column to drop your disc into it. Then the computer drops one.', scene: gesture('tap', '🔴', 'Tap a column') },
    { text: 'Watch: red has three in a row. Tap the fourth column — four in a row wins!', scene: grid([['', '', '', ''], ['', '', '', ''], ['🔴', '🔴', '🔴', '']], { highlight: [[2, 3]], frames: [[['', '', '', ''], ['', '', '', ''], ['🔴', '🔴', '🔴', '']], [['', '', '', ''], ['', '', '', ''], ['🔴', '🔴', '🔴', '🔴']]] }) },
    { text: 'Your turn: yellow has three in a row. Block it! Tap the column that stops the win.', scene: grid([['', '', '', ''], ['', '', '', ''], ['🟡', '🟡', '🟡', '']], { highlight: [[2, 3]] }), target: { prompt: 'Tap the column to block' } },
    PLAY('Get four in a row — across, down or diagonally — before the computer does.', '🔴')
  ),
  checkers: tutorial(
    'checkers',
    { text: 'Checkers on the dark squares. Pieces move diagonally forward one square.', scene: grid([['', '⚫', '', '⚫'], ['', '', '', ''], ['⚪', '', '⚪', '']]) },
    { text: 'Tap a piece to select it; its legal squares glow. Tap a glowing square to move. Jump over an enemy to capture it.', scene: gesture('tap', '⚫', 'Select, then tap a glowing square') },
    { text: 'Watch: black jumps over white and lands beyond — white is captured.', scene: grid([['', '⚫', '', ''], ['', '', '⚪', ''], ['', '', '', '']], { arrow: { from: [0, 1], to: [2, 3] }, frames: [[['', '⚫', '', ''], ['', '', '⚪', ''], ['', '', '', '']], [['', '', '', ''], ['', '', '', ''], ['', '', '', '⚫']]] }) },
    { text: 'Your turn: your piece is selected. Tap the glowing square to move.', scene: grid([['', '', '', ''], ['', '', '', ''], ['', '⚫', '', '']], { highlight: [[1, 0]] }), target: { prompt: 'Tap the glowing square' } },
    PLAY('Capture all the computer\'s pieces. Reach the far side to crown a king that moves backwards too.', '⚫')
  ),
  chess: tutorial(
    'chess',
    { text: 'You play white. Each piece moves its own way. The aim: trap the enemy king (checkmate).', textByBracket: { B: 'White pieces are yours. Catch the black king!' }, scene: grid([['♜', '♞', '♝', '♛'], ['♟', '♟', '♟', '♟'], ['♙', '♙', '♙', '♙'], ['♖', '♘', '♗', '♕']]) },
    { text: 'Tap a piece: dots show where it may go. Tap a dot to move. In Learn-the-moves level, each piece explains itself.', scene: gesture('tap', '♟️', 'Tap a piece, then a dot') },
    { text: 'Watch: the knight jumps in an L — two up, one across — over other pieces.', scene: grid([['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '♘', '', '']], { arrow: { from: [3, 1], to: [1, 2] }, frames: [[['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '♘', '', '']], [['', '', '', ''], ['', '', '♘', ''], ['', '', '', ''], ['', '', '', '']]] }) },
    { text: 'Your turn: the pawn is selected. Pawns move straight ahead. Tap the glowing square.', scene: grid([['', '', '', ''], ['', '', '', ''], ['', '♙', '', ''], ['', '', '', '']], { highlight: [[1, 1]] }), target: { prompt: 'Tap the glowing square' } },
    PLAY('Check! means the king is attacked. Checkmate wins. Practice levels let you undo a move.', '♟️')
  ),
  ludo: tutorial(
    'ludo',
    { text: 'Four tokens each. Race them around the board and into the home triangle in the middle.', textByBracket: { B: 'Roll the dice and race your tokens home!' }, scene: grid([['🔴', '', '', '🟢'], ['', '🏠', '🏠', ''], ['', '🏠', '🏠', ''], ['🔵', '', '', '🟡']]) },
    { text: 'Tap the dice to roll. Then tap one of your glowing tokens to move it that many squares. A 6 lets a token leave the base and gives another roll.', scene: gesture('tap', '🎲', 'Tap the dice, then a token') },
    { text: 'Watch: roll a 6 — a token leaves the base. Roll a 3 — it moves three squares.', scene: grid([['🔴', '', '', ''], ['', '', '', '']], { frames: [[['🔴', '', '', ''], ['', '', '', '']], [['', '🔴', '', ''], ['', '', '', '']], [['', '', '', ''], ['', '', '', '🔴']]] }) },
    { text: 'Your turn: you rolled a 6. Tap the glowing token to bring it out.', textByBracket: { B: 'Tap the glowing token!' }, scene: grid([['🔴', '', '', ''], ['', '', '', '']], { highlight: [[0, 0]] }), target: { prompt: 'Tap the glowing token' } },
    PLAY('Land on an opponent to send it home (not on star safe squares). First to get all four tokens home wins.', '🎲')
  ),
  'snakes-and-ladders': tutorial(
    'snakes-and-ladders',
    { text: 'A board from 1 to 100. Ladders carry you up, snakes slide you down.', textByBracket: { B: 'Climb ladders, dodge snakes, reach 100!' }, scene: grid([['🏁', '', '🪜'], ['🐍', '', ''], ['🧒', '', '']]) },
    { text: 'Tap the dice to roll. Your piece moves by itself. Then the robot rolls.', textByBracket: { B: 'Tap the dice!' }, scene: gesture('tap', '🎲', 'Tap the dice') },
    { text: 'Watch: a 4 lands on a ladder — up you go! A snake head sends you back down.', scene: grid([['', '🪜', ''], ['', '', ''], ['🧒', '', '']], { frames: [[['', '🪜', ''], ['', '', ''], ['🧒', '', '']], [['', '🪜', ''], ['', '🧒', ''], ['', '', '']], [['', '🧒', ''], ['', '', ''], ['', '', '']]] }) },
    { text: 'Your turn: tap the dice to roll.', textByBracket: { B: 'Tap the dice!' }, scene: grid([['🎲']], { highlight: [[0, 0]] }), target: { prompt: 'Tap the dice' } },
    PLAY('Exactly 100 wins. A roll that goes past 100 does not move. Rolling a 6 gives another turn.', '🐍')
  ),
  // ---------------------------------------------------------------- arcade
  'bubble-shooter': tutorial(
    'bubble-shooter',
    { text: 'Coloured bubbles hang from the top. Three or more of the same colour pop.', scene: grid([['🔴', '🔵', '🔴', '🟢'], ['🔵', '🔴', '🟢', ''], ['', '', '', ''], ['', '🔴', '', '']]) },
    { text: 'Tap anywhere to shoot the bubble at the bottom in that direction. Bubbles bounce off the walls.', scene: gesture('tap', '🫧', 'Tap where to shoot') },
    { text: 'Watch: a red bubble flies up and lands next to two reds — pop!', scene: grid([['🔴', '🔵', '🔴', '🟢'], ['🔵', '🔴', '🟢', ''], ['', '', '', ''], ['', '🔴', '', '']], { arrow: { from: [3, 1], to: [1, 0] }, frames: [[['🔴', '🔵', '🔴', '🟢'], ['🔵', '🔴', '🟢', ''], ['', '', '', ''], ['', '🔴', '', '']], [['🔴', '🔵', '🔴', '🟢'], ['🔵', '🔴', '🟢', ''], ['🔴', '', '', ''], ['', '', '', '']], [['💥', '🔵', '💥', '🟢'], ['🔵', '💥', '🟢', ''], ['💥', '', '', ''], ['', '', '', '']]] }) },
    { text: 'Your turn: a blue bubble is loaded. Tap near the blues to shoot there.', scene: grid([['🔵', '🔵', '🔴', '🟢'], ['', '', '', ''], ['', '', '', ''], ['', '🔵', '', '']], { highlight: [[0, 0]] }), target: { prompt: 'Tap near the blue bubbles' } },
    PLAY('Clear the board before the bubbles reach the bottom.', '🫧')
  ),
  'match-3': tutorial(
    'match-3',
    { text: 'A grid of sweets. Three or more in a row or column disappear and score.', scene: grid([['🍬', '🍭', '🍬'], ['🍭', '🍬', '🍭'], ['🍬', '🍭', '🍫']]) },
    { text: 'Tap a sweet, then tap a neighbour to swap them. Only swaps that make a match count.', scene: gesture('tap', '🍬', 'Tap two neighbours to swap') },
    { text: 'Watch: swap the bottom-right chocolate with the lolly above… three lollies in a column!', scene: grid([['🍬', '🍭', '🍬'], ['🍭', '🍬', '🍭'], ['🍬', '🍭', '🍫']], { highlight: [[2, 2], [1, 2]], frames: [[['🍬', '🍭', '🍬'], ['🍭', '🍬', '🍭'], ['🍬', '🍭', '🍫']], [['🍬', '🍭', '🍬'], ['🍭', '🍬', '🍫'], ['🍬', '🍭', '🍭']], [['🍬', '🍭', '🍬'], ['🍭', '🍬', '🍫'], ['🍬', '✨', '✨']]] }) },
    { text: 'Your turn: tap the glowing sweet, then its neighbour, to make three in a row.', scene: grid([['🍬', '🍬', '🍭'], ['🍭', '🍭', '🍬']], { highlight: [[0, 2]] }), target: { prompt: 'Tap the glowing sweet' } },
    PLAY('Reach the target score before the moves run out. Bigger matches score more.', '🍬')
  ),
  'block-puzzle': tutorial(
    'block-puzzle',
    { text: 'A 10×10 board and three pieces to place. Full rows or columns clear.', scene: grid([['🟦', '🟦', '🟦', ''], ['🟦', '🟦', '', ''], ['', '', '', '']]) },
    { text: 'Drag a piece from the tray onto the board and let go where it fits.', scene: gesture('drag', '🟦', 'Drag pieces onto the board') },
    { text: 'Watch: the single block fills the last gap — the row clears!', scene: grid([['🟦', '🟦', '🟦', ''], ['🟦', '🟦', '', ''], ['', '', '', '']], { highlight: [[0, 3]], frames: [[['🟦', '🟦', '🟦', ''], ['🟦', '🟦', '', ''], ['', '', '', '']], [['🟦', '🟦', '🟦', '🟦'], ['🟦', '🟦', '', ''], ['', '', '', '']], [['', '', '', ''], ['🟦', '🟦', '', ''], ['', '', '', '']]] }) },
    { text: 'Your turn: where does a 2-block fit to finish the second row? Tap the glowing gap.', scene: grid([['', '', '', ''], ['🟦', '🟦', '', ''], ['', '', '', '']], { highlight: [[1, 2]] }), target: { prompt: 'Tap the gap' } },
    PLAY('Keep placing pieces. The game ends when nothing fits — plan ahead!', '🟦')
  ),
  // ---------------------------------------------------------------- creative
  'connect-the-dots': tutorial(
    'connect-the-dots',
    { text: 'Numbered dots hide a picture. Join them in order and it appears.', textByBracket: { A: 'Tap the numbers in order!' }, scene: grid([['1️⃣', '', '2️⃣'], ['', '', ''], ['4️⃣', '', '3️⃣']]) },
    { text: 'Tap dot 1, then 2, then 3… A line joins each pair.', textByBracket: { A: 'Tap 1, then 2, then 3.' }, scene: gesture('tap', '✏️', 'Tap the dots in order') },
    { text: 'Watch: 1… 2… 3… 4 — a square appears!', scene: grid([['1️⃣', '', '2️⃣'], ['', '', ''], ['4️⃣', '', '3️⃣']], { frames: [[['1️⃣', '', '2️⃣'], ['', '', ''], ['4️⃣', '', '3️⃣']], [['✅', '➖', '✅'], ['', '', ''], ['4️⃣', '', '3️⃣']], [['✅', '➖', '✅'], ['', '', '|'], ['4️⃣', '', '✅']], [['✅', '➖', '✅'], ['|', '', '|'], ['✅', '➖', '✅']]] }) },
    { text: 'Your turn: dot 1 is done. Tap dot 2.', textByBracket: { A: 'Tap number 2!' }, scene: grid([['✅', '', '2️⃣'], ['', '', ''], ['4️⃣', '', '3️⃣']], { highlight: [[0, 2]] }), target: { prompt: 'Tap dot 2' } },
    PLAY('Join every dot to finish the picture, then colour it in!', '✏️', 'Join all the dots!')
  ),
  'colouring-book': tutorial(
    'colouring-book',
    { text: 'A black-and-white picture made of regions, and a palette of colours.', textByBracket: { A: 'Colour the picture!' }, scene: icons([{ emoji: '🖼️', label: 'picture' }, { emoji: '🔴', label: '' }, { emoji: '🟡', label: '' }, { emoji: '🔵', label: '' }]) },
    { text: 'Tap a colour, then tap a part of the picture to fill it. Tap Clear to start again.', textByBracket: { A: 'Tap a colour. Tap the picture.' }, scene: gesture('tap', '🖍️', 'Pick a colour, tap a region') },
    { text: 'Watch: pick yellow, tap the sun — it fills in.', scene: grid([['☀️', '☁️'], ['🏠', '🌳']], { highlight: [[0, 0]], frames: [[['⚪', '⚪'], ['⚪', '⚪']], [['🟡', '⚪'], ['⚪', '⚪']]] }) },
    { text: 'Your turn: green is picked. Tap the tree.', textByBracket: { A: 'Tap the tree!' }, scene: grid([['🟡', '⚪'], ['⚪', '🌳']], { highlight: [[1, 1]] }), target: { prompt: 'Tap the tree' } },
    PLAY('Colour the whole picture any way you like, then tap Done.', '🖍️', 'Make it colourful!')
  ),
  'drawing-canvas': tutorial(
    'drawing-canvas',
    { text: 'A blank canvas, brushes of different sizes, colours and stamps.', textByBracket: { A: 'Draw anything you like!' }, scene: icons([{ emoji: '🖌️', label: 'brush' }, { emoji: '🎨', label: 'colours' }, { emoji: '⭐', label: 'stamps' }, { emoji: '↩️', label: 'undo' }]) },
    { text: 'Drag your finger to paint. Tap a colour or brush size to change. Tap a stamp, then tap the canvas to place it. Undo takes back the last stroke.', textByBracket: { A: 'Move your finger to paint!' }, scene: gesture('drag', '🖌️', 'Drag to paint') },
    { text: 'Watch: a red stroke, a blue stroke, and a star stamp.', scene: grid([['', '', ''], ['', '', ''], ['', '', '']], { frames: [[['🔴', '🔴', ''], ['', '', ''], ['', '', '']], [['🔴', '🔴', ''], ['🔵', '🔵', '🔵'], ['', '', '']], [['🔴', '🔴', '⭐'], ['🔵', '🔵', '🔵'], ['', '', '']]] }) },
    { text: 'Your turn: tap the canvas to make a mark.', textByBracket: { A: 'Tap the canvas!' }, scene: grid([['', '', ''], ['', '🎨', ''], ['', '', '']], { highlight: [[1, 1]] }), target: { prompt: 'Tap the canvas' } },
    PLAY('Draw, stamp and colour. Tap Done to finish your masterpiece.', '🎨', 'Paint something!')
  ),
  'origami-studio': tutorial(
    'origami-studio',
    { text: 'Real paper folding, step by step. Pick a model and follow the diagrams with a sheet of paper.', scene: icons([{ emoji: '📄', label: 'paper' }, { emoji: '🦢', label: 'crane' }, { emoji: '🐸', label: 'frog' }]) },
    { text: 'Tap a model. Tap Next for the next fold, Back to see the last one again, Replay to watch the fold animate.', scene: gesture('tap', '🦢', 'Next · Back · Replay') },
    { text: 'Watch: the square folds in half to a triangle, then the corners fold in.', scene: grid([['📄']], { frames: [[['📄']], [['🔺']], [['🦢']]] }) },
    { text: 'Your turn: tap Next to see the first fold.', scene: grid([['⬅️ Back', 'Next ➡️']], { highlight: [[0, 1]] }), target: { prompt: 'Tap Next' } },
    PLAY('Fold along with every step. A grown-up can help with sharp creases.', '🦢')
  ),
  'paper-airplane': tutorial(
    'paper-airplane',
    { text: 'Fold a real paper plane with the guide, choose a design, then test-fly it on screen.', scene: icons([{ emoji: '📄', label: 'fold' }, { emoji: '✈️', label: 'design' }, { emoji: '💨', label: 'fly' }]) },
    { text: 'Tap Next through the folds. Choose wing shape and nose weight. Then drag back and release to throw — the angle and power decide the flight.', scene: gesture('drag', '✈️', 'Drag back, release to throw') },
    { text: 'Watch: a smooth throw at a gentle angle glides far.', scene: grid([['', '', '', ''], ['✈️', '', '', '']], { frames: [[['', '', '', ''], ['✈️', '', '', '']], [['', '✈️', '', ''], ['', '', '', '']], [['', '', '✈️', ''], ['', '', '', '']], [['', '', '', ''], ['', '', '', '✈️']]] }) },
    { text: 'Your turn: tap the plane to get ready to throw.', scene: grid([['', '', ''], ['✈️', '', '']], { highlight: [[1, 0]] }), target: { prompt: 'Tap the plane' } },
    PLAY('Fly as far as you can. Try different designs and see which glides best.', '✈️')
  ),
  // ---------------------------------------------------------------- simulation
  'virtual-garden': tutorial(
    'virtual-garden',
    { text: 'Garden beds to plant, water and weed. Plants grow while you play.', textByBracket: { A: 'Grow a garden!' }, scene: grid([['🟫', '🟫', '🟫'], ['🟫', '🟫', '🟫']]) },
    { text: 'Tap a tool (seed, water, weeder), then tap a bed to use it there.', textByBracket: { A: 'Tap a tool. Tap the soil.' }, scene: icons([{ emoji: '🌱', label: 'seed' }, { emoji: '💧', label: 'water' }, { emoji: '🧤', label: 'weed' }]) },
    { text: 'Watch: seed, water, wait… a flower! Weeds must be pulled or they slow growth.', scene: grid([['🟫', '🟫'], ['🟫', '🟫']], { frames: [[['🌱', '🟫'], ['🟫', '🟫']], [['💧', '🟫'], ['🟫', '🟫']], [['🌿', '🟫'], ['🟫', '🟫']], [['🌻', '🟫'], ['🟫', '🟫']]] }) },
    { text: 'Your turn: the seed tool is chosen. Tap a bed to plant.', textByBracket: { A: 'Tap the soil to plant!' }, scene: grid([['🌻', '🟫'], ['🟫', '🟫']], { highlight: [[0, 1]] }), target: { prompt: 'Tap a bed' } },
    PLAY('Grow every bed into flowers. Keep watering and weeding!', '🌻', 'Grow all the flowers!')
  ),
  'physics-lab': tutorial(
    'physics-lab',
    { text: 'A ball drops from the top. Place ramps and bumpers so it lands in the cup.', scene: grid([['⚽', '', ''], ['', '', ''], ['', '', '🥤']]) },
    { text: 'Tap a tool (ramp left, ramp right, bumper), then tap a square to place it. Tap Play to drop the ball; Reset to try again.', scene: icons([{ emoji: '◢', label: 'ramp' }, { emoji: '◣', label: 'ramp' }, { emoji: '▬', label: 'bumper' }, { emoji: '▶️', label: 'play' }]) },
    { text: 'Watch: a ramp under the ball sends it right, down into the cup.', scene: grid([['⚽', '', ''], ['◢', '', ''], ['', '', '🥤']], { frames: [[['⚽', '', ''], ['◢', '', ''], ['', '', '🥤']], [['', '', ''], ['◢', '⚽', ''], ['', '', '🥤']], [['', '', ''], ['◢', '', ''], ['', '', '🎉']]] }) },
    { text: 'Your turn: tap the square under the ball to place a ramp there.', scene: grid([['⚽', '', ''], ['', '', ''], ['', '', '🥤']], { highlight: [[1, 0]] }), target: { prompt: 'Tap the glowing square' } },
    PLAY('Get the ball into the cup on every level. Fewer pieces, more stars.', '🧪')
  ),
  'coding-sequence': tutorial(
    'coding-sequence',
    { text: 'A robot, a goal and a program made of arrow blocks. The robot follows your program exactly.', scene: grid([['🤖', '', '', '⭐']]) },
    { text: 'Tap arrow blocks to add them to the program. Tap Remove to take one off. Tap Run to watch the robot go; Repeat blocks do a step several times.', scene: icons([{ emoji: '➡️', label: 'right' }, { emoji: '⬆️', label: 'up' }, { emoji: '🔁', label: 'repeat' }, { emoji: '▶️', label: 'run' }]) },
    { text: 'Watch: program ➡️ ➡️ ➡️, Run — the robot walks three squares to the star.', scene: grid([['🤖', '', '', '⭐']], { frames: [[['🤖', '', '', '⭐']], [['', '🤖', '', '⭐']], [['', '', '🤖', '⭐']], [['', '', '', '🎉']]] }) },
    { text: 'Your turn: which block moves the robot towards the star? Tap it.', scene: grid([['🤖', '', '⭐'], ['⬆️', '➡️', '⬇️']], { highlight: [[1, 1]] }), target: { prompt: 'Tap the right arrow' } },
    PLAY('Write a program that reaches the goal. Shorter programs earn more stars.', '🤖')
  ),
  'virtual-cooking': tutorial(
    'virtual-cooking',
    { text: 'A recipe card with steps. Each step asks for one ingredient or action.', textByBracket: { A: 'Cook a yummy dish!' }, scene: icons([{ emoji: '🍅', label: 'tomato' }, { emoji: '🧅', label: 'onion' }, { emoji: '🥄', label: 'stir' }]) },
    { text: 'Read (or listen to) the step, then tap the matching ingredient or action. Tap Next when the step is done.', textByBracket: { A: 'Tap what the recipe asks for.' }, scene: gesture('tap', '🍲', 'Tap the right ingredient') },
    { text: 'Watch: "Add the tomato" — tap the tomato. It hops into the pot!', scene: grid([['🍅', '🧅', '🥕'], ['', '🍲', '']], { highlight: [[0, 0]], frames: [[['🍅', '🧅', '🥕'], ['', '🍲', '']], [['', '🧅', '🥕'], ['', '🍲', '']]] }) },
    { text: 'Your turn: "Add the onion". Tap it.', textByBracket: { A: 'Tap the onion!' }, scene: grid([['', '🧅', '🥕'], ['', '🍲', '']], { highlight: [[0, 1]] }), target: { prompt: 'Tap the onion' } },
    PLAY('Finish every step to serve the dish. Harder recipes have more steps.', '🍲', 'Cook the whole recipe!')
  ),
  'farm-manager': tutorial(
    'farm-manager',
    { text: 'Your farm: fields, seeds, coins and a goal to reach in a number of days.', scene: icons([{ emoji: '🌾', label: 'fields' }, { emoji: '🌱', label: 'seeds' }, { emoji: '🪙', label: 'coins' }, { emoji: '📅', label: 'days' }]) },
    { text: 'Tap a field to plant seeds (they cost coins). Tap Water. Tap End Day to let crops grow. Tap Harvest and Sell when they are ready.', scene: icons([{ emoji: '🌱', label: 'plant' }, { emoji: '💧', label: 'water' }, { emoji: '🌙', label: 'end day' }, { emoji: '💰', label: 'sell' }]) },
    { text: 'Watch: plant, water, end two days, harvest, sell — more coins than you spent.', scene: grid([['🟫', '🪙5']], { frames: [[['🌱', '🪙3']], [['💧', '🪙3']], [['🌾', '🪙3']], [['🟫', '🪙9']]] }) },
    { text: 'Your turn: tap the empty field to plant.', scene: grid([['🟫', '🟫'], ['🌾', '🟫']], { highlight: [[0, 0]] }), target: { prompt: 'Tap an empty field' } },
    PLAY('Reach the coin goal before the days run out. Spend wisely!', '🚜')
  ),
  'traffic-logic': tutorial(
    'traffic-logic',
    { text: 'A car park jam. The red car must reach the exit on the right.', scene: grid([['🚙', '🚙', ''], ['🚗', '🚗', '🚛'], ['', '', '🚛']]) },
    { text: 'Tap a vehicle to select it, then slide it along its lane (cars slide one way only). Clear the path for the red car.', scene: gesture('drag', '🚗', 'Select, then slide along the lane') },
    { text: 'Watch: the truck slides down, the red car drives out.', scene: grid([['', '', '🚛'], ['🚗', '🚗', '🚛'], ['', '', '']], { frames: [[['', '', '🚛'], ['🚗', '🚗', '🚛'], ['', '', '']], [['', '', ''], ['🚗', '🚗', '🚛'], ['', '', '🚛']], [['', '', ''], ['', '🚗', '🚗'], ['', '', '🚛']]] }) },
    { text: 'Your turn: tap the vehicle blocking the red car.', scene: grid([['', '', '🚛'], ['🚗', '🚗', '🚛'], ['', '', '']], { highlight: [[1, 2]] }), target: { prompt: 'Tap the truck' } },
    PLAY('Free the red car in as few slides as you can.', '🚦')
  ),
  'detective-mystery': tutorial(
    'detective-mystery',
    { text: 'A mystery with suspects and clues. One suspect did it; the clues rule out the rest.', scene: icons([{ emoji: '🕵️', label: 'you' }, { emoji: '🐱', label: 'suspect' }, { emoji: '🐶', label: 'suspect' }, { emoji: '🐸', label: 'suspect' }]) },
    { text: 'Read a clue. Tap a suspect to cross them off when a clue clears them. Tap Reveal for another clue. Tap Accuse when only one is left.', scene: gesture('tap', '🔍', 'Cross off suspects, then accuse') },
    { text: 'Watch: "The culprit has whiskers." Cross off the frog. "Barks at night." Cross off the cat. Accuse the dog!', scene: grid([['🐱', '🐶', '🐸']], { frames: [[['🐱', '🐶', '🐸']], [['🐱', '🐶', '❌']], [['❌', '🐶', '❌']], [['❌', '✅', '❌']]] }) },
    { text: 'Your turn: the clue says "wears a hat". Only one suspect has a hat. Tap the suspect to cross off who does NOT.', scene: grid([['🎩🐱', '🐶', '🐸']], { highlight: [[0, 1]] }), target: { prompt: 'Tap a suspect without a hat' } },
    PLAY('Solve each case with as few clues as you can. Wrong accusations cost a star.', '🕵️')
  ),
  // ---------------------------------------------------------------- learning & quizzes
  'science-quiz': tutorial(
    'science-quiz',
    { text: 'Ten science questions, each with four answers. One is right.', scene: icons([{ emoji: '❓', label: 'question' }, { emoji: '🅰️', label: '' }, { emoji: '🅱️', label: '' }, { emoji: '🅲', label: '' }]) },
    { text: 'Read the question and tap an answer. You learn why it is right (or not), then tap Next.', scene: gesture('tap', '🧪', 'Tap an answer') },
    { text: 'Watch: "What do plants need to make food?" Tap "Sunlight" — correct, with a one-line why.', scene: grid([['🌞 Sunlight', '🍫 Chocolate'], ['🪨 Rocks', '📺 TV']], { highlight: [[0, 0]], frames: [[['🌞 Sunlight', '🍫 Chocolate'], ['🪨 Rocks', '📺 TV']], [['✅ Sunlight', '🍫 Chocolate'], ['🪨 Rocks', '📺 TV']]] }) },
    { text: 'Your turn: "Which is a gas?" Tap your answer.', scene: grid([['🪨 Stone', '💨 Air'], ['🥛 Milk', '🍎 Apple']], { highlight: [[0, 1]] }), target: { prompt: 'Tap the gas' } },
    PLAY('Answer all ten. More right answers, more stars — and you keep the explanations.', '🧪')
  ),
  'geography-quiz': tutorial(
    'geography-quiz',
    { text: 'Ten questions about India and the world: capitals, rivers, mountains, flags.', scene: icons([{ emoji: '🗺️', label: 'map' }, { emoji: '🏔️', label: 'mountains' }, { emoji: '🏞️', label: 'rivers' }]) },
    { text: 'Tap the answer you think is right. Read the explanation, then tap Next.', scene: gesture('tap', '🌍', 'Tap an answer') },
    { text: 'Watch: "Which ocean is south of India?" Tap "Indian Ocean" — correct!', scene: grid([['Atlantic', 'Indian'], ['Arctic', 'Pacific']], { highlight: [[0, 1]], frames: [[['Atlantic', 'Indian'], ['Arctic', 'Pacific']], [['Atlantic', '✅ Indian'], ['Arctic', 'Pacific']]] }) },
    { text: 'Your turn: "The capital of India is…" Tap your answer.', scene: grid([['Mumbai', 'New Delhi'], ['Kolkata', 'Chennai']], { highlight: [[0, 1]] }), target: { prompt: 'Tap the capital' } },
    PLAY('Ten questions per round. Easy, normal and hard rounds ask different things.', '🌍')
  ),
  'animal-sounds': tutorial(
    'animal-sounds',
    { text: 'Listen to an animal sound. Which animal made it?', textByBracket: { A: 'Who made that sound?' }, scene: icons([{ emoji: '🔊', label: 'listen' }, { emoji: '🐱', label: '' }, { emoji: '🐶', label: '' }, { emoji: '🐮', label: '' }]) },
    { text: 'Tap the speaker to hear it again. Tap the animal you think it is.', textByBracket: { A: 'Tap the speaker to listen. Tap the animal!' }, scene: gesture('tap', '🔊', 'Listen, then tap the animal') },
    { text: 'Watch: "Moo!" — tap the cow. Correct!', scene: grid([['🐱', '🐶', '🐮']], { highlight: [[0, 2]], frames: [[['🐱', '🐶', '🐮']], [['🐱', '🐶', '✅']]] }) },
    { text: 'Your turn: "Woof!" Tap the dog.', textByBracket: { A: 'Woof! Tap the dog!' }, scene: grid([['🐱', '🐶', '🐮']], { highlight: [[0, 1]] }), target: { prompt: 'Tap the dog' } },
    PLAY('Guess every animal. Tap Next to hear the next one.', '🐾', 'Guess all the animals!')
  ),
  'chess-tactics': tutorial(
    'chess-tactics',
    { text: 'A chess position with one best move — a capture, a check or a mate. Find it.', scene: grid([['', '♚', ''], ['', '', ''], ['♖', '', '♔']]) },
    { text: 'Tap a piece, then tap where it should go. Tap Hint if you are stuck; Next after you solve it.', scene: gesture('tap', '♟️', 'Tap piece, tap square') },
    { text: 'Watch: the rook slides up the file — check and mate!', scene: grid([['', '♚', ''], ['', '', ''], ['♖', '', '♔']], { arrow: { from: [2, 0], to: [0, 0] }, frames: [[['', '♚', ''], ['', '', ''], ['♖', '', '♔']], [['♖', '♚', ''], ['', '', ''], ['', '', '♔']]] }) },
    { text: 'Your turn: the queen can take the undefended knight. Tap the queen first.', scene: grid([['', '♞', ''], ['', '', ''], ['', '♕', '']], { highlight: [[2, 1]] }), target: { prompt: 'Tap the queen' } },
    PLAY('Solve each puzzle. Fewer hints, more stars.', '♟️')
  ),
  // ---------------------------------------------------------------- sports
  cricket: tutorial(
    'cricket',
    { text: 'You bat. The bowler bowls; the ball comes down the pitch towards you.', textByBracket: { B: 'Hit the ball when it reaches you!' }, scene: grid([['🎳'], ['⚾'], [''], ['🏏']]) },
    { text: 'Tap anywhere the moment the ball reaches the bat. Early or late = a miss. Perfect timing = a big hit.', textByBracket: { B: 'Tap when the ball is close!' }, scene: gesture('tap', '🏏', 'Tap when the ball arrives') },
    { text: 'Watch: the ball comes closer… closer… tap! SIX!', scene: grid([['🎳'], ['⚾'], [''], ['🏏']], { frames: [[['🎳'], ['⚾'], [''], ['🏏']], [['🎳'], [''], ['⚾'], ['🏏']], [['🎳'], [''], [''], ['💥']], [['6️⃣'], [''], [''], ['🏏']]] }) },
    { text: 'Your turn: the ball is at the bat. Tap now!', textByBracket: { B: 'Tap now!' }, scene: grid([['🎳'], [''], [''], ['🏏⚾']], { highlight: [[3, 0]] }), target: { prompt: 'Tap to swing' } },
    PLAY('Score as many runs as you can in your overs. Three misses and the innings ends.', '🏏')
  ),
  'football-penalty': tutorial(
    'football-penalty',
    { text: 'Penalty shoot-out! The goalkeeper guards the goal; you pick a corner.', textByBracket: { B: 'Kick the ball past the keeper!' }, scene: grid([['🥅', '🥅', '🥅'], ['', '🧤', ''], ['', '⚽', '']]) },
    { text: 'Swipe from the ball towards a corner of the goal to shoot. The keeper dives — sometimes the right way!', textByBracket: { B: 'Swipe the ball to a corner!' }, scene: gesture('swipe', '⚽', 'Swipe towards a corner') },
    { text: 'Watch: swipe top-left — the keeper dives right. GOAL!', scene: grid([['🥅', '🥅', '🥅'], ['', '🧤', ''], ['', '⚽', '']], { arrow: { from: [2, 1], to: [0, 0] }, frames: [[['🥅', '🥅', '🥅'], ['', '🧤', ''], ['', '⚽', '']], [['⚽', '🥅', '🥅'], ['', '', '🧤'], ['', '', '']], [['🎉', '🥅', '🥅'], ['', '', '🧤'], ['', '', '']]] }) },
    { text: 'Your turn: tap the corner you want to aim at.', textByBracket: { B: 'Tap a corner!' }, scene: grid([['🥅', '🥅', '🥅'], ['', '🧤', ''], ['', '⚽', '']], { highlight: [[0, 2]] }), target: { prompt: 'Tap a corner' } },
    PLAY('Five shots. Score more than the keeper saves!', '⚽')
  ),
  bowling: tutorial(
    'bowling',
    { text: 'Ten pins at the end of the lane, ten frames, two rolls per frame.', scene: grid([['🎳', '🎳', '🎳', '🎳'], ['', '🎳', '🎳', ''], ['', '', '', ''], ['', '🎱', '', '']]) },
    { text: 'Press the ball and drag back to set power; move sideways to aim; release to roll.', scene: gesture('drag', '🎱', 'Drag back to aim and power, release') },
    { text: 'Watch: straight down the middle with good power — STRIKE!', scene: grid([['🎳', '🎳', '🎳', '🎳'], ['', '🎳', '🎳', ''], ['', '', '', ''], ['', '🎱', '', '']], { frames: [[['🎳', '🎳', '🎳', '🎳'], ['', '🎳', '🎳', ''], ['', '', '', ''], ['', '🎱', '', '']], [['🎳', '🎳', '🎳', '🎳'], ['', '🎳', '🎳', ''], ['', '🎱', '', ''], ['', '', '', '']], [['💥', '💥', '💥', '💥'], ['', '💥', '💥', ''], ['', '', '', ''], ['', '', '', '']]] }) },
    { text: 'Your turn: tap the ball to pick it up.', scene: grid([['🎳', '🎳', '🎳'], ['', '', ''], ['', '🎱', '']], { highlight: [[2, 1]] }), target: { prompt: 'Tap the ball' } },
    PLAY('Knock down as many pins as you can over ten frames. A perfect game is 300!', '🎳')
  ),
};

export const tutorialFor = (gameId: string): TutorialDefinition | undefined => TUTORIALS[gameId];
