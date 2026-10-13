package com.rangepatte.app.net.core

import com.rangepatte.app.audio.SfxCue
import com.rangepatte.app.audio.SfxSequences
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
    val botDelayMs: Long get() = 1_600

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

    /**
     * The sound effects for a table that has just opened (the first shuffle and deal). Pure: it only
     * names the effects; the app plays them.
     */
    fun startSfx(): List<SfxCue> = SfxSequences.freshMatch()

    /**
     * The sound effects for one accepted step from [before] to [after]: [action] is the move a player
     * made, or null for an automatic step (clearing a finished trick). Called once per step on every
     * phone, so a game must only name effects for things that really happened in that step.
     */
    fun sfx(before: S, after: S, action: A?): List<SfxCue> = emptyList()

    /**
     * Like [sfx], but told which seat this phone plays ([mySeat]; null for a watcher), for games whose
     * sounds differ by listener — "your turn", your own victory (Ludo stage 9). Defaults to [sfx].
     */
    fun sfxFor(before: S, after: S, action: A?, mySeat: Int?): List<SfxCue> = sfx(before, after, action)

    fun encode(action: A): String
    fun decode(text: String): A?

    /** The whole state as text, for a phone that must pick the game up mid-way (a spectator, a latecomer). */
    fun encodeState(state: S): String
    fun decodeState(text: String): S?

    /**
     * [state] as [seat] may see it: every other hand replaced by hidden cards of the same count. Seat
     * null is a spectator and sees no hand at all. What is public (played cards, bids, scores) stays.
     */
    fun redact(state: S, seat: Int?): S

    /** True between rounds: the moment a spectator may be seated before the next deal. */
    fun isRoundBoundary(state: S): Boolean

    /**
     * How many tricks (or turns) are left before the round ends, for the spectator's "4 tricks left"
     * ribbon — or null when the game has no sensible count (betting, rummy turns).
     */
    fun stepsLeftInRound(state: S): Int? = null

    /**
     * [state] with [seat] now played by a person called [name] — only naming changes, never cards or
     * scores. Games that keep names in their state override this; others return [state] unchanged.
     */
    fun rename(state: S, seat: Int, name: String): S = state
}
