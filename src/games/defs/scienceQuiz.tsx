// Science Quiz: 10 multiple-choice questions per round with a one-line
// explanation. Questions are everyday, well-established science facts.
import { makeQuizGame } from '../shared/quiz';
import { SCIENCE_BANK } from '../data/scienceBank';
import { palette } from '../../theme/palette';

export default makeQuizGame('science-quiz', SCIENCE_BANK, { emoji: '🔬', color: palette.mint });
