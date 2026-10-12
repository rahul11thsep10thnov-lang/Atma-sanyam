package com.rangepatte.app.game.snakes

import com.rangepatte.app.audio.SfxCue
import com.rangepatte.app.domain.ludo.LudoColor
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.domain.snakes.Outcome
import com.rangepatte.app.domain.snakes.SnakesAction
import com.rangepatte.app.domain.snakes.SnakesEngine
import com.rangepatte.app.domain.snakes.SnakesPhase
import com.rangepatte.app.domain.snakes.SnakesPlayer
import com.rangepatte.app.domain.snakes.SnakesRules
import com.rangepatte.app.domain.snakes.SnakesState
import com.rangepatte.app.domain.snakes.SnakesStats
import com.rangepatte.app.domain.snakes.SnakesTurn
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.net.core.MatchConfig
import com.rangepatte.app.net.core.Reader
import com.rangepatte.app.net.core.Writer
import kotlin.random.Random

/**
 * Moksha Patam on the lockstep engine (stage 6), the way Ludo is: the host rolls from the step's
 * shared random and every phone replays the step. Nothing is hidden, so a watcher sees everything.
 */
object SnakesMachine : GameMachine<SnakesState, SnakesAction> {
    override val gameId: GameId = GameId.SNAKES_LADDERS
    override val botDelayMs: Long = 1_600

    override fun start(config: MatchConfig, random: Random): SnakesState =
        SnakesEngine.newGame(config.seatNames, SnakesRules.decode(config.options), bots = (0 until config.seats).filter { it !in config.humanSeats }.toSet())

    override fun apply(state: SnakesState, action: SnakesAction, seat: Int, random: Random): SnakesState? {
        if (action == SnakesAction.Rematch) return if (seat == 0 && state.phase == SnakesPhase.OVER) SnakesEngine.rematch(state) else null
        if (state.phase == SnakesPhase.OVER || state.turn != seat) return null
        return SnakesEngine.apply(state, action, random.nextInt(1, 7))
    }

    override fun seatToAct(state: SnakesState): Int? = if (state.phase == SnakesPhase.OVER) 0 else state.turn
    override fun autoStep(state: SnakesState): SnakesState? = null
    override fun decideForBot(state: SnakesState, seat: Int, difficulty: AiDifficulty, random: Random): SnakesAction? =
        if (state.phase == SnakesPhase.ROLL) SnakesAction.Roll else null

    override fun startSfx(): List<SfxCue> = SnakesSfx.start()
    override fun sfxFor(before: SnakesState, after: SnakesState, action: SnakesAction?, mySeat: Int?): List<SfxCue> = SnakesSfx.cues(before, after, mySeat)

    override fun encode(action: SnakesAction): String = when (action) { SnakesAction.Roll -> "R"; SnakesAction.Rematch -> "N" }
    override fun decode(text: String): SnakesAction? = when (text) { "R" -> SnakesAction.Roll; "N" -> SnakesAction.Rematch; else -> null }

    override fun encodeState(state: SnakesState): String = Writer().apply {
        list(state.players) { p -> int(p.color.ordinal); str(p.name); int(p.square); nullableStr(p.avatarId); bool(p.isBot) }
        str(state.rules.encode()); int(state.turn); int(state.phase.ordinal); ints(state.places)
        when (val t = state.last) {
            null -> int(0)
            else -> { int(1); int(t.player); int(t.value); int(t.from); int(t.landed); int(t.to); int(t.outcome.ordinal); ints(t.captured); bool(t.finished); bool(t.extraRoll) }
        }
        int(state.moveCount)
        list(state.stats) { s -> int(s.turns); int(s.sixes); int(s.ladders); int(s.snakes); int(s.captures) }
    }.toString()

    override fun decodeState(text: String): SnakesState? = runCatching {
        val r = Reader(text)
        val players = r.list { SnakesPlayer(LudoColor.entries[int()], str(), int(), nullableStr(), bool()) }
        val rules = SnakesRules.decode(r.str()); val turn = r.int(); val phase = SnakesPhase.entries[r.int()]; val places = r.ints()
        val last = if (r.int() == 1) SnakesTurn(r.int(), r.int(), r.int(), r.int(), r.int(), Outcome.entries[r.int()], r.ints(), r.bool(), r.bool()) else null
        val moveCount = r.int()
        val stats = r.list { SnakesStats(int(), int(), int(), int(), int()) }
        SnakesState(players, rules, turn, phase, places, last, moveCount, stats)
    }.getOrNull()

    override fun redact(state: SnakesState, seat: Int?): SnakesState = state
    override fun isRoundBoundary(state: SnakesState): Boolean = state.phase == SnakesPhase.OVER
    override fun rename(state: SnakesState, seat: Int, name: String): SnakesState =
        if (seat !in state.players.indices) state else state.copy(players = state.players.mapIndexed { i, p -> if (i == seat) p.copy(name = name, isBot = false) else p })
}
