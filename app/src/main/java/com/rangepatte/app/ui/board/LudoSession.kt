package com.rangepatte.app.ui.board

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.rangepatte.app.audio.GameAudio
import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.domain.ludo.LudoEngine
import com.rangepatte.app.game.ludo.LudoSfx
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoSetup
import com.rangepatte.app.domain.ludo.LudoState
import com.rangepatte.app.game.common.UndoControl
import com.rangepatte.app.game.common.UndoHistory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.security.SecureRandom
import kotlin.random.Random
import kotlin.random.asKotlinRandom

/**
 * A solo Ludo table (stage 3): you at seat 0, the computer in the other seats. Dice come from a
 * secure random source; the engine decides everything else. A table with other people is
 * [LudoOnlineTable] (stage 6), the same engine over the card games' lockstep session.
 */
class LudoSession(setup: LudoSetup, youName: String, botNames: List<String>, youAvatar: String? = null) : LudoTableController {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val dice = SecureRandom().asKotlinRandom()
    private val random = Random(dice.nextLong())
    val difficulty = setup.difficulty
    override val mySeat = 0

    override var state: LudoState by mutableStateOf(LudoEngine.newGame(listOf(youName) + botNames.take(setup.players - 1), setup.rules, avatars = listOf(youAvatar), bots = (1 until setup.players).toSet(), firstColor = setup.color))
        private set

    /** The last dice value shown on the die (kept while the player chooses a token). */
    override var shownDice: Int? by mutableStateOf(null)
        private set

    override val isMyTurn: Boolean get() = state.turn == mySeat && state.phase != LudoPhase.OVER

    /** Stage 4: true while the board animates; the computer waits and the player's taps are ignored. */
    override var busy: Boolean by mutableStateOf(false)

    override fun start() { GameAudio.playCues(LudoSfx.start()); scope.launch { runBots() } }

    /** Every step goes through here, so each engine event is sounded exactly once (stage 9). */
    private fun step(next: LudoState) {
        val before = state
        state = next
        GameAudio.playCues(LudoSfx.cues(before, next, mySeat))
    }

    override fun roll() {
        if (!isMyTurn || state.phase != LudoPhase.ROLL || busy) return
        val value = dice.nextInt(1, 7)
        val before = state
        LudoEngine.roll(state, value)?.let { history.record(before to shownDice); step(it); shownDice = value }
    }

    /** Undo takes the table back to just before one of your rolls (bots' turns since then are undone too). */
    private val history = UndoHistory<Pair<LudoState, Int?>>()
    override val undo: UndoControl
        get() = UndoControl(usesLeft = history.usesLeft, enabled = history.canUndo && isMyTurn && !busy) {
            if (isMyTurn && !busy) history.undo()?.let { (s, d) -> state = s; shownDice = d; GameAudio.play(Sfx.UI_TAP) }
        }

    override fun move(token: Int) {
        if (!isMyTurn || state.phase != LudoPhase.MOVE || busy) return
        if (token !in state.movable) { GameAudio.play(Sfx.INVALID_MOVE); return }
        LudoEngine.move(state, token)?.let { step(it) }
    }

    private suspend fun runBots() {
        while (state.phase != LudoPhase.OVER) {
            if (busy) { delay(60); continue }
            if (state.turn != mySeat) {
                // A computer player pauses before each roll and each move, so people can follow it.
                delay(BOT_ROLL_PAUSE_MS)
                if (busy || state.turn == mySeat) continue
                when (state.phase) {
                    LudoPhase.ROLL -> { val v = dice.nextInt(1, 7); LudoEngine.roll(state, v)?.let { step(it); shownDice = v } }
                    LudoPhase.MOVE -> { delay(BOT_MOVE_PAUSE_MS); if (state.turn != mySeat && state.phase == LudoPhase.MOVE) LudoEngine.chooseToken(state, difficulty, random)?.let { t -> LudoEngine.move(state, t)?.let { step(it) } } }
                    LudoPhase.OVER -> Unit
                }
            } else delay(150)
        }
    }

    override val rematchOffer: RematchOffer get() = RematchOffer.PLAY_AGAIN
    override fun rematch() {
        LudoEngine.rematch(state)?.let { state = it; shownDice = null; history.reset(); GameAudio.playCues(LudoSfx.start()) }
    }

    override fun close() { scope.cancel() }
}

/** How long a computer player waits before rolling, and between its roll and its move. */
private const val BOT_ROLL_PAUSE_MS = 1_300L
private const val BOT_MOVE_PAUSE_MS = 900L
