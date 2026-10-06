package com.rangepatte.app.game.tricks

import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit

/** [seat] 0 is the human at the bottom; play passes 0 → 1 → 2 → 3 (anticlockwise: right, top, left). */
data class TrickPlay(val seat: Int, val card: PlayingCard)

data class CompletedTrick(val plays: List<TrickPlay>, val winner: Int)

/**
 * How trumps come into force:
 * - [FIXED]: the trump suit is known from the start (Coat Piece, Lakadi).
 * - [HIDDEN]: chosen in secret and revealed when a player first cannot follow suit (Twenty Nine).
 * - [CALLED_BY_VOID]: nobody has trump until the first player who cannot follow suit names it (Dehla Pakad).
 */
enum class TrumpMode { FIXED, HIDDEN, CALLED_BY_VOID }

/**
 * What differs between trick-taking games: which cards are in play, how cards rank within a suit,
 * what each card is worth, how trump works, and whether seats 0+2 and 1+3 are partners.
 */
class TrickRules(
    val mode: TrumpMode,
    val deck: List<PlayingCard>,
    val rank: (PlayingCard) -> Int,
    val points: (PlayingCard) -> Int = { 0 },
    val hasPartners: Boolean = true
)

/** Ace-high ordering used by Coat Piece, Dehla Pakad and Lakadi. */
fun standardRank(card: PlayingCard): Int = if (card.rank == Rank.ACE) 14 else card.rank.value

/**
 * One deal of a trick-taking game, four seats. [plays] holds the cards on the table for the current
 * trick; [trumpSuit] is the trump (if decided) and [trumpActive] whether it is currently in force.
 */
data class TrickRound(
    val hands: List<List<PlayingCard>>,
    val plays: List<TrickPlay>,
    val turn: Int,
    val trumpSuit: Suit?,
    val trumpActive: Boolean,
    val completed: List<CompletedTrick> = emptyList()
)
