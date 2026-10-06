package com.rangepatte.app.game.twentynine

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.tricks.TrickAi
import kotlin.random.Random

object TwentyNineAi {
    /** How high this seat is willing to bid, from its first four cards (points held + length in its best suit). */
    fun estimate(hand: List<PlayingCard>): Int {
        val points = hand.sumOf { TwentyNineEngine.rules.points(it) }
        val longest = Suit.entries.maxOf { suit -> hand.count { it.suit == suit } }
        return 14 + points + (longest - 1)
    }

    /** 0 to pass, otherwise a bid within the legal range. */
    fun bid(state: T9State, difficulty: AiDifficulty, random: Random = Random.Default): Int {
        val seat = state.bidTurn
        val wobble = when (difficulty) { AiDifficulty.EASY -> random.nextInt(-3, 3); AiDifficulty.MEDIUM -> random.nextInt(-1, 2); AiDifficulty.HARD -> 0 }
        val willing = minOf(TwentyNineEngine.MAX_BID - 2, estimate(state.firstHands[seat]) + wobble)
        val minimum = TwentyNineEngine.minBid(state)
        return if (willing >= minimum) willing.coerceAtLeast(minimum) else 0
    }

    fun chooseTrump(state: T9State): Suit {
        val hand = state.firstHands[state.highBidder]
        return TrickAi.strongestSuit(hand, TwentyNineEngine.rules)
    }

    fun chooseCard(state: T9State, difficulty: AiDifficulty, random: Random = Random.Default): PlayingCard =
        TrickAi.chooseCard(state.round!!, TwentyNineEngine.rules, difficulty, random)
}
