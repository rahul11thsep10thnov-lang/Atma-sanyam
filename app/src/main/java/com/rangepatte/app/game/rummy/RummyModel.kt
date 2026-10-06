package com.rangepatte.app.game.rummy

import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit

/**
 * A rummy card. Rummy plays with two decks plus printed Jokers, so a card needs a unique [id] and
 * the printed Joker (no suit, no rank) needs a representation [PlayingCard] doesn't have.
 */
data class RCard(val id: Int, val suit: Suit?, val rank: Rank?) {
    val isPrintedJoker: Boolean get() = suit == null

    /** What the card is worth when left ungrouped at the end: Jokers 0, face cards and 10s 10, Ace 1, others their number. */
    val points: Int
        get() = when {
            isPrintedJoker -> 0
            rank!!.value >= 10 -> 10
            else -> rank.value
        }

    /** The card as a plain [PlayingCard] for drawing. Must not be called on a printed Joker. */
    fun toPlayingCard(): PlayingCard = PlayingCard(suit!!, rank!!, "r$id")
}

data class RummyPlayer(val name: String, val isHuman: Boolean, val hand: List<RCard>)

enum class RummyPhase { DRAW, DISCARD, FINISHED }

/**
 * How a round ended. [points] is each player's penalty (lowest wins; the winner has 0).
 * If [validDeclaration] is false, [declarer] declared with a wrong hand and takes the full 80.
 */
data class RummyResult(val declarer: Int, val validDeclaration: Boolean, val points: List<Int>) {
    val winner: Int? get() = if (validDeclaration) declarer else null
}

/** A round of 13-card rummy. [stock] and [discard] have their top card last. */
data class RummyState(
    val players: List<RummyPlayer>,
    val stock: List<RCard>,
    val discard: List<RCard>,
    val wildRank: Rank,
    val turn: Int,
    val phase: RummyPhase,
    val result: RummyResult? = null
) {
    val current: RummyPlayer get() = players[turn]
    fun isWild(card: RCard): Boolean = card.isPrintedJoker || card.rank == wildRank
}

/** Everything a player can do in rummy. */
sealed interface RummyAction {
    data object DrawStock : RummyAction
    data object DrawDiscard : RummyAction
    data class Discard(val cardId: Int) : RummyAction
    /** Finish the round, putting [cardId] face-down; the other 13 cards must form a valid hand. */
    data class Declare(val cardId: Int) : RummyAction
    /** The host starts a new round. */
    data object Next : RummyAction
}
