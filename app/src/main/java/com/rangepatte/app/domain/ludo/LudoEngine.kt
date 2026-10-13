package com.rangepatte.app.domain.ludo

import com.rangepatte.app.domain.model.AiDifficulty
import kotlin.random.Random

/** One player's four tokens (relative positions, see [LudoBoard]) and their colour. */
data class LudoPlayer(
    val color: LudoColor,
    val name: String,
    val tokens: List<Int> = List(4) { LudoBoard.YARD },
    /** The Friends avatar to show on the yard plaque (stage 5); null for the numbered disc. */
    val avatarId: String? = null,
    /** A computer player (shown with the robot disc). */
    val isBot: Boolean = false
) {
    val finished: Int get() = tokens.count { it == LudoBoard.HOME }
    val inYard: Int get() = tokens.count { it == LudoBoard.YARD }
    val onBoard: Int get() = 4 - finished - inYard
    val isHome: Boolean get() = finished == 4
}

enum class LudoPhase { ROLL, MOVE, OVER }

/** What one player did in the match so far (stage 10), counted by the engine so every phone agrees. */
data class LudoStats(
    /** Rolls taken. */
    val turns: Int = 0,
    val sixes: Int = 0,
    /** Opponents' tokens this player sent home. */
    val captures: Int = 0,
    /** This player's tokens sent home. */
    val lost: Int = 0
)

/**
 * The whole game. [turn] indexes [players]; in [LudoPhase.ROLL] the player must roll, in
 * [LudoPhase.MOVE] they must pick one of [movable] tokens for [dice]. [places] lists finished
 * players in order. [lastEvent] says what the last move did, for sounds and animations.
 */
data class LudoState(
    val players: List<LudoPlayer>,
    val rules: LudoRules,
    val turn: Int = 0,
    val phase: LudoPhase = LudoPhase.ROLL,
    val dice: Int? = null,
    /** Sixes rolled in a row this turn. */
    val sixStreak: Int = 0,
    val places: List<Int> = emptyList(),
    val lastEvent: LudoEvent? = null,
    val moveCount: Int = 0,
    /** One entry per player, in seat order (empty in states from before stage 10: read as zeros). */
    val stats: List<LudoStats> = emptyList()
) {
    val current: LudoPlayer get() = players[turn]
    fun statsOf(seat: Int): LudoStats = stats.getOrElse(seat) { LudoStats() }
    private fun withStats(seat: Int, change: (LudoStats) -> LudoStats): LudoState =
        copy(stats = List(players.size) { i -> if (i == seat) change(statsOf(i)) else statsOf(i) })
    internal fun tally(seat: Int, change: (LudoStats) -> LudoStats) = withStats(seat, change)
    /** The tokens of the current player that may move for [dice]. */
    val movable: List<Int> get() = if (phase == LudoPhase.MOVE && dice != null) LudoEngine.movableTokens(this, turn, dice) else emptyList()
}

/** What the last step did, for the screen's sounds and animations (stage 4). */
sealed interface LudoEvent {
    data class Rolled(val player: Int, val value: Int, val noMove: Boolean) : LudoEvent
    data class Moved(val player: Int, val token: Int, val from: Int, val to: Int, val captured: List<Pair<Int, Int>>, val finished: Boolean, val extraRoll: Boolean) : LudoEvent
    data class Forfeit(val player: Int) : LudoEvent
    data class Won(val player: Int, val place: Int) : LudoEvent
}

sealed interface LudoAction {
    data object Roll : LudoAction
    data class Move(val token: Int) : LudoAction
    /** Stage 10: the host starts the match again with the same seats, colours and rules (only when it is over). */
    data object Rematch : LudoAction
}

/**
 * The Ludo rules engine (stage 3): pure functions over [LudoState], honouring every [LudoRules]
 * switch. Nothing here draws or animates; the screen only shows what these functions decide.
 */
object LudoEngine {
    /** A fresh game for [names] in seat order; 2 players sit opposite (red and yellow), 3 leave blue empty. */
    fun newGame(names: List<String>, rules: LudoRules = LudoRules.DEFAULT, avatars: List<String?> = emptyList(), bots: Set<Int> = emptySet(), firstColor: LudoColor = LudoColor.RED): LudoState {
        require(names.size in 2..4) { "2 to 4 players" }
        val colors = colorsFor(names.size, firstColor)
        return LudoState(players = names.zip(colors) { n, c -> LudoPlayer(c, n) }.mapIndexed { i, p -> p.copy(avatarId = avatars.getOrNull(i), isBot = i in bots) }, rules = rules, stats = List(names.size) { LudoStats() })
    }

    /** The same table again (stage 10): names, colours, avatars, computer seats and rules kept; tokens and counts fresh. */
    fun rematch(state: LudoState): LudoState? {
        if (state.phase != LudoPhase.OVER) return null
        return LudoState(players = state.players.map { it.copy(tokens = List(4) { LudoBoard.YARD }) }, rules = state.rules, stats = List(state.players.size) { LudoStats() })
    }

    /**
     * The final order (stage 10): the places already won, then everyone still playing ranked by tokens
     * home, then by how far their tokens have travelled, then by seat.
     */
    fun finalPlaces(state: LudoState): List<Int> {
        val rest = state.players.indices.filter { it !in state.places }
            .sortedWith(compareByDescending<Int> { state.players[it].finished }.thenByDescending { progress(state.players[it]) }.thenBy { it })
        return state.places + rest
    }

    private fun progress(p: LudoPlayer): Int = p.tokens.sumOf { if (it == LudoBoard.YARD) 0 else it + 1 }

    /**
     * The colour of each seat at a table of [players], seat 0 playing [first] (the colour the player or
     * the host chose) and the others following clockwise: two players sit opposite each other, three
     * leave the yard before [first] empty.
     */
    fun colorsFor(players: Int, first: LudoColor = LudoColor.RED): List<LudoColor> {
        val all = LudoColor.values()
        fun at(step: Int) = all[(first.ordinal + step) % 4]
        return when (players) {
            2 -> listOf(at(0), at(2))
            3 -> listOf(at(0), at(1), at(2))
            else -> listOf(at(0), at(1), at(2), at(3))
        }
    }

    /** The token indices of [player] that can legally move [dice] squares. */
    fun movableTokens(state: LudoState, player: Int, dice: Int): List<Int> {
        val p = state.players[player]
        return p.tokens.indices.filter { canMove(state, player, it, dice) }
    }

    private fun canMove(state: LudoState, player: Int, token: Int, dice: Int): Boolean {
        val pos = state.players[player].tokens[token]
        return when {
            pos == LudoBoard.HOME -> false
            pos == LudoBoard.YARD -> (!state.rules.sixToEnter || dice == 6) && !blockedByOwnStack(state, player, 0)
            else -> {
                val target = pos + dice
                if (target > LudoBoard.HOME) false
                else if (target == LudoBoard.HOME) true
                else if (target > LudoBoard.LAST_TRACK && !state.rules.exactFinish && target > LudoBoard.HOME) false
                else !blockedByOwnStack(state, player, target)
            }
        }
    }

    /** Two of one's own tokens may share a square only if it is safe; elsewhere a token cannot land on its own. */
    private fun blockedByOwnStack(state: LudoState, player: Int, target: Int): Boolean = false

    /** Rolls [value] for the current player (the host decides the value; this only applies it). */
    fun roll(before: LudoState, value: Int): LudoState? {
        if (before.phase != LudoPhase.ROLL || value !in 1..6) return null
        val state = before.tally(before.turn) { it.copy(turns = it.turns + 1, sixes = it.sixes + (if (value == 6) 1 else 0)) }
        val streak = if (value == 6) state.sixStreak + 1 else 0
        // Three sixes in a row forfeit the turn (only when sixes grant extra rolls).
        if (state.rules.extraRollOnSix && streak == 3) {
            return next(state.copy(dice = value, sixStreak = 0, lastEvent = LudoEvent.Forfeit(state.turn), moveCount = state.moveCount + 1))
        }
        val movable = movableTokens(state, state.turn, value)
        if (movable.isEmpty()) {
            val keep = value == 6 && state.rules.extraRollOnSix
            val after = state.copy(dice = value, sixStreak = streak, lastEvent = LudoEvent.Rolled(state.turn, value, noMove = true), moveCount = state.moveCount + 1)
            return if (keep) after.copy(phase = LudoPhase.ROLL) else next(after)
        }
        return state.copy(phase = LudoPhase.MOVE, dice = value, sixStreak = streak, lastEvent = LudoEvent.Rolled(state.turn, value, noMove = false), moveCount = state.moveCount + 1)
    }

    /** Moves [token] of the current player by the rolled dice. */
    fun move(state: LudoState, token: Int): LudoState? {
        val dice = state.dice ?: return null
        if (state.phase != LudoPhase.MOVE || token !in state.movable) return null
        val me = state.current
        val from = me.tokens[token]
        val to = if (from == LudoBoard.YARD) 0 else from + dice
        var players = state.players
        val captured = ArrayList<Pair<Int, Int>>()
        // Captures: an opponent alone on the target track square, unless it is safe.
        if (to <= LudoBoard.LAST_TRACK) {
            val abs = LudoBoard.trackIndex(me.color, to)
            if (!LudoBoard.isSafe(abs)) {
                players = players.mapIndexed { i, p ->
                    if (i == state.turn) p else {
                        val hits = p.tokens.indices.filter { t -> p.tokens[t] in 0..LudoBoard.LAST_TRACK && LudoBoard.trackIndex(p.color, p.tokens[t]) == abs }
                        if (hits.isEmpty()) p else {
                            hits.forEach { captured += i to it }
                            p.copy(tokens = p.tokens.mapIndexed { t, pos -> if (t in hits) LudoBoard.YARD else pos })
                        }
                    }
                }
            }
        }
        players = players.mapIndexed { i, p -> if (i == state.turn) p.copy(tokens = p.tokens.mapIndexed { t, pos -> if (t == token) to else pos }) else p }
        val finished = to == LudoBoard.HOME
        val extra = (dice == 6 && state.rules.extraRollOnSix) || (captured.isNotEmpty() && state.rules.extraRollOnCapture) || finished
        var after = state.copy(players = players, phase = LudoPhase.ROLL, dice = null, moveCount = state.moveCount + 1,
            lastEvent = LudoEvent.Moved(state.turn, token, from, to, captured, finished, extra))
        if (captured.isNotEmpty()) {
            after = after.tally(state.turn) { it.copy(captures = it.captures + captured.size) }
            captured.forEach { (victim, _) -> after = after.tally(victim) { it.copy(lost = it.lost + 1) } }
        }
        if (players[state.turn].isHome && state.turn !in after.places) {
            after = after.copy(places = after.places + state.turn, lastEvent = LudoEvent.Won(state.turn, after.places.size + 1))
            val stillPlaying = players.indices.filter { it !in after.places }
            if (!state.rules.playOnForPlaces || stillPlaying.size <= 1) {
                return after.copy(phase = LudoPhase.OVER, places = finalPlaces(after))
            }
            return next(after)
        }
        return if (extra) after.copy(sixStreak = if (dice == 6) state.sixStreak else 0) else next(after)
    }

    /** Passes the turn to the next player still in the game. */
    private fun next(state: LudoState): LudoState {
        var t = state.turn
        repeat(state.players.size) {
            t = (t + 1) % state.players.size
            if (t !in state.places) return state.copy(turn = t, phase = LudoPhase.ROLL, dice = null, sixStreak = 0)
        }
        return state.copy(phase = LudoPhase.OVER, places = finalPlaces(state))
    }

    fun apply(state: LudoState, action: LudoAction, diceValue: Int): LudoState? = when (action) {
        LudoAction.Roll -> roll(state, diceValue)
        is LudoAction.Move -> move(state, action.token)
        LudoAction.Rematch -> rematch(state)
    }

    /** The computer's choice of token: finish, capture, escape a threat, leave the yard, else advance the leader. */
    fun chooseToken(state: LudoState, difficulty: AiDifficulty, random: Random): Int? {
        val options = state.movable
        if (options.isEmpty()) return null
        if (difficulty == AiDifficulty.EASY) return options[random.nextInt(options.size)]
        val me = state.current
        val dice = state.dice ?: return options.first()
        fun score(token: Int): Int {
            val from = me.tokens[token]
            val to = if (from == LudoBoard.YARD) 0 else from + dice
            var s = 0
            if (to == LudoBoard.HOME) s += 100
            if (to <= LudoBoard.LAST_TRACK) {
                val abs = LudoBoard.trackIndex(me.color, to)
                val captures = state.players.withIndex().any { (i, p) -> i != state.turn && p.tokens.any { it in 0..LudoBoard.LAST_TRACK && LudoBoard.trackIndex(p.color, it) == abs } }
                if (captures && !LudoBoard.isSafe(abs)) s += 60
                if (LudoBoard.isSafe(abs)) s += 15
                if (difficulty == AiDifficulty.HARD) {
                    // Threat behind the target square (an opponent within six squares) counts against it; escaping a threat counts for it.
                    if (threatened(state, me.color, to)) s -= 25
                    if (from in 0..LudoBoard.LAST_TRACK && threatened(state, me.color, from)) s += 20
                }
            }
            if (from == LudoBoard.YARD) s += 30
            s += to / 4
            return s
        }
        return options.maxByOrNull { score(it) }
    }

    private fun threatened(state: LudoState, color: LudoColor, p: Int): Boolean {
        val abs = LudoBoard.trackIndex(color, p)
        if (LudoBoard.isSafe(abs)) return false
        return state.players.any { other ->
            other.color != color && other.tokens.any { t ->
                t in 0..LudoBoard.LAST_TRACK && ((abs - LudoBoard.trackIndex(other.color, t) + LudoBoard.TRACK_LENGTH) % LudoBoard.TRACK_LENGTH) in 1..6
            }
        }
    }
}
