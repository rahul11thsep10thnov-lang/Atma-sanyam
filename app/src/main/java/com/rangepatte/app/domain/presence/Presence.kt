package com.rangepatte.app.domain.presence

import com.rangepatte.app.domain.model.GameId

/** What a player is doing right now, as far as friends may know. */
data class Activity(
    val gameId: GameId,
    /** Null when playing the computer alone. */
    val tableCode: String? = null,
    /** Free seats at a multiplayer table (0 when full or when the game cannot take anyone now). */
    val seatsFree: Int = 0
)

/** One player's presence record, as written by their own phone. */
data class PresenceRecord(
    val uid: String,
    /** When the phone last said "I'm here" (ms since epoch). */
    val lastBeat: Long,
    /** The player chose "appear offline": friends see them as offline whatever the beat says. */
    val invisible: Boolean = false,
    val activity: Activity? = null
)

/** The three states a friend row shows (Element 8). */
enum class FriendState { OFFLINE, AVAILABLE, FULL }

object Presence {
    /** The phone writes a beat this often while the app is in front. */
    const val HEARTBEAT_MS = 25_000L
    /** A beat older than this means the phone is gone, whatever it last said. */
    const val ONLINE_WINDOW_MS = 60_000L

    fun isOnline(record: PresenceRecord?, now: Long): Boolean =
        record != null && !record.invisible && now - record.lastBeat in 0..ONLINE_WINDOW_MS

    /**
     * AVAILABLE: online and either not in a game, playing the computer, or at a table with a free
     * seat. FULL: online at a table nobody can join now. OFFLINE otherwise. [canJoinLate] says whether
     * [Activity.gameId] lets someone sit down after the game has started (capabilities, Element 11).
     */
    fun stateOf(record: PresenceRecord?, now: Long, canJoinLate: (GameId) -> Boolean): FriendState {
        if (!isOnline(record, now)) return FriendState.OFFLINE
        val activity = record!!.activity ?: return FriendState.AVAILABLE
        if (activity.tableCode == null) return FriendState.AVAILABLE
        return if (activity.seatsFree > 0 || canJoinLate(activity.gameId)) FriendState.AVAILABLE else FriendState.FULL
    }
}

/**
 * What each game can do with people who arrive after it started (Element 10). No game seats a
 * latecomer mid-round — the lockstep engine deals full hands up front — but every multiplayer game can
 * be **watched**: the host sends spectators a copy of the game with all hands hidden, and seats them
 * at the next round boundary if a computer seat is free. So a friend at a full table is still shown as
 * FULL (nobody can play there now) — the Watch button is what a full table offers.
 */
object GameCapabilities {
    fun canJoinLate(gameId: GameId): Boolean = false
    fun canSpectate(gameId: GameId): Boolean = gameId != GameId.SOLITAIRE && gameId != GameId.SPIDER_SOLITAIRE
    /** Play requests make sense only for games that other people can play at all. */
    fun supportsPlayRequests(gameId: GameId): Boolean = gameId != GameId.SOLITAIRE && gameId != GameId.SPIDER_SOLITAIRE
}
