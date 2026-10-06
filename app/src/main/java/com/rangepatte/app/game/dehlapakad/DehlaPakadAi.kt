package com.rangepatte.app.game.dehlapakad

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.tricks.TrickAi
import kotlin.random.Random

object DehlaPakadAi {
    /** When forced to name trump, call the suit held longest. */
    fun chooseTrump(state: DpState): Suit =
        TrickAi.strongestSuit(state.round.hands[state.round.turn], DehlaPakadEngine.rules)

    fun chooseCard(state: DpState, difficulty: AiDifficulty, random: Random = Random.Default): PlayingCard =
        TrickAi.chooseCard(state.round, DehlaPakadEngine.rules, difficulty, random)
}
