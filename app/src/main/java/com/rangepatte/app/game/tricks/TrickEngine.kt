package com.rangepatte.app.game.tricks

import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Suit

object TrickEngine {
    const val SEATS = 4

    fun partnerOf(seat: Int) = (seat + 2) % SEATS
    fun teamOf(seat: Int) = seat % 2

    fun newRound(hands: List<List<PlayingCard>>, leader: Int, trumpSuit: Suit?, trumpActive: Boolean) =
        TrickRound(hands, plays = emptyList(), turn = leader, trumpSuit = trumpSuit, trumpActive = trumpActive)

    fun ledSuit(round: TrickRound): Suit? = round.plays.firstOrNull()?.card?.suit

    /** The player on turn has no card of the suit that was led (and is not leading). */
    fun cannotFollow(round: TrickRound): Boolean {
        val led = ledSuit(round) ?: return false
        return round.hands[round.turn].none { it.suit == led }
    }

    /** Cards the player on turn may play: they must follow suit if they can. */
    fun legal(round: TrickRound): List<PlayingCard> {
        val hand = round.hands[round.turn]
        val led = ledSuit(round) ?: return hand
        val following = hand.filter { it.suit == led }
        return following.ifEmpty { hand }
    }

    /** Dehla Pakad: this player must name the trump suit before playing. */
    fun needsTrumpCall(round: TrickRound, rules: TrickRules): Boolean =
        rules.mode == TrumpMode.CALLED_BY_VOID && !round.trumpActive && cannotFollow(round)

    fun callTrump(round: TrickRound, suit: Suit): TrickRound = round.copy(trumpSuit = suit, trumpActive = true)

    /**
     * Plays [card] for the player on turn. In [TrumpMode.HIDDEN], a player who cannot follow suit
     * makes the hidden trump known as they play. Returns null if the card isn't a legal play (or a
     * trump must first be called).
     */
    fun play(round: TrickRound, card: PlayingCard, rules: TrickRules): TrickRound? {
        if (round.plays.size >= SEATS || card !in legal(round)) return null
        if (needsTrumpCall(round, rules)) return null
        val reveal = rules.mode == TrumpMode.HIDDEN && !round.trumpActive && cannotFollow(round)
        val seat = round.turn
        return round.copy(
            hands = round.hands.mapIndexed { i, hand -> if (i == seat) hand - card else hand },
            plays = round.plays + TrickPlay(seat, card),
            turn = (seat + 1) % SEATS,
            trumpActive = round.trumpActive || reveal
        )
    }

    fun isTrickComplete(round: TrickRound) = round.plays.size == SEATS

    fun isFinished(round: TrickRound) = round.plays.isEmpty() && round.hands.all { it.isEmpty() }

    /** Which seat wins the plays so far: the highest trump if any was played, else the highest card of the led suit. */
    fun winnerOf(plays: List<TrickPlay>, trumpSuit: Suit?, trumpActive: Boolean, rules: TrickRules): Int {
        val led = plays.first().card.suit
        val trumps = if (trumpActive && trumpSuit != null) plays.filter { it.card.suit == trumpSuit } else emptyList()
        val contenders = trumps.ifEmpty { plays.filter { it.card.suit == led } }
        return contenders.maxBy { rules.rank(it.card) }.seat
    }

    fun currentWinner(round: TrickRound, rules: TrickRules): Int =
        winnerOf(round.plays, round.trumpSuit, round.trumpActive, rules)

    /** Clears a completed trick: records it, and the winner leads the next. */
    fun resolve(round: TrickRound, rules: TrickRules): TrickRound {
        val winner = currentWinner(round, rules)
        return round.copy(
            plays = emptyList(),
            turn = winner,
            completed = round.completed + CompletedTrick(round.plays, winner)
        )
    }

    fun tricksWonBySeat(round: TrickRound): List<Int> =
        List(SEATS) { seat -> round.completed.count { it.winner == seat } }

    fun tricksWonByTeam(round: TrickRound): List<Int> {
        val bySeat = tricksWonBySeat(round)
        return listOf(bySeat[0] + bySeat[2], bySeat[1] + bySeat[3])
    }
}
