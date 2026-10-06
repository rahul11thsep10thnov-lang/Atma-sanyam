package com.rangepatte.app.game.lakadi

import com.rangepatte.app.domain.game.Deck
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.TrickRound
import com.rangepatte.app.game.tricks.TrickRules
import com.rangepatte.app.game.tricks.TrumpMode
import com.rangepatte.app.game.tricks.standardRank
import kotlin.random.Random

enum class LkPhase { BIDDING, PLAYING, HAND_OVER, GAME_OVER }

/**
 * A game of Lakadi: four players each on their own, spades always trump, five hands. Each player bids
 * how many tricks they will win (1–13). Scores are kept in tenths of a point so the 0.1 bonus for each
 * extra trick is exact: making a bid scores 1 point per trick bid (+0.1 per extra trick); falling short loses the bid.
 */
data class LkState(
    val dealer: Int,
    val handNumber: Int,
    val phase: LkPhase,
    val bids: List<Int>,
    val bidTurn: Int,
    val round: TrickRound,
    val scoresTenths: List<Int>,
    val lastDeltaTenths: List<Int> = List(4) { 0 }
) {
    val bidsMade: Int get() = bids.count { it != NOT_BID }

    companion object { const val NOT_BID = -1 }
}

object LakadiEngine {
    const val HANDS_PER_GAME = 5
    const val MAX_BID = 13

    val rules = TrickRules(
        mode = TrumpMode.FIXED,
        deck = Deck.standard().cards,
        rank = ::standardRank,
        hasPartners = false
    )

    fun newGame(random: Random = Random.Default): LkState = newHand(dealer = 3, handNumber = 1, scoresTenths = List(4) { 0 }, random = random)

    fun newHand(dealer: Int, handNumber: Int, scoresTenths: List<Int>, random: Random = Random.Default): LkState {
        val cards = Deck.standard().shuffled(random).cards
        val hands = List(4) { seat ->
            cards.subList(seat * 13, seat * 13 + 13).sortedWith(compareBy({ it.suit.ordinal }, { -standardRank(it) }))
        }
        return LkState(
            dealer = dealer,
            handNumber = handNumber,
            phase = LkPhase.BIDDING,
            bids = List(4) { LkState.NOT_BID },
            bidTurn = (dealer + 1) % 4,
            round = TrickEngine.newRound(hands, leader = (dealer + 1) % 4, trumpSuit = Suit.SPADES, trumpActive = true),
            scoresTenths = scoresTenths
        )
    }

    fun bid(state: LkState, amount: Int): LkState? {
        if (state.phase != LkPhase.BIDDING || amount !in 1..MAX_BID) return null
        val bids = state.bids.mapIndexed { i, b -> if (i == state.bidTurn) amount else b }
        val next = state.copy(bids = bids, bidTurn = (state.bidTurn + 1) % 4)
        return if (next.bidsMade == 4) next.copy(phase = LkPhase.PLAYING) else next
    }

    fun play(state: LkState, card: PlayingCard): LkState? {
        if (state.phase != LkPhase.PLAYING) return null
        return TrickEngine.play(state.round, card, rules)?.let { state.copy(round = it) }
    }

    fun scoreFor(bid: Int, tricks: Int): Int = if (tricks >= bid) bid * 10 + (tricks - bid) else -bid * 10

    fun resolveTrick(state: LkState): LkState {
        if (state.phase != LkPhase.PLAYING || !TrickEngine.isTrickComplete(state.round)) return state
        val round = TrickEngine.resolve(state.round, rules)
        if (!TrickEngine.isFinished(round)) return state.copy(round = round)
        val tricks = TrickEngine.tricksWonBySeat(round)
        val delta = List(4) { scoreFor(state.bids[it], tricks[it]) }
        return state.copy(
            round = round,
            scoresTenths = state.scoresTenths.mapIndexed { i, s -> s + delta[i] },
            lastDeltaTenths = delta,
            phase = if (state.handNumber >= HANDS_PER_GAME) LkPhase.GAME_OVER else LkPhase.HAND_OVER
        )
    }

    fun nextHand(state: LkState, random: Random = Random.Default): LkState =
        newHand((state.dealer + 1) % 4, state.handNumber + 1, state.scoresTenths, random)

    /** Formats tenths as a score like "7.2" or "-4". */
    fun format(tenths: Int): String {
        val whole = tenths / 10
        val frac = kotlin.math.abs(tenths % 10)
        val sign = if (tenths < 0 && whole == 0) "-" else ""
        return if (frac == 0) "$sign$whole" else "$sign$whole.$frac"
    }
}
