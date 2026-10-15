// Geography Quiz: India and the world. Well-established facts only.
import { makeQuizGame } from '../shared/quiz';
import { GEOGRAPHY_BANK } from '../data/geographyBank';
import { palette } from '../../theme/palette';

export default makeQuizGame('geography-quiz', GEOGRAPHY_BANK, { emoji: '🌍', color: palette.sky });
