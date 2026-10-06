package com.rangepatte.app.game.twentynine

import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.TrickRound
import com.rangepatte.app.game.tricks.TrickRules
import com.rangepatte.app.game.tricks.TrumpMode
import kotlin.random.Random

enum class T9Phase { BIDDING, TRUMP_CHOICE, PLAYING, ROUND_OVER, MATCH_OVER }

data class T9Result(val bidder: Int, val bid: Int, val bidderTeamPoints: Int, val made: Boolean)

/**
 * A round of Twenty Nine: 32 cards (7 to Ace), four players in teams (seats 0+2 and 1+3). Each player
 * bids once on their first four cards; the highest bidder secretly picks trump; then all eight tricks
 * are played. Card points (J=3, 9=2, A=1, 10=1 — 28 in all) decide whether the bid was made.
 * [gameScore] is each team's running game points.
 */
data class T9State(
    val dealer: Int,
    val phase: T9Phase,
    val firstHands: List<List<PlayingCard>>,
    val secondHands: List<List<PlayingCard>>,
    val bids: List<Int>,
    val bidTurn: Int,
    val highBid: Int,
    val highBidder: Int,
    val trump: Suit?,
    val round: TrickRound?,
    val teamPoints: List<Int>,
    val gameScore: List<Int>,
    val result: T9Result? = null
) {
    val bidsMade: Int get() = bids.count { it != NOT_BID }
    val bidderTeam: Int get() = TrickEngine.teamOf(highBidder)

    companion object { const val NOT_BID = -1 }
}

object TwentyNineEngine {
    const val MIN_BID = 15
    const val MAX_BID = 28
    const val SCORE_TO_WIN = 6

    private val order = mapOf(
        Rank.JACK to 8, Rank.NINE to 7, Rank.ACE to 6, Rank.TEN to 5,
        Rank.KING to 4, Rank.QUEEN to 3, Rank.EIGHT to 2, Rank.SEVEN to 1
    )
    private val cardPoints = mapOf(Rank.JACK to 3, Rank.NINE to 2, Rank.ACE to 1, Rank.TEN to 1)

    val deck: List<PlayingCard> = Suit.entries.flatMap { suit -> order.keys.map { rank -> PlayingCard(suit, rank) } }

    val rules = TrickRules(
        mode = TrumpMode.HIDDEN,
        deck = deck,
        rank = { order.getValue(it.rank) },
        points = { cardPoints[it.rank] ?: 0 },
        hasPartners = true
    )

    /** The human (seat 0) bids first. */
    fun newMatch(random: Random = Random.Default): T9State = newRound(dealer = 3, gameScore = listOf(0, 0), random = random)

    fun newRound(dealer: Int, gameScore: List<Int>, random: Random = Random.Default): T9State {
        val cards = deck.shuffled(random)
        return T9State(
            dealer = dealer,
            phase = T9Phase.BIDDING,
            firstHands = List(4) { cards.subList(it * 4, it * 4 + 4) },
            secondHands = List(4) { cards.subList(16 + it * 4, 16 + it * 4 + 4) },
            bids = List(4) { T9State.NOT_BID },
            bidTurn = (dealer + 1) % 4,
            highBid = 0,
            highBidder = -1,
            trump = null,
            round = null,
            teamPoints = listOf(0, 0),
            gameScore = gameScore
        )
    }

    /** The lowest legal bid right now. */
    fun minBid(state: T9State): Int = if (state.highBid == 0) MIN_BID else state.highBid + 1

    /** [amount] 0 means pass. Returns null if the bid isn't allowed. */
    fun bid(state: T9State, amount: Int): T9State? {
        if (state.phase != T9Phase.BIDDING) return null
        if (amount != 0 && (amount < minBid(state) || amount > MAX_BID)) return null
        val bids = state.bids.mapIndexed { i, b -> if (i == state.bidTurn) amount else b }
        var next = state.copy(
            bids = bids,
            bidTurn = (state.bidTurn + 1) % 4,
            highBid = if (amount > 0) amount else state.highBid,
            highBidder = if (amount > 0) state.bidTurn else state.highBidder
        )
        if (next.bidsMade == 4) {
            // Everybody passed: the dealer is stuck with the minimum bid.
            if (next.highBidder < 0) next = next.copy(highBid = MIN_BID, highBidder = state.dealer)
            next = next.copy(phase = T9Phase.TRUMP_CHOICE)
        }
        return next
    }

    fun chooseTrump(state: T9State, suit: Suit): T9State? {
        if (state.phase != T9Phase.TRUMP_CHOICE) return null
        val hands = List(4) { seat ->
            (state.firstHands[seat] + state.secondHands[seat]).sortedWith(compareBy({ it.suit.ordinal }, { -rules.rank(it) }))
        }
        val leader = (state.dealer + 1) % 4
        return state.copy(
            phase = T9Phase.PLAYING,
            trump = suit,
            round = TrickEngine.newRound(hands, leader, trumpSuit = suit, trumpActive = false)
        )
    }

    fun play(state: T9State, card: PlayingCard): T9State? {
        val round = state.round ?: return null
        if (state.phase != T9Phase.PLAYING) return null
        return TrickEngine.play(round, card, rules)?.let { state.copy(round = it) }
    }

    /** Clears a finished trick, awards its card points, and after the 8th trick scores the round. */
    fun resolveTrick(state: T9State): T9State {
        val round = state.round ?: return state
        if (state.phase != T9Phase.PLAYING || !TrickEngine.isTrickComplete(round)) return state
        val winner = TrickEngine.currentWinner(round, rules)
        val trickPoints = round.plays.sumOf { rules.points(it.card) }
        val teamPoints = state.teamPoints.mapIndexed { team, p -> if (team == TrickEngine.teamOf(winner)) p + trickPoints else p }
        val resolved = TrickEngine.resolve(round, rules)
        if (!TrickEngine.isFinished(resolved)) return state.copy(round = resolved, teamPoints = teamPoints)

        val made = teamPoints[state.bidderTeam] >= state.highBid
        val delta = if (made) 1 else -1
        val gameScore = state.gameScore.mapIndexed { team, s -> if (team == state.bidderTeam) s + delta else s - delta }
        return state.copy(
            round = resolved,
            teamPoints = teamPoints,
            gameScore = gameScore,
            result = T9Result(state.highBidder, state.highBid, teamPoints[state.bidderTeam], made),
            phase = if (gameScore.any { it >= SCORE_TO_WIN || it <= -SCORE_TO_WIN }) T9Phase.MATCH_OVER else T9Phase.ROUND_OVER
        )
    }

    fun nextRound(state: T9State, random: Random = Random.Default): T9State =
        newRound((state.dealer + 1) % 4, state.gameScore, random)
}
