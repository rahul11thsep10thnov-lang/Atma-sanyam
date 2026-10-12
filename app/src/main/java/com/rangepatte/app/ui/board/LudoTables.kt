package com.rangepatte.app.ui.board

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.rangepatte.app.domain.ludo.LudoAction
import com.rangepatte.app.domain.ludo.LudoEvent
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoState
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

    override val isMyTurn: Boolean get() = !session.isSpectator && state.turn == mySeat && state.phase != LudoPhase.OVER

    override fun start() = session.start()

    override fun roll() {
        if (!isMyTurn || state.phase != LudoPhase.ROLL || busy) return
        session.submit(LudoAction.Roll)
    }

    override fun move(token: Int) {
        if (!isMyTurn || state.phase != LudoPhase.MOVE || busy) return
        session.submit(LudoAction.Move(token))
    }

    override fun close() = session.close()
}
