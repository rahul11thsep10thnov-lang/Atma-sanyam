package com.rangepatte.app.net

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import com.rangepatte.app.audio.GameAudio
import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.domain.talk.TableMessage
import com.rangepatte.app.domain.talk.TableTalk
import com.rangepatte.app.game.common.UndoHistory
import com.rangepatte.app.net.core.GameMachine
import com.rangepatte.app.net.core.MatchConfig
import com.rangepatte.app.net.core.SeatKeeper
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
    private val transport: Transport?,
    /** The online room code, so friends can be told where to find (and watch) this table. */
    val roomCode: String? = null
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val undo = UndoHistory<S>(3)
    private val peerSeats = HashMap<String, Int>()
    /** Host only: people watching, in the order they arrived (the first is seated first). */
    private val spectators = LinkedHashMap<String, String>()
    private var started = false

    val machine: GameMachine<S, A> get() = core.machine
    val config: MatchConfig get() = core.config
    val isHost: Boolean get() = core.isHost
    val isSolo: Boolean get() = transport == null

    /** This phone's seat, or [SessionCore.SPECTATOR] while watching; changes once when a spectator is seated. */
    var mySeat: Int by mutableStateOf(core.mySeat)
        private set

    /** True while this phone only watches: no moves, no undo, every hand face-down. */
    val isSpectator: Boolean get() = mySeat == SessionCore.SPECTATOR

    /** The seat the table is drawn from: your own, or the host's when watching. */
    val viewSeat: Int get() = if (isSpectator) 0 else mySeat

    /** Who sits where (updated when a spectator takes a computer seat). */
    var seatNames: List<String> by mutableStateOf(core.config.seatNames)
        private set

    /** Spectator only: true once a seat is promised (a computer seat is free) — false means "keep watching". */
    val seatPromised: Boolean get() = isSpectator && botSeats.isNotEmpty()

    /** Spectator only: tricks (or turns) left in the round being watched, or null when the game has no such count. */
    val stepsLeftInRound: Int? get() = machine.stepsLeftInRound(state)

    /** Spectator only: set when the host has just seated this phone, so the screen can say so once. */
    var justSeated: Boolean by mutableStateOf(false)
        private set

    /** Host only: how many people are watching (for a "2 watching" mark). */
    var spectatorCount: Int by mutableStateOf(0)
        private set

    // -- Dropped players and reconnecting (stage 8) --------------------------------------------------

    private val keeper = SeatKeeper()

    /** Seats whose player dropped out, with the moment their window closes (ms); the computer plays them meanwhile. */
    var awaySeats: Map<Int, Long> by mutableStateOf(emptyMap())
        private set

    /** Guest only: this phone lost the host and is trying to get its seat back. */
    var reconnecting: Boolean by mutableStateOf(false)
        private set

    /** Guest only: when the host stops keeping our seat (ms); meaningful while [reconnecting]. */
    var reconnectDeadline: Long by mutableStateOf(0L)
        private set

    /** Guest only: set once when the host has seated us again after a drop, so the screen can say so. */
    var rejoined: Boolean by mutableStateOf(false)
        private set

    fun acknowledgeRejoined() { rejoined = false }

    // -- Table talk (Element 11) ------------------------------------------------------------------

    /** Messages currently shown at the table (each stays [TableTalk.SHOW_MS]); newest last. */
    var messages: List<TableMessage> by mutableStateOf(emptyList())
        private set

    /** Seats this phone has muted for the rest of the match. */
    var mutedSeats: Set<Int> by mutableStateOf(emptySet())
        private set

    private val mySends = ArrayList<Long>()
    private val sendsByPeer = HashMap<String, ArrayList<Long>>()

    /** True when a message could be sent right now (rate limit, and nobody to talk to on a solo table). */
    val canTalk: Boolean get() = !isSolo && TableTalk.canSend(mySends, System.currentTimeMillis())

    /** Sends phrase or emoji [id] to everyone at the table (watchers may send emoji only). */
    fun say(id: Int) {
        if (isSolo || !TableTalk.allowedFor(isSpectator, id)) return
        val now = System.currentTimeMillis()
        if (!TableTalk.canSend(mySends, now)) return
        mySends += now
        mySends.removeAll { now - it > TableTalk.BURST_WINDOW_MS }
        if (core.isHost) relay(TableMessage(0, id, "", now))
        else transport?.sendToHost(Wire.Say(mySeat, id).encode())
    }

    fun toggleMute(seat: Int) {
        mutedSeats = if (seat in mutedSeats) mutedSeats - seat else mutedSeats + seat
    }

    /** Host only: every message, own or relayed, goes out to all phones and is shown here too. */
    private fun relay(message: TableMessage) {
        transport?.broadcast(Wire.Say(message.seat, message.id, message.name).encode())
        show(message)
    }

    private fun show(message: TableMessage) {
        if (message.seat in mutedSeats) return
        messages = messages + message
        if (message.seat != mySeat || message.seat == TableMessage.WATCHER) GameAudio.play(Sfx.PRESENT)
        scope.launch {
            delay(TableTalk.SHOW_MS)
            messages = messages - message
        }
    }

    /** Host only: a guest's or watcher's message, checked against the same rate limit before it is relayed. */
    private fun relayFromPeer(peerId: String, id: Int) {
        val seat = peerSeats[peerId]
        val watcherName = spectators[peerId]
        if (seat == null && watcherName == null) return
        if (!TableTalk.allowedFor(seat == null, id)) return
        val now = System.currentTimeMillis()
        val sends = sendsByPeer.getOrPut(peerId) { ArrayList() }
        if (!TableTalk.canSend(sends, now)) return
        sends += now
        sends.removeAll { now - it > TableTalk.BURST_WINDOW_MS }
        relay(TableMessage(seat ?: TableMessage.WATCHER, id, watcherName.orEmpty(), now))
    }

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

    /** Clears the "you're in" flag after the screen has shown it. */
    fun acknowledgeSeated() { justSeated = false }

    /** Tells the session which phone sits at which seat (host only; called once when the table starts). */
    fun assignPeerSeat(peerId: String, seat: Int) {
        peerSeats[peerId] = seat
    }

    init {
        // Every step of the game — a move, a computer move, a received move, a cleared trick — is announced
        // here exactly once, so this is where the card sounds are triggered: nowhere in the screens, where a
        // re-render could repeat them.
        core.onTransition = { before, after, action -> GameAudio.playCues(core.machine.sfx(before, after, action)) }
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
        GameAudio.playCues(machine.startSfx())
        scope.launch { runLoop() }
    }

    /** Makes a move for this phone's player. Spectators cannot move; the host refuses anything from one anyway. */
    fun submit(action: A) {
        if (isSpectator) return
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
        GameAudio.cancelPending()
        core.onTransition = null
        transport?.listener = null
        transport?.close()
        scope.cancel()
    }

    private fun publish() {
        state = core.state
        botSeats = core.botSeats.toSet()
        seatNames = core.config.seatNames
        mySeat = core.mySeat
        if (core.outOfSync) connectionLost = true
        if (core.isHost) {
            // Spectators cannot replay moves on a view with hidden cards, so they get a fresh view every step.
            if (spectators.isNotEmpty()) {
                val view = core.viewForSpectator().encode()
                spectators.keys.forEach { transport?.sendToPeer(it, view) }
            }
            seatWaitingSpectators()
        }
    }

    /** Host only: between rounds, the people watching take the free computer seats, first come first served. */
    private fun seatWaitingSpectators() {
        if (spectators.isEmpty() || !machine.isRoundBoundary(core.state)) return
        var changed = false
        while (spectators.isNotEmpty()) {
            val seat = core.freeSeatForSpectator() ?: break
            val (peer, name) = spectators.entries.first()
            spectators.remove(peer)
            core.seatHuman(seat, name)
            peerSeats[peer] = seat
            // Everyone renames the seat first, then the newcomer gets the full game to follow from here.
            transport?.broadcast(Wire.Human(seat, name).encode())
            transport?.sendToPeer(peer, core.seatMessage(seat).encode())
            changed = true
        }
        spectatorCount = spectators.size
        if (changed) {
            state = core.state
            botSeats = core.botSeats.toSet()
            seatNames = core.config.seatNames
        }
    }

    /** Host only: someone asked to join a table that is already playing (or waited in a full lobby) — they may watch. */
    fun admitSpectator(peerId: String, name: String) {
        if (peerId in peerSeats || peerId in spectators) return
        if (spectators.size >= MAX_SPECTATORS) {
            transport?.sendToPeer(peerId, Wire.Reject("full").encode())
            return
        }
        spectators[peerId] = name.ifBlank { "Player" }.take(20)
        spectatorCount = spectators.size
        // A blank seed: the real one would let a watcher work out every deal.
        transport?.sendToPeer(peerId, Wire.Start(core.config.copy(seed = 0L), SessionCore.SPECTATOR).encode())
        core.botSeats.forEach { transport?.sendToPeer(peerId, Wire.Bot(it).encode()) }
        transport?.sendToPeer(peerId, core.viewForSpectator().encode())
        seatWaitingSpectators()
    }

    private suspend fun runLoop() {
        // A spectator makes no steps of its own: every change arrives as a view from the host.
        if (isSpectator) {
            snapshotFlow { mySeat }.first { it != SessionCore.SPECTATOR }
        }
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
                is Wire.Join -> {
                    val seat = keeper.match(peerId, message.name, System.currentTimeMillis())
                    if (seat != null && seat in core.botSeats) reseat(peerId, seat, keeper.seats.getValue(seat).name)
                    else admitSpectator(peerId, message.name)
                }
                is Wire.Say -> relayFromPeer(peerId, message.id)
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
                is Wire.Human -> {
                    core.seatHuman(message.seat, message.name)
                    awaySeats = awaySeats - message.seat
                    publish()
                }
                is Wire.Away -> awaySeats = if (message.windowMs > 0) awaySeats + (message.seat to System.currentTimeMillis() + message.windowMs) else awaySeats - message.seat
                is Wire.View -> if (core.adoptView(message)) publish()
                is Wire.Say -> if (TableTalk.isValid(message.id)) show(TableMessage(message.seat, message.id, message.name, System.currentTimeMillis()))
                is Wire.Seat -> {
                    val wasWatching = isSpectator
                    if (core.takeSeat(message)) {
                        if (wasWatching) justSeated = true else rejoined = true
                        reconnecting = false
                        publish()
                    }
                }
                Wire.Leave -> connectionLost = true
                else -> Unit
            }
        }
    }

    private fun peerLost(peerId: String) {
        if (core.isHost) {
            if (spectators.remove(peerId) != null) {
                spectatorCount = spectators.size
                return
            }
            val seat = peerSeats.remove(peerId) ?: return
            // The computer plays the seat at once; the seat itself is kept for a while in case they return.
            core.botSeats.add(seat)
            transport?.broadcast(Wire.Bot(seat).encode())
            val now = System.currentTimeMillis()
            val away = keeper.drop(seat, core.config.seatNames[seat], peerId, now)
            transport?.broadcast(Wire.Away(seat, keeper.windowMs).encode())
            awaySeats = awaySeats + (seat to away.deadline)
            scope.launch {
                delay(keeper.windowMs + 50)
                keeper.expire(System.currentTimeMillis()).forEach { gone ->
                    transport?.broadcast(Wire.Away(gone, 0).encode())
                    awaySeats = awaySeats - gone
                }
            }
            publish()
        } else if (isSpectator) {
            connectionLost = true
        } else {
            startReconnecting()
        }
    }

    /** Guest only: the host went quiet. Keep asking for our seat until it is given back or the window closes. */
    private fun startReconnecting() {
        if (reconnecting || connectionLost) return
        reconnecting = true
        reconnectDeadline = System.currentTimeMillis() + keeper.windowMs
        scope.launch {
            while (reconnecting && System.currentTimeMillis() < reconnectDeadline) {
                transport?.sendToHost(Wire.Join(core.config.seatNames.getOrElse(mySeat) { "Player" }).encode())
                delay(RECONNECT_RETRY_MS)
            }
            if (reconnecting) {
                reconnecting = false
                connectionLost = true
            }
        }
    }

    /** Host only: a dropped player is back — the same uid, or the same name over a fresh link. */
    private fun reseat(peerId: String, seat: Int, name: String) {
        keeper.reclaim(seat)
        core.seatHuman(seat, name)
        peerSeats[peerId] = seat
        awaySeats = awaySeats - seat
        transport?.broadcast(Wire.Human(seat, name).encode())
        // A phone that came back through the lobby needs the start first; one that stayed in the game ignores it.
        transport?.sendToPeer(peerId, Wire.Start(core.config, seat).encode())
        transport?.sendToPeer(peerId, core.seatMessage(seat).encode())
        publish()
    }

    companion object {
        private const val AUTO_STEP_DELAY_MS = 1_300L
        private const val RECONNECT_RETRY_MS = 3_000L
        /** How many people may watch one table. */
        const val MAX_SPECTATORS = 4

        /** A table where you play alone against computer players. */
        fun <S, A> solo(machine: GameMachine<S, A>, config: MatchConfig): GameSession<S, A> =
            GameSession(SessionCore(machine, config, mySeat = 0, isHost = true), transport = null)

        /** The host's side of a table with other people. */
        fun <S, A> host(machine: GameMachine<S, A>, config: MatchConfig, transport: Transport, roomCode: String? = null): GameSession<S, A> =
            GameSession(SessionCore(machine, config, mySeat = 0, isHost = true), transport, roomCode)

        /** A guest's side of a table; [mySeat] was assigned by the host. */
        fun <S, A> guest(machine: GameMachine<S, A>, config: MatchConfig, mySeat: Int, transport: Transport, roomCode: String? = null): GameSession<S, A> =
            GameSession(SessionCore(machine, config, mySeat, isHost = false), transport, roomCode)

        /** A watcher's side of a table that is already playing: views from the host, a seat when a round ends. */
        fun <S, A> spectator(machine: GameMachine<S, A>, config: MatchConfig, transport: Transport, roomCode: String? = null): GameSession<S, A> =
            GameSession(SessionCore(machine, config, SessionCore.SPECTATOR, isHost = false), transport, roomCode)
    }
}
