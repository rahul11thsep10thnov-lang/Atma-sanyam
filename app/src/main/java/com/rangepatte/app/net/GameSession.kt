package com.rangepatte.app.net

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import com.rangepatte.app.game.common.UndoHistory
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.net.core.MatchConfig
import com.rangepatte.app.net.core.SessionCore
import com.rangepatte.app.net.core.Wire
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.random.Random

/**
 * A running table as the screens see it — alone against the computer, or with other people.
 *
 * - [state] is the game; screens read it and call [submit] to make a move.
 * - On the **host** (and when playing alone) moves are checked and applied here, and computer
 *   players move after a short pause. Other phones are told about every move.
 * - On a **client** moves are sent to the host and applied when the host sends them back.
 *
 * Seat [mySeat] is the player at this phone; seat 0 is always the host.
 */
class GameSession<S, A>(
    private val core: SessionCore<S, A>,
    private val transport: Transport?
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val undo = UndoHistory<S>(3)
    private val peerSeats = HashMap<String, Int>()
    private var started = false

    val machine: GameMachine<S, A> get() = core.machine
    val config: MatchConfig get() = core.config
    val mySeat: Int get() = core.mySeat
    val isHost: Boolean get() = core.isHost
    val isSolo: Boolean get() = transport == null
    val seatNames: List<String> get() = core.config.seatNames

    /** The current game. Compose re-draws whenever it changes. */
    var state: S by mutableStateOf(core.state)
        private set

    /** Seats currently played by the computer (grows when a player leaves). */
    var botSeats: Set<Int> by mutableStateOf(core.botSeats.toSet())
        private set

    /** The host has left, the connection dropped, or this phone fell out of step. The table cannot continue. */
    var connectionLost: Boolean by mutableStateOf(false)
        private set

    val undoUsesLeft: Int get() = undo.usesLeft
    val canUndo: Boolean get() = isSolo && undo.canUndo && machine.seatToAct(state) == mySeat

    /** Tells the session which phone sits at which seat (host only; called once when the table starts). */
    fun assignPeerSeat(peerId: String, seat: Int) {
        peerSeats[peerId] = seat
    }

    init {
        // Listen from the moment the session exists, so nothing the host sends while this phone is still
        // opening the table screen is lost.
        transport?.listener = object : Transport.Listener {
            override fun onMessage(peerId: String, text: String) {
                scope.launch { handle(peerId, text) }
            }

            override fun onPeerLost(peerId: String) {
                scope.launch { peerLost(peerId) }
            }
        }
    }

    /** Starts the computer players and the trick-clearing timer. Safe to call more than once. */
    fun start() {
        if (started) return
        started = true
        scope.launch { runLoop() }
    }

    /** Makes a move for this phone's player. */
    fun submit(action: A) {
        if (core.isHost) {
            val before = core.state
            val move = core.hostAccept(core.mySeat, action) ?: return
            if (isSolo) undo.record(before)
            transport?.broadcast(move.encode())
            publish()
        } else {
            transport?.sendToHost(Wire.Act(machine.encode(action)).encode())
        }
    }

    /** Solo play only: takes back the last move (at most three times a game). */
    fun undo() {
        if (!canUndo) return
        undo.undo()?.let {
            core.restore(it)
            publish()
        }
    }

    /** Leaves the table. A guest tells the host first so the computer can take over the seat. */
    fun close() {
        if (!core.isHost) transport?.sendToHost(Wire.Leave.encode())
        if (core.isHost) transport?.broadcast(Wire.Leave.encode())
        finish()
    }

    private fun finish() {
        transport?.listener = null
        transport?.close()
        scope.cancel()
    }

    private fun publish() {
        state = core.state
        botSeats = core.botSeats.toSet()
        if (core.outOfSync) connectionLost = true
    }

    private suspend fun runLoop() {
        while (true) {
            val snapshot = core.state
            if (core.hasAutoStep()) {
                // Let people see the finished trick before it is cleared.
                delay(AUTO_STEP_DELAY_MS)
                if (core.state === snapshot) {
                    core.autoStep()
                    publish()
                }
                continue
            }
            val botSeat = if (core.isHost) core.nextBotSeat() else null
            if (botSeat != null) {
                delay(machine.botDelayMs)
                var moved = false
                if (core.state === snapshot) {
                    val action = withContext(Dispatchers.Default) {
                        machine.decideForBot(snapshot, botSeat, core.config.difficulty, Random.Default)
                    }
                    if (action != null && core.state === snapshot) {
                        core.hostAccept(botSeat, action)?.let {
                            transport?.broadcast(it.encode())
                            publish()
                            moved = true
                        }
                    }
                }
                if (!moved && core.state === snapshot) delay(1_000) // never spin if a move is refused
                continue
            }
            snapshotFlow { state }.first { it !== snapshot }
        }
    }

    private fun handle(peerId: String, text: String) {
        val message = Wire.decode(text) ?: return
        if (core.isHost) {
            when (message) {
                is Wire.Act -> {
                    val seat = peerSeats[peerId] ?: return
                    val action = machine.decode(message.action) ?: return
                    core.hostAccept(seat, action)?.let {
                        transport?.broadcast(it.encode())
                        publish()
                    }
                }
                Wire.Leave -> peerLost(peerId)
                else -> Unit
            }
        } else {
            when (message) {
                is Wire.Do -> if (core.receive(message)) publish() else if (core.outOfSync) publish()
                is Wire.Bot -> {
                    core.botSeats.add(message.seat)
                    publish()
                }
                Wire.Leave -> connectionLost = true
                else -> Unit
            }
        }
    }

    private fun peerLost(peerId: String) {
        if (core.isHost) {
            val seat = peerSeats.remove(peerId) ?: return
            core.botSeats.add(seat)
            transport?.broadcast(Wire.Bot(seat).encode())
            publish()
        } else {
            connectionLost = true
        }
    }

    companion object {
        private const val AUTO_STEP_DELAY_MS = 1_300L

        /** A table where you play alone against computer players. */
        fun <S, A> solo(machine: GameMachine<S, A>, config: MatchConfig): GameSession<S, A> =
            GameSession(SessionCore(machine, config, mySeat = 0, isHost = true), transport = null)

        /** The host's side of a table with other people. */
        fun <S, A> host(machine: GameMachine<S, A>, config: MatchConfig, transport: Transport): GameSession<S, A> =
            GameSession(SessionCore(machine, config, mySeat = 0, isHost = true), transport)

        /** A guest's side of a table; [mySeat] was assigned by the host. */
        fun <S, A> guest(machine: GameMachine<S, A>, config: MatchConfig, mySeat: Int, transport: Transport): GameSession<S, A> =
            GameSession(SessionCore(machine, config, mySeat, isHost = false), transport)
    }
}
