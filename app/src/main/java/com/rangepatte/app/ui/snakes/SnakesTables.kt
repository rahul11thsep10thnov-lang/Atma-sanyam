package com.rangepatte.app.ui.snakes

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.rangepatte.app.audio.GameAudio
import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.domain.snakes.SnakesAction
import com.rangepatte.app.domain.snakes.SnakesEngine
import com.rangepatte.app.domain.snakes.SnakesPhase
import com.rangepatte.app.domain.snakes.SnakesSetup
import com.rangepatte.app.domain.snakes.SnakesState
import com.rangepatte.app.game.common.TalkControl
import com.rangepatte.app.game.common.TalkLayout
import com.rangepatte.app.game.common.UndoControl
import com.rangepatte.app.game.common.UndoHistory
import com.rangepatte.app.game.common.talkControl
import com.rangepatte.app.game.snakes.SnakesSfx
import com.rangepatte.app.net.GameSession
import com.rangepatte.app.ui.board.RematchOffer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.security.SecureRandom
import kotlin.random.asKotlinRandom

/** What the Moksha Patam screen needs from a table, alone or with other people — the same face Ludo's tables have. */
interface SnakesTableController {
    val state: SnakesState
    val mySeat: Int
    val shownDice: Int?
    val isMyTurn: Boolean
    var busy: Boolean
    val connectionLost: Boolean get() = false
    val awaySeats: Map<Int, Long> get() = emptyMap()
    val botSeats: Set<Int> get() = emptySet()
    val reconnecting: Boolean get() = false
    val reconnectDeadline: Long get() = 0L
    val rejoined: Boolean get() = false
    fun acknowledgeRejoined() {}
    val talk: TalkControl? get() = null
    /** The Undo button; only a table against the computer has one. */
    val undo: UndoControl? get() = null
    val rematchOffer: RematchOffer
    fun start()
    fun roll()
    fun rematch()
    fun close()
}

/** A solo table: you at seat 0, the computer in the other seats; dice from a secure source. */
class SnakesSession(setup: SnakesSetup, youName: String, botNames: List<String>, youAvatar: String? = null) : SnakesTableController {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val dice = SecureRandom().asKotlinRandom()
    override val mySeat = 0
    override var state: SnakesState by mutableStateOf(SnakesEngine.newGame(listOf(youName) + botNames.take(setup.players - 1), setup.rules, avatars = listOf(youAvatar), bots = (1 until setup.players).toSet()))
        private set
    override var shownDice: Int? by mutableStateOf(null)
        private set
    override val isMyTurn: Boolean get() = state.turn == mySeat && state.phase != SnakesPhase.OVER
    override var busy: Boolean by mutableStateOf(false)
    override val rematchOffer: RematchOffer get() = RematchOffer.PLAY_AGAIN

    override fun start() { GameAudio.playCues(SnakesSfx.start()); scope.launch { runBots() } }

    private fun step(next: SnakesState) {
        val before = state
        state = next
        GameAudio.playCues(SnakesSfx.cues(before, next, mySeat))
    }

    override fun roll() {
        if (!isMyTurn || busy) return
        val value = dice.nextInt(1, 7)
        val before = state
        SnakesEngine.roll(state, value)?.let { history.record(before to shownDice); step(it); shownDice = value }
    }

    /** Undo takes the table back to just before one of your rolls (the computer's turns since then are undone too). */
    private val history = UndoHistory<Pair<SnakesState, Int?>>()
    override val undo: UndoControl
        get() = UndoControl(usesLeft = history.usesLeft, enabled = history.canUndo && isMyTurn && !busy) {
            if (isMyTurn && !busy) history.undo()?.let { (s, d) -> state = s; shownDice = d; GameAudio.play(Sfx.UI_TAP) }
        }

    override fun rematch() {
        SnakesEngine.rematch(state)?.let { state = it; shownDice = null; history.reset(); GameAudio.playCues(SnakesSfx.start()) }
    }

    private suspend fun runBots() {
        while (true) {
            if (state.phase == SnakesPhase.OVER || busy || state.turn == mySeat) { delay(120); continue }
            // A computer player pauses before each roll, so people can follow it.
            delay(1_400)
            if (busy || state.phase == SnakesPhase.OVER || state.turn == mySeat) continue
            val v = dice.nextInt(1, 7)
            SnakesEngine.roll(state, v)?.let { step(it); shownDice = v }
        }
    }

    override fun close() { scope.cancel() }
}

/** A table with other people: a thin face over the same [GameSession] the card games and Ludo use. */
class SnakesOnlineTable(private val session: GameSession<SnakesState, SnakesAction>) : SnakesTableController {
    override val state: SnakesState get() = session.state
    override val mySeat: Int get() = session.mySeat
    override val connectionLost: Boolean get() = session.connectionLost
    override val awaySeats: Map<Int, Long> get() = session.awaySeats
    override val botSeats: Set<Int> get() = session.botSeats
    override val reconnecting: Boolean get() = session.reconnecting
    override val reconnectDeadline: Long get() = session.reconnectDeadline
    override val rejoined: Boolean get() = session.rejoined
    override fun acknowledgeRejoined() = session.acknowledgeRejoined()
    override val talk: TalkControl? get() = session.talkControl(TalkLayout.BOARD)
    override val rematchOffer: RematchOffer get() = if (session.isHost) RematchOffer.REMATCH else RematchOffer.WAITING
    override var busy: Boolean by mutableStateOf(false)
    val tableCode: String get() = session.roomCode ?: "nearby"

    private var lastShown: Int? = null
    override val shownDice: Int?
        get() { val v = state.last?.value ?: lastShown; if (v != lastShown) lastShown = v; return v }

    override val isMyTurn: Boolean get() = !session.isSpectator && !session.reconnecting && state.turn == mySeat && state.phase != SnakesPhase.OVER
    override fun start() = session.start()
    override fun roll() { if (isMyTurn && !busy) session.submit(SnakesAction.Roll) }
    override fun rematch() { if (session.isHost && state.phase == SnakesPhase.OVER) session.submit(SnakesAction.Rematch) }
    override fun close() = session.close()
}
