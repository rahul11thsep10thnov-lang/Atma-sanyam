package com.rangepatte.app.game.rummy

import com.rangepatte.app.domain.model.AiDifficulty
import kotlin.random.Random

/** The computer's rummy turn, in its two steps: pick up (stock or discard), then declare or throw a card away. */
object RummyAi {
    /** Step 1 (phase DRAW): take the top discard only if it clearly makes the hand better. */
    fun decideDraw(state: RummyState, difficulty: AiDifficulty, random: Random = Random.Default): RummyAction {
        val me = state.current
        val top = state.discard.lastOrNull() ?: return RummyAction.DrawStock
        if (difficulty == AiDifficulty.EASY && random.nextFloat() < 0.4f) return RummyAction.DrawStock
        val now = MeldSession(me.hand, state.wildRank).arrange().cost
        val withTop = MeldSession(me.hand + top, state.wildRank)
        val bestAfter = (0..me.hand.size).minOf { i -> withTop.arrange(exclude = 1 shl i).cost }
        return if (bestAfter < now) RummyAction.DrawDiscard else RummyAction.DrawStock
    }

    /** Step 2 (phase DISCARD, 14 cards in hand): declare if possible, otherwise throw away the least useful card. */
    fun decideAfterDraw(state: RummyState, difficulty: AiDifficulty, random: Random = Random.Default): RummyAction {
        val hand = state.current.hand
        val session = MeldSession(hand, state.wildRank)
        for (i in hand.indices) {
            if (session.canDeclare(exclude = 1 shl i)) return RummyAction.Declare(hand[i].id)
        }
        val candidates = hand.indices.map { i -> i to session.arrange(exclude = 1 shl i).cost }
        val best = if (difficulty == AiDifficulty.EASY && random.nextFloat() < 0.3f) {
            candidates.filter { !state.isWild(hand[it.first]) }.randomOrNull(random) ?: candidates.first()
        } else {
            candidates.minWith(compareBy<Pair<Int, Int>> { it.second }.thenByDescending { hand[it.first].points })
        }
        return RummyAction.Discard(hand[best.first].id)
    }

    /** A whole turn at once (used by tests and simulations). */
    fun takeTurn(state: RummyState, difficulty: AiDifficulty, random: Random = Random.Default): RummyState {
        val drawn = when (decideDraw(state, difficulty, random)) {
            RummyAction.DrawDiscard -> RummyEngine.drawFromDiscard(state)
            else -> RummyEngine.drawFromStock(state, random)
        } ?: RummyEngine.drawFromStock(state, random) ?: return state
        return when (val action = decideAfterDraw(drawn, difficulty, random)) {
            is RummyAction.Declare -> RummyEngine.declare(drawn, action.cardId)
            is RummyAction.Discard -> RummyEngine.discard(drawn, action.cardId)
            else -> null
        } ?: drawn
    }
}
