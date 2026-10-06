package com.rangepatte.app.net.core

import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import kotlin.random.Random

/** First names the computer players go by. */
val BOT_NAMES = listOf("Ravi", "Meera", "Gopal", "Asha", "Kiran")

/**
 * The host's side of a table that has not started yet: who has joined, and — once the host presses
 * Start — which seat each person gets. Doesn't care whether people arrived by Bluetooth/Wi-Fi or the
 * internet; it just reads and writes messages through [sendToPeer] and [broadcast].
 *
 * [totalSeats] is the size of the table; seats nobody takes are played by the computer.
 */
class LobbyHost(
    val gameId: GameId,
    val totalSeats: Int,
    private val hostName: String,
    private val difficulty: AiDifficulty,
    private val sendToPeer: (peerId: String, text: String) -> Unit,
    private val broadcast: (text: String) -> Unit
) {
    /** Guests in the order they joined: peer id → name. */
    val guests = LinkedHashMap<String, String>()
    var started = false
        private set

    /** Everyone at the table now: the host first. */
    fun names(): List<String> = listOf(hostName) + guests.values

    val isFull: Boolean get() = guests.size >= totalSeats - 1

    /** Handles a message from [peerId]. Returns true if the list of people changed. */
    fun onMessage(peerId: String, text: String): Boolean {
        val message = Wire.decode(text) ?: return false
        return when (message) {
            is Wire.Join -> {
                if (started || peerId in guests) {
                    if (started) sendToPeer(peerId, Wire.Reject("started").encode())
                    false
                } else if (isFull) {
                    sendToPeer(peerId, Wire.Reject("full").encode())
                    false
                } else {
                    guests[peerId] = message.name.ifBlank { "Player" }
                    broadcast(Wire.Lobby(names(), totalSeats).encode())
                    true
                }
            }
            Wire.Leave -> onPeerLost(peerId)
            else -> false
        }
    }

    fun onPeerLost(peerId: String): Boolean {
        if (started || guests.remove(peerId) == null) return false
        broadcast(Wire.Lobby(names(), totalSeats).encode())
        return true
    }

    /** What the host's own session needs, plus where each guest sits. */
    class Started(val config: MatchConfig, val seatByPeer: Map<String, Int>)

    /**
     * Closes the lobby and tells every guest its seat. With four seats the first guest sits opposite
     * the host (as partner in team games), then the other two; otherwise guests fill seats in order.
     */
    fun start(seed: Long = Random.nextLong()): Started {
        check(!started) { "already started" }
        started = true
        val order = if (totalSeats == 4) listOf(2, 1, 3) else (1 until totalSeats).toList()
        val seatByPeer = guests.keys.withIndex().associate { (i, peer) -> peer to order[i] }
        val humanSeats = setOf(0) + seatByPeer.values
        val botNames = BOT_NAMES.iterator()
        val seatNames = List(totalSeats) { seat ->
            when (seat) {
                0 -> hostName
                in seatByPeer.values -> guests.getValue(seatByPeer.entries.first { it.value == seat }.key)
                else -> botNames.next()
            }
        }
        val config = MatchConfig(gameId, seatNames, humanSeats, difficulty, seed)
        for ((peer, seat) in seatByPeer) sendToPeer(peer, Wire.Start(config, seat).encode())
        return Started(config, seatByPeer)
    }
}

/** A guest's side of a table that has not started yet. */
class LobbyGuest(private val name: String, private val sendToHost: (text: String) -> Unit) {
    /** Who is at the table (host first), as last announced. */
    var names: List<String> = emptyList()
        private set

    /** How many seats the table has, as last announced (0 until the first announcement). */
    var seats: Int = 0
        private set

    /** Why the host turned us away ("full" / "started"), if it did. */
    var rejectedReason: String? = null
        private set

    /** True once the host has closed the table before starting. */
    var hostLeft = false
        private set

    /** Set when the host starts the game: our seat and the table's settings. */
    var start: Wire.Start? = null
        private set

    fun onConnected() = sendToHost(Wire.Join(name).encode())

    /** Returns true if something visible changed. */
    fun onMessage(text: String): Boolean = when (val message = Wire.decode(text)) {
        is Wire.Lobby -> { names = message.names; seats = message.seats; true }
        is Wire.Reject -> { rejectedReason = message.reason; true }
        is Wire.Start -> { start = message; true }
        Wire.Leave -> { hostLeft = true; true }
        else -> false
    }
}
