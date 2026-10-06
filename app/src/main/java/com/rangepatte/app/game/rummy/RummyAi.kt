package com.rangepatte.app.game.rummy

import com.rangepatte.app.domain.model.AiDifficulty
import kotlin.random.Random

/** The computer's whole turn: pick up (stock or discard), then declare or throw a card away. */
object RummyAi {
    fun takeTurn(state: RummyState, difficulty: AiDifficulty, random: Random = Random.Default): RummyState {
        val me = state.current
        val top = state.discard.lastOrNull()

        // Take the discard only if it clearly makes the hand better.
        var takeDiscard = false
        if (top != null && !(difficulty == AiDifficulty.EASY && random.nextFloat() < 0.4f)) {
            val now = MeldSession(me.hand, state.wildRank).arrange().cost
            val withTop = MeldSession(me.hand + top, state.wildRank)
            val bestAfter = me.hand.indices.plus(me.hand.size).minOf { i -> withTop.arrange(exclude = 1 shl i).cost }
            takeDiscard = bestAfter < now
        }
        val drawn = (if (takeDiscard) RummyEngine.drawFromDiscard(state) else RummyEngine.drawFromStock(state, random))
            ?: RummyEngine.drawFromStock(state, random)
            ?: return state
        val hand = drawn.current.hand
        val session = MeldSession(hand, drawn.wildRank)

        // Declare if some card can be put face-down and the rest is a valid hand.
        for (i in hand.indices) {
            if (session.canDeclare(exclude = 1 shl i)) {
                RummyEngine.declare(drawn, hand[i].id)?.let { return it }
            }
        }

        val candidates = hand.indices.map { i -> i to session.arrange(exclude = 1 shl i).cost }
        val best = if (difficulty == AiDifficulty.EASY && random.nextFloat() < 0.3f) {
            candidates.filter { !drawn.isWild(hand[it.first]) }.randomOrNull(random) ?: candidates.first()
        } else {
            candidates.minWith(compareBy<Pair<Int, Int>> { it.second }.thenByDescending { hand[it.first].points })
        }
        return RummyEngine.discard(drawn, hand[best.first].id) ?: drawn
    }
}
