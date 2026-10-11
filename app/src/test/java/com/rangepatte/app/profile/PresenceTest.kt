package com.rangepatte.app.profile

import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.domain.presence.Activity
import com.rangepatte.app.domain.presence.FriendState
import com.rangepatte.app.domain.presence.Presence
import com.rangepatte.app.domain.presence.PresenceRecord
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class PresenceTest {
    private val now = 1_000_000L
    private fun rec(ageMs: Long, invisible: Boolean = false, activity: Activity? = null) = PresenceRecord("u", now - ageMs, invisible, activity)
    private fun state(r: PresenceRecord?, late: Boolean = false) = Presence.stateOf(r, now, { late })

    @Test fun missingOldOrInvisibleIsOffline() {
        assertEquals(FriendState.OFFLINE, state(null))
        assertEquals(FriendState.OFFLINE, state(rec(Presence.ONLINE_WINDOW_MS + 1)))
        assertEquals(FriendState.OFFLINE, state(rec(0, invisible = true)))
        assertFalse("a beat from the future is not trusted", Presence.isOnline(rec(-5_000), now))
    }

    @Test fun onlineIdleOrVersusComputerIsAvailable() {
        assertEquals(FriendState.AVAILABLE, state(rec(10_000)))
        assertEquals(FriendState.AVAILABLE, state(rec(10_000, activity = Activity(GameId.TEEN_PATTI))))
    }

    @Test fun tableWithFreeSeatIsAvailableFullTableIsFull() {
        assertEquals(FriendState.AVAILABLE, state(rec(0, activity = Activity(GameId.RUMMY, "K7M2Q", seatsFree = 2))))
        assertEquals(FriendState.FULL, state(rec(0, activity = Activity(GameId.RUMMY, "K7M2Q", seatsFree = 0))))
        assertEquals("late joining makes a full table available", FriendState.AVAILABLE, state(rec(0, activity = Activity(GameId.RUMMY, "K7M2Q", 0)), late = true))
    }

    @Test fun heartbeatIsWellInsideTheWindow() = assertEquals(true, Presence.HEARTBEAT_MS * 2 <= Presence.ONLINE_WINDOW_MS)
}
