package com.rangepatte.app.net.core

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import kotlin.random.Random

/**
 * A game seen as a state machine that moves are fed into. Implementations are thin adapters over
 * each game's engine. Everything here must be **deterministic**: the same state, action, seat and
 * [Random] must always give the same result, because every phone replays the same moves.
 *
 * - [S] is the engine's own state (all hands included).
 * - [A] is one move a player can make (play a card, place a bid …).
 */
interface GameMachine<S, A> {
    val gameId: GameId

    /** How long a computer player "thinks" before moving, so people can follow what happens. */
    val botDelayMs: Long get() = 900

    /** The very first position of a match. */
    fun start(config: MatchConfig, random: Random): S

    /** The state after [seat] makes [action], or null if that move is not allowed right now. */
    fun apply(state: S, action: A, seat: Int, random: Random): S?

    /** Whose move it is, or null when nobody can move yet (e.g. a finished trick waiting to be cleared). */
    fun seatToAct(state: S): Int?

    /** A step that needs no player — such as clearing a completed trick — or null if none is due. */
    fun autoStep(state: S): S?

    /** The computer's move for [seat] (which must be the seat to act), or null if it has none. */
    fun decideForBot(state: S, seat: Int, difficulty: AiDifficulty, random: Random): A?

    fun encode(action: A): String
    fun decode(text: String): A?
}
