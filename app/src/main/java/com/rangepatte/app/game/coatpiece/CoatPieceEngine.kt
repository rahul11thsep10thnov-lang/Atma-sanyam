package com.rangepatte.app.game.coatpiece

import com.rangepatte.app.domain.game.Deck
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.TrickRound
import com.rangepatte.app.game.tricks.TrickRules
import com.rangepatte.app.game.tricks.TrumpMode
import com.rangepatte.app.game.tricks.standardRank
import kotlin.random.Random

enum class CpPhase { TRUMP_CALL, PLAYING, ROUND_OVER, MATCH_OVER }

/**
 * A hand of Coat Piece (Court Piece / Rang). The trump caller sees only their first five cards,
 * names trump, then everyone plays all 13. A team with 7+ tricks scores a "court"; first to
 * [CoatPieceEngine.COURTS_TO_WIN] courts takes the match. Teams are seats 0+2 (you and your partner) and 1+3.
 */
data class CpState(
    val dealer: Int,
    val caller: Int,
    val phase: CpPhase,
    val round: TrickRound,
    val courts: List<Int>,
    val tricksByTeam: List<Int> = listOf(0, 0),
    val roundWinnerTeam: Int? = null
) {
    /** What the trump caller is allowed to look at before naming trump. */
    val callerFirstFive: List<PlayingCard> get() = round.hands[caller].take(5)
}

object CoatPieceEngine {
    const val COURTS_TO_WIN = 3
    const val TRICKS_FOR_COURT = 7

    val rules = TrickRules(
        mode = TrumpMode.FIXED,
        deck = Deck.standard().cards,
        rank = ::standardRank,
        hasPartners = true
    )

    /** The human (seat 0) calls trump in the first hand. */
    fun newMatch(random: Random = Random.Default): CpState = newRound(dealer = 3, courts = listOf(0, 0), random = random)

    fun newRound(dealer: Int, courts: List<Int>, random: Random = Random.Default): CpState {
        val cards = Deck.standard().shuffled(random).cards
        val hands = List(4) { seat -> cards.subList(seat * 13, seat * 13 + 13) }
        val caller = (dealer + 1) % 4
        return CpState(
            dealer = dealer,
            caller = caller,
            phase = CpPhase.TRUMP_CALL,
            round = TrickEngine.newRound(hands, leader = caller, trumpSuit = null, trumpActive = false),
            courts = courts
        )
    }

    fun callTrump(state: CpState, suit: Suit): CpState {
        if (state.phase != CpPhase.TRUMP_CALL) return state
        val sorted = state.round.hands.map { hand -> hand.sortedWith(compareBy({ it.suit.ordinal }, { -standardRank(it) })) }
        return state.copy(
            phase = CpPhase.PLAYING,
            round = TrickEngine.newRound(sorted, leader = state.caller, trumpSuit = suit, trumpActive = true)
        )
    }

    fun play(state: CpState, card: PlayingCard): CpState? {
        if (state.phase != CpPhase.PLAYING) return null
        return TrickEngine.play(state.round, card, rules)?.let { state.copy(round = it) }
    }

    /** Clears a finished trick and, after the 13th, scores the hand. */
    fun resolveTrick(state: CpState): CpState {
        if (state.phase != CpPhase.PLAYING || !TrickEngine.isTrickComplete(state.round)) return state
        val round = TrickEngine.resolve(state.round, rules)
        if (!TrickEngine.isFinished(round)) return state.copy(round = round)
        val tricks = TrickEngine.tricksWonByTeam(round)
        val winner = if (tricks[0] >= TRICKS_FOR_COURT) 0 else 1
        val courts = state.courts.mapIndexed { team, n -> if (team == winner) n + 1 else n }
        return state.copy(
            round = round,
            courts = courts,
            tricksByTeam = tricks,
            roundWinnerTeam = winner,
            phase = if (courts[winner] >= COURTS_TO_WIN) CpPhase.MATCH_OVER else CpPhase.ROUND_OVER
        )
    }

    fun nextRound(state: CpState, random: Random = Random.Default): CpState =
        newRound((state.dealer + 1) % 4, state.courts, random)
}
