package com.rangepatte.app.ui.board

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.rangepatte.app.domain.ludo.LudoAction
import com.rangepatte.app.domain.ludo.LudoEvent
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.audio.GameAudio
import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.domain.ludo.LudoState
import com.rangepatte.app.game.common.TalkControl
import com.rangepatte.app.game.common.TalkLayout
import com.rangepatte.app.game.common.talkControl
import com.rangepatte.app.net.GameSession

/**
 * What the Ludo screen needs from a table, whether it is played alone ([LudoSession]) or with other
 * people over the lockstep session ([LudoOnlineTable], stage 6). The screen never decides a result:
 * it shows [state] and asks for a roll or a move.
 */
interface LudoTableController {
    val state: LudoState
    val mySeat: Int
    /** The last die value shown (kept while a token is chosen). */
    val shownDice: Int?
    val isMyTurn: Boolean
    /** True while the board animates; taps are ignored meanwhile. */
    var busy: Boolean
    /** Set when the table cannot continue (the host left or the connection broke); never on a solo table. */
    val connectionLost: Boolean get() = false
    /** Stage 8: seats whose player dropped out → when their window closes (ms). */
    val awaySeats: Map<Int, Long> get() = emptyMap()
    /** Seats the computer plays now (grows when a player leaves). */
    val botSeats: Set<Int> get() = emptySet()
    /** This phone lost the host and is getting its seat back; [reconnectDeadline] is when the host gives up on it. */
    val reconnecting: Boolean get() = false
    val reconnectDeadline: Long get() = 0L
    /** Set once after the host seated us again; [acknowledgeRejoined] clears it. */
    val rejoined: Boolean get() = false
    fun acknowledgeRejoined() {}
    /** Table talk (stage 9); null on a solo table. */
    val talk: TalkControl? get() = null
    /** Stage 10: who may start the match again from this phone. */
    val rematchOffer: RematchOffer
    fun rematch()
    fun start()
    fun roll()
    fun move(token: Int)
    fun close()
}

/**
 * A Ludo table with other people: a thin face over the same [GameSession] the card games use. The
 * host's session rolls and checks moves and runs the computer seats; a guest's session sends its
 * actions to the host and applies what comes back. [shownDice] follows the engine's roll events, so
 * every phone shows the number the host's die produced.
 */
class LudoOnlineTable(private val session: GameSession<LudoState, LudoAction>) : LudoTableController {
    override val state: LudoState get() = session.state
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
    override fun rematch() { if (session.isHost && state.phase == LudoPhase.OVER) session.submit(LudoAction.Rematch) }
    override var busy: Boolean by mutableStateOf(false)

    /** Where friends can find this table: the online room code, or "nearby" for a Bluetooth/Wi-Fi table. */
    val tableCode: String get() = session.roomCode ?: "nearby"

    // A plain field, not snapshot state: the getter must never write state while Compose reads it.
    private var lastShown: Int? = null
    override val shownDice: Int?
        get() {
            val event = state.lastEvent
            val shown = when {
                event is LudoEvent.Rolled -> event.value
                event is LudoEvent.Forfeit -> 6
                state.dice != null -> state.dice
                else -> lastShown
            }
            if (shown != lastShown) lastShown = shown
            return shown
        }

    override val isMyTurn: Boolean get() = !session.isSpectator && !session.reconnecting && state.turn == mySeat && state.phase != LudoPhase.OVER

    override fun start() = session.start()

    override fun roll() {
        if (!isMyTurn || state.phase != LudoPhase.ROLL || busy) return
        session.submit(LudoAction.Roll)
    }

    override fun move(token: Int) {
        if (!isMyTurn || state.phase != LudoPhase.MOVE || busy) return
        if (token !in state.movable) { GameAudio.play(Sfx.INVALID_MOVE); return }
        session.submit(LudoAction.Move(token))
    }

    override fun close() = session.close()
}
