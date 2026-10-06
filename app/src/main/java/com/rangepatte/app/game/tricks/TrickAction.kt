package com.rangepatte.app.game.tricks

import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Suit

/** Everything a player can do in the four trick-taking games. */
sealed interface TrickAction {
    data class Play(val cardId: String) : TrickAction
    /** [amount] 0 means pass. */
    data class Bid(val amount: Int) : TrickAction
    /** Name the trump suit (Coat Piece caller, Twenty Nine bidder, Dehla Pakad first void player). */
    data class Trump(val suit: Suit) : TrickAction
    /** The host starts the next round / hand / match. */
    data object Next : TrickAction
}

object TrickActionCodec {
    fun encode(a: TrickAction): String = when (a) {
        is TrickAction.Play -> "P:${a.cardId}"
        is TrickAction.Bid -> "B:${a.amount}"
        is TrickAction.Trump -> "T:${a.suit.name}"
        TrickAction.Next -> "N"
    }

    fun decode(text: String): TrickAction? = runCatching {
        when (text.substringBefore(':')) {
            "P" -> TrickAction.Play(text.substringAfter(':'))
            "B" -> TrickAction.Bid(text.substringAfter(':').toInt())
            "T" -> TrickAction.Trump(Suit.valueOf(text.substringAfter(':')))
            "N" -> TrickAction.Next
            else -> null
        }
    }.getOrNull()
}

/** The card with [id] in [hand], if the seat really holds it. */
fun cardInHand(hand: List<PlayingCard>, id: String): PlayingCard? = hand.firstOrNull { it.id == id }
