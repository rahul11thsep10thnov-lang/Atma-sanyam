package com.rangepatte.app.domain.multiplayer

import com.rangepatte.app.domain.game.CardGameEngine
import com.rangepatte.app.domain.game.GameAction
import kotlinx.coroutines.flow.Flow

/**
 * Architecture scaffold for future networked multiplayer (internet play, and local play over
 * WiFi/Bluetooth for players "near each other and without internet" per the design brief).
 *
 * **Nothing in this file is implemented yet** — there is no server, no WiFi-Direct/Bluetooth
 * transport, and no wiring into any screen. This is deliberate: implementing real networking
 * needs a backend/transport decision (Firebase vs. a custom server vs. Nearby Connections) and a
 * second physical device to test against, neither of which is available in the environment this
 * was authored in. These interfaces exist so that:
 *
 * 1. Future work has a settled shape to implement against rather than starting from nothing.
 * 2. [com.rangepatte.app.domain.model.PlayMode.NEARBY] / [com.rangepatte.app.domain.model.PlayMode.ONLINE]
 *    already appear in the setup UI (disabled, "coming soon") without the UI needing to change
 *    shape once a real implementation lands — only a concrete [GameSynchronizer] needs to be built
 *    and plugged in.
 *
 * [PlayMode.VS_COMPUTER] and [PlayMode.PASS_AND_PLAY] need none of this — both are purely local
 * and already work through the ordinary [CardGameEngine] path.
 */

/** How players are physically connecting for a [GameRoom]. */
enum class ConnectionMethod {
    NEARBY_WIFI,
    NEARBY_BLUETOOTH,
    INTERNET
}

enum class PlayerConnectionState {
    CONNECTING,
    CONNECTED,
    DISCONNECTED
}

/** One other participant's connection within a [GameRoom]. */
interface PlayerConnection {
    val playerId: String
    val displayName: String
    val state: PlayerConnectionState

    /** Sends a single game action to this player. Suspends until the transport accepts it. */
    suspend fun send(action: GameAction)

    /** Actions received from this player, oldest first. */
    fun receivedActions(): Flow<GameAction>

    suspend fun disconnect()
}

/**
 * A lobby/session for one table: how players found each other ([method]), who is connected, and
 * the room's own identifier (a join code for [ConnectionMethod.INTERNET], or the discovered
 * device name for a nearby transport).
 */
interface GameRoom {
    val roomId: String
    val method: ConnectionMethod
    val players: List<PlayerConnection>

    suspend fun open()
    suspend fun close()
}

/**
 * Keeps a [CardGameEngine]'s state consistent across every connection in a [GameRoom] — actions
 * applied locally are broadcast out, and actions arriving from other players are applied locally
 * in turn order. A concrete implementation is what an actual networked engine would delegate to
 * instead of applying [GameAction]s purely in-process.
 */
interface GameSynchronizer {
    val room: GameRoom

    /** Applies [action] locally and broadcasts it to every other connected player. */
    suspend fun propose(action: GameAction)

    /** Actions that arrived from other players and have already been validated for turn order. */
    fun incomingActions(): Flow<GameAction>
}
