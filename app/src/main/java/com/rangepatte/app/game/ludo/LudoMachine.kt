package com.rangepatte.app.game.ludo

import com.rangepatte.app.audio.SfxCue
import com.rangepatte.app.domain.ludo.LudoAction
import com.rangepatte.app.domain.ludo.LudoColor
import com.rangepatte.app.domain.ludo.LudoEngine
import com.rangepatte.app.domain.ludo.LudoEvent
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoPlayer
import com.rangepatte.app.domain.ludo.LudoRules
import com.rangepatte.app.domain.ludo.LudoState
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.net.core.MatchConfig
import com.rangepatte.app.net.core.Reader
import com.rangepatte.app.net.core.Writer
import kotlin.random.Random

/**
 * Ludo on the lockstep engine (stage 6): the same [LudoEngine] the solo table uses, fed through the
 * host-authoritative session every card game runs on. The host rolls — the die value comes from the
 * step's shared [Random], so every phone that replays the step gets the same number — and checks
 * every move; guests only ever apply what the host accepted. Nothing in the screens decides a result.
 *
 * Ludo hides nothing, so [redact] is the identity and a watcher sees the whole board. There are no
 * rounds, so a watcher is never seated mid-match ([isRoundBoundary] is false until the match is over).
 */
object LudoMachine : GameMachine<LudoState, LudoAction> {
    override val gameId: GameId = GameId.LUDO

    /** Long enough for the die spin and a token glide (stage 4) to finish before the next computer move. */
    override val botDelayMs: Long = 1_400

    override fun start(config: MatchConfig, random: Random): LudoState =
        LudoEngine.newGame(
            names = config.seatNames,
            rules = LudoRules.decode(config.options),
            bots = (0 until config.seats).filter { it !in config.humanSeats }.toSet()
        )

    override fun apply(state: LudoState, action: LudoAction, seat: Int, random: Random): LudoState? {
        if (state.phase == LudoPhase.OVER || state.turn != seat) return null
        return LudoEngine.apply(state, action, random.nextInt(1, 7))
    }

    override fun seatToAct(state: LudoState): Int? = state.turn.takeIf { state.phase != LudoPhase.OVER }

    override fun autoStep(state: LudoState): LudoState? = null

    override fun decideForBot(state: LudoState, seat: Int, difficulty: AiDifficulty, random: Random): LudoAction? = when (state.phase) {
        LudoPhase.ROLL -> LudoAction.Roll
        LudoPhase.MOVE -> LudoEngine.chooseToken(state, difficulty, random)?.let { LudoAction.Move(it) }
        LudoPhase.OVER -> null
    }

    override fun startSfx(): List<SfxCue> = LudoSfx.start()

    override fun sfxFor(before: LudoState, after: LudoState, action: LudoAction?, mySeat: Int?): List<SfxCue> = LudoSfx.cues(before, after, mySeat)

    override fun encode(action: LudoAction): String = when (action) {
        LudoAction.Roll -> "R"
        is LudoAction.Move -> "M${action.token}"
    }

    override fun decode(text: String): LudoAction? = when {
        text == "R" -> LudoAction.Roll
        text.startsWith("M") -> text.drop(1).toIntOrNull()?.takeIf { it in 0..3 }?.let { LudoAction.Move(it) }
        else -> null
    }

    override fun encodeState(state: LudoState): String = Writer().apply {
        list(state.players) { p ->
            int(p.color.ordinal); str(p.name); ints(p.tokens); nullableStr(p.avatarId); bool(p.isBot)
        }
        str(state.rules.encode())
        int(state.turn); int(state.phase.ordinal); nullableInt(state.dice); int(state.sixStreak)
        ints(state.places)
        when (val e = state.lastEvent) {
            null -> int(-1)
            is LudoEvent.Rolled -> { int(0); int(e.player); int(e.value); bool(e.noMove) }
            is LudoEvent.Moved -> {
                int(1); int(e.player); int(e.token); int(e.from); int(e.to)
                list(e.captured) { (p, t) -> int(p); int(t) }
                bool(e.finished); bool(e.extraRoll)
            }
            is LudoEvent.Forfeit -> { int(2); int(e.player) }
            is LudoEvent.Won -> { int(3); int(e.player); int(e.place) }
        }
        int(state.moveCount)
    }.toString()

    override fun decodeState(text: String): LudoState? = runCatching {
        val r = Reader(text)
        val players = r.list { LudoPlayer(LudoColor.entries[int()], str(), ints(), nullableStr(), bool()) }
        val rules = LudoRules.decode(r.str())
        val turn = r.int(); val phase = LudoPhase.entries[r.int()]; val dice = r.nullableInt(); val streak = r.int()
        val places = r.ints()
        val event: LudoEvent? = when (r.int()) {
            0 -> LudoEvent.Rolled(r.int(), r.int(), r.bool())
            1 -> LudoEvent.Moved(r.int(), r.int(), r.int(), r.int(), r.list { int() to int() }, r.bool(), r.bool())
            2 -> LudoEvent.Forfeit(r.int())
            3 -> LudoEvent.Won(r.int(), r.int())
            else -> null
        }
        LudoState(players, rules, turn, phase, dice, streak, places, event, r.int())
    }.getOrNull()

    override fun redact(state: LudoState, seat: Int?): LudoState = state

    override fun isRoundBoundary(state: LudoState): Boolean = state.phase == LudoPhase.OVER

    override fun rename(state: LudoState, seat: Int, name: String): LudoState =
        if (seat !in state.players.indices) state
        else state.copy(players = state.players.mapIndexed { i, p -> if (i == seat) p.copy(name = name, isBot = false) else p })
}
