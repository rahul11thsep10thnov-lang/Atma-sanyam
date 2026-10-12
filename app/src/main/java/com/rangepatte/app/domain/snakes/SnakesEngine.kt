package com.rangepatte.app.domain.snakes

import com.rangepatte.app.domain.ludo.LudoColor
import com.rangepatte.app.domain.ludo.LudoEngine

/** One player's token (its square, 0 = not yet on the board) and colour; the colours are Ludo's. */
data class SnakesPlayer(
    val color: LudoColor,
    val name: String,
    val square: Int = SnakesBoard.START,
    val avatarId: String? = null,
    val isBot: Boolean = false
) {
    val isHome: Boolean get() = square == SnakesBoard.LAST
}

enum class SnakesPhase { ROLL, OVER }

/** What one player did so far, counted by the engine so every phone agrees (stage 10). */
data class SnakesStats(val turns: Int = 0, val sixes: Int = 0, val ladders: Int = 0, val snakes: Int = 0, val captures: Int = 0)

/** How a roll ended for the token. */
enum class Outcome { MOVED, STAYED, BOUNCED, NO_ENTRY }

/**
 * What the last roll did (stage 4 animates it: the die, the glide from [from] to [landed] along the
 * numbering, then the climb or slide to [to]). [captured] lists the seats sent back to the start.
 */
data class SnakesTurn(
    val player: Int,
    val value: Int,
    val from: Int,
    val landed: Int,
    val to: Int,
    val outcome: Outcome,
    val captured: List<Int> = emptyList(),
    val finished: Boolean = false,
    val extraRoll: Boolean = false
) {
    val climbed: Boolean get() = to > landed
    val slid: Boolean get() = to < landed
}

sealed interface SnakesAction {
    data object Roll : SnakesAction
    /** The host starts the match again with the same seats and rules (only when it is over). */
    data object Rematch : SnakesAction
}

data class SnakesState(
    val players: List<SnakesPlayer>,
    val rules: SnakesRules,
    val turn: Int = 0,
    val phase: SnakesPhase = SnakesPhase.ROLL,
    val places: List<Int> = emptyList(),
    val last: SnakesTurn? = null,
    val moveCount: Int = 0,
    val stats: List<SnakesStats> = emptyList()
) {
    val current: SnakesPlayer get() = players[turn]
    fun statsOf(seat: Int): SnakesStats = stats.getOrElse(seat) { SnakesStats() }
    internal fun tally(seat: Int, change: (SnakesStats) -> SnakesStats): SnakesState =
        copy(stats = List(players.size) { i -> if (i == seat) change(statsOf(i)) else statsOf(i) })
}

/**
 * The Moksha Patam rules engine (stage 3): pure functions over [SnakesState] honouring every
 * [SnakesRules] switch. A roll moves the player's one token at once; there is nothing to choose, so
 * the only decisions are the host's die and, at the end, a rematch.
 */
object SnakesEngine {
    fun newGame(names: List<String>, rules: SnakesRules = SnakesRules.DEFAULT, avatars: List<String?> = emptyList(), bots: Set<Int> = emptySet()): SnakesState {
        require(names.size in 2..4) { "2 to 4 players" }
        val colors = LudoEngine.colorsFor(names.size)
        return SnakesState(
            players = names.mapIndexed { i, n -> SnakesPlayer(colors[i], n, avatarId = avatars.getOrNull(i), isBot = i in bots) },
            rules = rules, stats = List(names.size) { SnakesStats() }
        )
    }

    fun rematch(state: SnakesState): SnakesState? {
        if (state.phase != SnakesPhase.OVER) return null
        return SnakesState(players = state.players.map { it.copy(square = SnakesBoard.START) }, rules = state.rules, stats = List(state.players.size) { SnakesStats() })
    }

    /** Rolls [value] for the current player and moves their token; the host decides the value. */
    fun roll(before: SnakesState, value: Int): SnakesState? {
        if (before.phase != SnakesPhase.ROLL || value !in 1..6) return null
        val seat = before.turn
        val me = before.current
        var state = before.tally(seat) { it.copy(turns = it.turns + 1, sixes = it.sixes + (if (value == 6) 1 else 0)) }
        val rules = state.rules
        val from = me.square
        var outcome = Outcome.MOVED
        var landed: Int
        if (from == SnakesBoard.START && rules.sixToStart && value != 6) {
            outcome = Outcome.NO_ENTRY; landed = from
        } else {
            landed = from + value
            if (landed > SnakesBoard.LAST) {
                if (!rules.exactFinish) landed = SnakesBoard.LAST
                else if (rules.bounceBack) { landed = SnakesBoard.LAST - (landed - SnakesBoard.LAST); outcome = Outcome.BOUNCED }
                else { landed = from; outcome = Outcome.STAYED }
            }
        }
        val to = if (outcome == Outcome.MOVED || outcome == Outcome.BOUNCED) SnakesBoard.jump(landed) ?: landed else landed
        if (to > landed) state = state.tally(seat) { it.copy(ladders = it.ladders + 1) }
        if (to < landed) state = state.tally(seat) { it.copy(snakes = it.snakes + 1) }
        var players = state.players
        val captured = ArrayList<Int>()
        if (rules.captures && to != from && to in 1 until SnakesBoard.LAST) {
            players = players.mapIndexed { i, p -> if (i != seat && p.square == to) { captured += i; p.copy(square = SnakesBoard.START) } else p }
        }
        if (captured.isNotEmpty()) state = state.tally(seat) { it.copy(captures = it.captures + captured.size) }
        players = players.mapIndexed { i, p -> if (i == seat) p.copy(square = to) else p }
        val finished = to == SnakesBoard.LAST
        val extra = value == 6 && rules.sixRollsAgain && !finished
        var after = state.copy(players = players, moveCount = state.moveCount + 1,
            last = SnakesTurn(seat, value, from, landed, to, outcome, captured, finished, extra))
        if (finished) {
            after = after.copy(places = after.places + seat)
            val stillPlaying = players.indices.filter { it !in after.places }
            if (!rules.playOnForPlaces || stillPlaying.size <= 1) return after.copy(phase = SnakesPhase.OVER, places = finalPlaces(after))
            return next(after)
        }
        return if (extra) after else next(after)
    }

    private fun next(state: SnakesState): SnakesState {
        var t = state.turn
        repeat(state.players.size) {
            t = (t + 1) % state.players.size
            if (t !in state.places) return state.copy(turn = t)
        }
        return state.copy(phase = SnakesPhase.OVER, places = finalPlaces(state))
    }

    /** The places already won, then everyone else by square, then by seat. */
    fun finalPlaces(state: SnakesState): List<Int> =
        state.places + state.players.indices.filter { it !in state.places }.sortedWith(compareByDescending<Int> { state.players[it].square }.thenBy { it })

    fun apply(state: SnakesState, action: SnakesAction, diceValue: Int): SnakesState? = when (action) {
        SnakesAction.Roll -> roll(state, diceValue)
        SnakesAction.Rematch -> rematch(state)
    }
}
