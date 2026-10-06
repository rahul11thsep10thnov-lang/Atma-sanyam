package com.rangepatte.app.game.dehlapakad

import com.rangepatte.app.domain.game.Deck
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.TrickRound
import com.rangepatte.app.game.tricks.TrickRules
import com.rangepatte.app.game.tricks.TrumpMode
import com.rangepatte.app.game.tricks.standardRank
import kotlin.random.Random

enum class DpPhase { PLAYING, ROUND_OVER, MATCH_OVER }

/** [winnerTeam] has the most tens (ties broken by cards captured); [kot] means it captured all four. */
data class DpResult(val winnerTeam: Int, val kot: Boolean, val tens: List<Int>, val cards: List<Int>)

/**
 * A hand of Dehla Pakad. Won tricks go to a pile on the table; the pile is only taken (by the winner's
 * team) when the *same player* wins two tricks in a row. Whoever first cannot follow suit names trump.
 * The team that captures more of the four tens wins the hand; all four is a Kot. Winning
 * [DehlaPakadEngine.STREAK_TO_WIN_MATCH] hands in a row wins the match.
 */
data class DpState(
    val dealer: Int,
    val phase: DpPhase,
    val round: TrickRound,
    val pile: List<PlayingCard>,
    val lastWinner: Int?,
    val teamTens: List<Int>,
    val teamCards: List<Int>,
    val handsWon: List<Int>,
    val streakTeam: Int?,
    val streak: Int,
    val result: DpResult? = null
)

object DehlaPakadEngine {
    const val STREAK_TO_WIN_MATCH = 7

    val rules = TrickRules(
        mode = TrumpMode.CALLED_BY_VOID,
        deck = Deck.standard().cards,
        rank = ::standardRank,
        points = { if (it.rank == Rank.TEN) 10 else 0 },
        hasPartners = true
    )

    fun newMatch(random: Random = Random.Default): DpState =
        newRound(dealer = 3, handsWon = listOf(0, 0), streakTeam = null, streak = 0, random = random)

    fun newRound(dealer: Int, handsWon: List<Int>, streakTeam: Int?, streak: Int, random: Random = Random.Default): DpState {
        val cards = Deck.standard().shuffled(random).cards
        val hands = List(4) { seat ->
            cards.subList(seat * 13, seat * 13 + 13).sortedWith(compareBy({ it.suit.ordinal }, { -standardRank(it) }))
        }
        return DpState(
            dealer = dealer,
            phase = DpPhase.PLAYING,
            round = TrickEngine.newRound(hands, leader = (dealer + 1) % 4, trumpSuit = null, trumpActive = false),
            pile = emptyList(),
            lastWinner = null,
            teamTens = listOf(0, 0),
            teamCards = listOf(0, 0),
            handsWon = handsWon,
            streakTeam = streakTeam,
            streak = streak
        )
    }

    fun needsTrumpCall(state: DpState) = state.phase == DpPhase.PLAYING && TrickEngine.needsTrumpCall(state.round, rules)

    fun callTrump(state: DpState, suit: Suit): DpState = state.copy(round = TrickEngine.callTrump(state.round, suit))

    fun play(state: DpState, card: PlayingCard): DpState? {
        if (state.phase != DpPhase.PLAYING) return null
        return TrickEngine.play(state.round, card, rules)?.let { state.copy(round = it) }
    }

    fun resolveTrick(state: DpState): DpState {
        val round = state.round
        if (state.phase != DpPhase.PLAYING || !TrickEngine.isTrickComplete(round)) return state
        val winner = TrickEngine.currentWinner(round, rules)
        val team = TrickEngine.teamOf(winner)
        var pile = state.pile + round.plays.map { it.card }
        var tens = state.teamTens
        var cards = state.teamCards
        val finished = TrickEngine.isFinished(TrickEngine.resolve(round, rules))

        // Two in a row by the same player takes the pile; at the end, whatever is left goes to the last winner.
        if (state.lastWinner == winner || finished) {
            tens = tens.mapIndexed { t, n -> if (t == team) n + pile.count { it.rank == Rank.TEN } else n }
            cards = cards.mapIndexed { t, n -> if (t == team) n + pile.size else n }
            pile = emptyList()
        }
        val resolved = state.copy(
            round = TrickEngine.resolve(round, rules),
            pile = pile,
            lastWinner = winner,
            teamTens = tens,
            teamCards = cards
        )
        return if (finished) finishHand(resolved, team) else resolved
    }

    private fun finishHand(state: DpState, lastTeam: Int): DpState {
        val tens = state.teamTens
        val cards = state.teamCards
        val winner = when {
            tens[0] != tens[1] -> if (tens[0] > tens[1]) 0 else 1
            cards[0] != cards[1] -> if (cards[0] > cards[1]) 0 else 1
            else -> lastTeam
        }
        val streak = if (state.streakTeam == winner) state.streak + 1 else 1
        return state.copy(
            handsWon = state.handsWon.mapIndexed { t, n -> if (t == winner) n + 1 else n },
            streakTeam = winner,
            streak = streak,
            result = DpResult(winner, kot = tens[winner] == 4, tens = tens, cards = cards),
            phase = if (streak >= STREAK_TO_WIN_MATCH) DpPhase.MATCH_OVER else DpPhase.ROUND_OVER
        )
    }

    fun nextRound(state: DpState, random: Random = Random.Default): DpState =
        newRound((state.dealer + 1) % 4, state.handsWon, state.streakTeam, state.streak, random)
}
