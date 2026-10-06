package com.rangepatte.app.game.coatpiece

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.tricks.TrickAi
import com.rangepatte.app.game.tricks.TrickEngine
import kotlin.random.Random

object CoatPieceAi {
    /** The caller names the suit they hold most of in their first five cards. */
    fun chooseTrump(state: CpState): Suit = TrickAi.strongestSuit(state.callerFirstFive, CoatPieceEngine.rules)

    fun chooseCard(state: CpState, difficulty: AiDifficulty, random: Random = Random.Default): PlayingCard =
        TrickAi.chooseCard(state.round, CoatPieceEngine.rules, difficulty, random)

    fun isAiTurn(state: CpState) = state.phase == CpPhase.PLAYING && !TrickEngine.isTrickComplete(state.round) && state.round.turn != 0
}
