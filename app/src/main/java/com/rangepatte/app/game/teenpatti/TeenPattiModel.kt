package com.rangepatte.app.game.teenpatti

import com.rangepatte.app.domain.model.PlayingCard

enum class HandCategory { HIGH_CARD, PAIR, COLOR, SEQUENCE, PURE_SEQUENCE, TRAIL }

/** A three-card hand's strength: its category, then card values (highest first) to break ties. */
data class HandRank(val category: HandCategory, val tiebreak: List<Int>) : Comparable<HandRank> {
    override fun compareTo(other: HandRank): Int {
        if (category != other.category) return category.compareTo(other.category)
        for (i in tiebreak.indices) {
            val diff = tiebreak[i].compareTo(other.tiebreak.getOrElse(i) { 0 })
            if (diff != 0) return diff
        }
        return 0
    }
}

object TeenPattiRanking {
    /**
     * Trail (three of a kind) > Pure Sequence > Sequence > Colour > Pair > High Card. Ace is high,
     * except that A-2-3 counts as a sequence ranking just below A-K-Q (and above K-Q-J).
     */
    fun evaluate(cards: List<PlayingCard>): HandRank {
        require(cards.size == 3) { "A Teen Patti hand has exactly three cards" }
        val values = cards.map { if (it.rank.value == 1) 14 else it.rank.value }.sortedDescending()
        val sameSuit = cards.map { it.suit }.toSet().size == 1
        val isLowRun = values == listOf(14, 3, 2)
        val isRun = (values[0] - 1 == values[1] && values[1] - 1 == values[2]) || isLowRun
        // Doubled so A-2-3 (27) can sit between K-Q-J (26) and A-K-Q (28).
        val runValue = if (isLowRun) 27 else values[0] * 2

        return when {
            values.toSet().size == 1 -> HandRank(HandCategory.TRAIL, listOf(values[0]))
            isRun && sameSuit -> HandRank(HandCategory.PURE_SEQUENCE, listOf(runValue))
            isRun -> HandRank(HandCategory.SEQUENCE, listOf(runValue))
            sameSuit -> HandRank(HandCategory.COLOR, values)
            values.toSet().size == 2 -> {
                val pair = values.first { v -> values.count { it == v } == 2 }
                HandRank(HandCategory.PAIR, listOf(pair, values.first { it != pair }))
            }
            else -> HandRank(HandCategory.HIGH_CARD, values)
        }
    }
}

/** One player's seat at the table. [invested] is what they have put into the pot this hand. */
data class TpSeat(
    val name: String,
    val isHuman: Boolean,
    val chips: Int,
    val hand: List<PlayingCard> = emptyList(),
    val seen: Boolean = false,
    val packed: Boolean = false,
    val invested: Int = 0
)

enum class TpPhase { BETTING, ENDED }

enum class TpActionKind { SEE, CHAAL, RAISE, PACK, SHOW }

/** The most recent thing a player did, for the table to announce. */
data class TpLastAction(val seat: Int, val kind: TpActionKind, val amount: Int = 0, val wasBlind: Boolean = false)

/** How a hand ended. [showdown] is true when two hands were compared; the loser's cards are then revealed. */
data class TpResult(val winner: Int, val pot: Int, val showdown: Boolean)

/**
 * A hand of Teen Patti / Flush, played for points only. [stake] is what a player who has seen their
 * cards pays to stay in; a blind player pays half. Chips carry over between hands.
 */
data class TpState(
    val seats: List<TpSeat>,
    val pot: Int,
    val stake: Int,
    val turn: Int,
    val dealer: Int,
    val phase: TpPhase,
    val result: TpResult? = null,
    val lastAction: TpLastAction? = null,
    val handNumber: Int = 1
) {
    val activeCount: Int get() = seats.count { !it.packed }
    val current: TpSeat get() = seats[turn]
}
