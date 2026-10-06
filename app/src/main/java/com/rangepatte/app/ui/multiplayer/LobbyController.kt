package com.rangepatte.app.ui.multiplayer

import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.rangepatte.app.AppServices
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.net.GameSession
import com.rangepatte.app.net.TableSessions
import com.rangepatte.app.net.Transport
import com.rangepatte.app.net.core.GameMachines
import com.rangepatte.app.net.core.LobbyGuest
import com.rangepatte.app.net.core.LobbyHost
import com.rangepatte.app.net.core.Wire
import com.rangepatte.app.net.nearby.NearbyTransport
import com.rangepatte.app.net.online.FirestoreTransport
import com.rangepatte.app.net.online.OnlineRooms

/**
 * The Android side of a lobby: opens the Nearby (Bluetooth/Wi-Fi) or Firestore (internet) transport,
 * runs [LobbyHost] / [LobbyGuest] on top of it, and — when the host starts the game — turns it into a
 * [GameSession], hands that to [TableSessions] and calls [onTableReady] so the screen can navigate.
 *
 * Everything is touched on the main thread: transport callbacks are posted there first.
 */
class LobbyController(
    context: Context,
    private val gameId: GameId,
    override val isHost: Boolean,
    override val isOnline: Boolean,
    seatsToOffer: Int,
    private val difficulty: AiDifficulty
) : LobbyUi {
    private val appContext = context.applicationContext
    private val main = Handler(Looper.getMainLooper())

    override var stage by mutableStateOf(LobbyStage.IDLE)
        private set
    override var totalSeats by mutableStateOf(seatsToOffer)
        private set
    override var names by mutableStateOf<List<String>>(emptyList())
        private set
    override var foundTables by mutableStateOf<List<FoundTable>>(emptyList())
        private set
    override var roomCode by mutableStateOf<String?>(null)
        private set
    override var error by mutableStateOf<LobbyError?>(null)
        private set

    /** Called once the session is ready and the table screen should open. */
    var onTableReady: (() -> Unit)? = null

    private var myName = ""
    private var transport: Transport? = null
    private var nearby: NearbyTransport? = null
    private var roomId: String? = null
    private var lobbyHost: LobbyHost? = null
    private var lobbyGuest: LobbyGuest? = null
    private var handedOff = false
    private var disposed = false

    // -- Starting ----------------------------------------------------------------------------

    override fun begin(myName: String) {
        if (stage != LobbyStage.IDLE) return
        this.myName = myName.trim().ifBlank { "Player" }.take(20)
        error = null
        when {
            isOnline && isHost -> beginOnlineHost()
            !isOnline && isHost -> beginNearbyHost()
            !isOnline -> beginNearbyGuest()
            // An online guest starts from joinOnline(code).
        }
    }

    private fun beginNearbyHost() {
        val link = NearbyTransport(appContext, myName, maxGuests = totalSeats - 1)
        nearby = link
        transport = link
        val lobby = newLobbyHost(link)
        link.listener = hostListener(lobby)
        link.events = object : NearbyTransport.Events {
            override fun onHostFound(endpointId: String, advertisedName: String) = Unit
            override fun onHostLost(endpointId: String) = Unit
            override fun onConnected(endpointId: String) = Unit
            override fun onFailure(message: String) {
                main.post { fail(R.string.net_err_generic, message) }
            }
        }
        names = lobby.names()
        stage = LobbyStage.WORKING
        link.startAdvertising("$myName|${gameId.name}")
    }

    private fun beginOnlineHost() {
        val uid = signedInUid() ?: return
        stage = LobbyStage.WORKING
        OnlineRooms.createRoom(gameId, uid, { result ->
            main.post {
                if (disposed) return@post
                result.onSuccess { code ->
                    val link = FirestoreTransport(code, uid, uid, isHost = true)
                    transport = link
                    roomId = code
                    val lobby = newLobbyHost(link)
                    link.listener = hostListener(lobby)
                    names = lobby.names()
                    roomCode = code
                }.onFailure {
                    stage = LobbyStage.IDLE
                    fail(R.string.net_err_generic, it.message.orEmpty())
                }
            }
        })
    }

    private fun beginNearbyGuest() {
        val link = NearbyTransport(appContext, myName)
        nearby = link
        transport = link
        link.events = object : NearbyTransport.Events {
            override fun onHostFound(endpointId: String, advertisedName: String) {
                main.post {
                    val hostName = advertisedName.substringBeforeLast('|')
                    val game = advertisedName.substringAfterLast('|', "")
                    if (game != gameId.name) return@post
                    foundTables = foundTables.filter { it.endpointId != endpointId } + FoundTable(endpointId, hostName)
                }
            }

            override fun onHostLost(endpointId: String) {
                main.post { foundTables = foundTables.filter { it.endpointId != endpointId } }
            }

            override fun onConnected(endpointId: String) {
                main.post { if (!disposed) joinedHost(link) }
            }

            override fun onFailure(message: String) {
                main.post { fail(R.string.net_err_generic, message) }
            }
        }
        stage = LobbyStage.WORKING
        link.startDiscovery()
    }

    // -- Joining ------------------------------------------------------------------------------

    override fun joinNearby(endpointId: String) {
        val link = nearby ?: return
        error = null
        link.connectTo(endpointId)
    }

    override fun joinOnline(code: String) {
        if (stage != LobbyStage.IDLE) return
        val uid = signedInUid() ?: return
        error = null
        stage = LobbyStage.WORKING
        OnlineRooms.lookup(code) { result ->
            main.post {
                if (disposed) return@post
                val room = result.getOrNull()
                when {
                    result.isFailure -> failAndReset(R.string.net_err_generic, result.exceptionOrNull()?.message.orEmpty())
                    room == null -> failAndReset(R.string.net_err_no_room)
                    room.gameId != gameId.name -> failAndReset(R.string.net_err_wrong_game)
                    room.status != "lobby" -> failAndReset(R.string.net_err_started)
                    else -> {
                        val link = FirestoreTransport(room.code, uid, room.hostUid, isHost = false)
                        transport = link
                        roomId = room.code
                        joinedHost(link)
                    }
                }
            }
        }
    }

    /** The link to the host is up: introduce ourselves and wait for the table to fill. */
    private fun joinedHost(link: Transport) {
        nearby?.stopDiscovery()
        val guest = LobbyGuest(myName) { link.sendToHost(it) }
        lobbyGuest = guest
        link.listener = object : Transport.Listener {
            override fun onMessage(peerId: String, text: String) {
                main.post { if (!disposed) guestMessage(guest, link, text) }
            }

            override fun onPeerLost(peerId: String) {
                main.post { if (!disposed && !handedOff) failAndReset(R.string.net_err_host_left) }
            }
        }
        stage = LobbyStage.AT_TABLE
        guest.onConnected()
    }

    private fun guestMessage(guest: LobbyGuest, link: Transport, text: String) {
        if (!guest.onMessage(text)) return
        if (guest.hostLeft) {
            failAndReset(R.string.net_err_host_left)
            return
        }
        names = guest.names
        if (guest.seats > 0) totalSeats = guest.seats
        guest.rejectedReason?.let { reason ->
            failAndReset(if (reason == "started") R.string.net_err_started else R.string.net_err_full)
            return
        }
        val start = guest.start ?: return
        val machine = GameMachines.forGame(start.config.gameId) ?: return
        handedOff = true
        TableSessions.offer(GameSession.guest(machine, start.config, start.yourSeat, link))
        onTableReady?.invoke()
    }

    // -- Hosting ------------------------------------------------------------------------------

    private fun newLobbyHost(link: Transport): LobbyHost =
        LobbyHost(
            gameId = gameId,
            totalSeats = totalSeats,
            hostName = myName,
            difficulty = difficulty,
            sendToPeer = link::sendToPeer,
            broadcast = link::broadcast
        ).also { lobbyHost = it }

    private fun hostListener(lobby: LobbyHost) = object : Transport.Listener {
        override fun onMessage(peerId: String, text: String) {
            main.post { if (!disposed && !handedOff && lobby.onMessage(peerId, text)) names = lobby.names() }
        }

        override fun onPeerLost(peerId: String) {
            main.post { if (!disposed && !handedOff && lobby.onPeerLost(peerId)) names = lobby.names() }
        }
    }

    override fun startGame() {
        val lobby = lobbyHost ?: return
        val link = transport ?: return
        if (handedOff || lobby.guests.isEmpty()) return
        val machine = GameMachines.forGame(gameId) ?: return
        val started = lobby.start()
        val session = GameSession.host(machine, started.config, link)
        started.seatByPeer.forEach { (peer, seat) -> session.assignPeerSeat(peer, seat) }
        nearby?.stopAdvertising()
        roomId?.let { OnlineRooms.markStatus(it, "playing") }
        handedOff = true
        TableSessions.offer(session)
        onTableReady?.invoke()
    }

    // -- Errors and tidy-up --------------------------------------------------------------------

    private fun signedInUid(): String? {
        if (!AppServices.isFirebaseConnected) {
            fail(R.string.net_err_not_connected)
            return null
        }
        val uid = AppServices.account.currentUser.value?.uid
        if (uid == null) fail(R.string.net_err_login)
        return uid
    }

    private fun fail(messageRes: Int, detail: String? = null) {
        error = LobbyError(messageRes, detail)
    }

    /** Shows [messageRes] and returns to the start so the player can try again. */
    private fun failAndReset(messageRes: Int, detail: String? = null) {
        releaseTransport()
        names = emptyList()
        foundTables = emptyList()
        stage = LobbyStage.IDLE
        fail(messageRes, detail)
    }

    private fun releaseTransport() {
        transport?.listener = null
        transport?.close()
        transport = null
        nearby = null
        lobbyGuest = null
        lobbyHost = null
        roomId = null
        roomCode = null
    }

    /** Leaving the lobby. The transport is left open only if a table session took it over. */
    fun dispose() {
        if (disposed) return
        disposed = true
        onTableReady = null
        if (handedOff) return
        transport?.let { link ->
            if (isHost) link.broadcast(Wire.Leave.encode())
            else link.sendToHost(Wire.Leave.encode())
        }
        releaseTransport()
    }
}
