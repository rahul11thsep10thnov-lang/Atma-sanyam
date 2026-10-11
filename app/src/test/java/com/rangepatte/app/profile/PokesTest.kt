package com.rangepatte.app.profile

import com.rangepatte.app.domain.pokes.Pokes
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PokesTest {
    private val now = 1_000_000L

    @Test fun onlyOnlineFriendsCanBePoked() {
        assertTrue(Pokes.canPoke(isFriend = true, friendOnline = true, lastPokeTo = null, sentAt = emptyList(), now = now))
        assertFalse(Pokes.canPoke(isFriend = false, friendOnline = true, lastPokeTo = null, sentAt = emptyList(), now = now))
        assertFalse(Pokes.canPoke(isFriend = true, friendOnline = false, lastPokeTo = null, sentAt = emptyList(), now = now))
    }

    @Test fun tenMinuteCooldownPerFriend() {
        val recent = now - 9 * 60_000L
        assertFalse(Pokes.canPoke(true, true, recent, emptyList(), now))
        assertEquals(60_000L, Pokes.cooldownLeft(recent, now))
        assertEquals(0L, Pokes.cooldownLeft(now - Pokes.COOLDOWN_MS, now))
        assertTrue(Pokes.canPoke(true, true, now - Pokes.COOLDOWN_MS, emptyList(), now))
    }

    @Test fun twentyAnHourOverAllFriends() {
        val twenty = List(20) { now - it * 1000L }
        assertFalse(Pokes.canPoke(true, true, null, twenty, now))
        val old = List(20) { now - Pokes.HOUR_MS - it * 1000L }
        assertTrue(Pokes.canPoke(true, true, null, old, now))
    }

    @Test fun countdownAndDocId() {
        assertEquals("9:58", Pokes.countdown(598_000))
        assertEquals("10:00", Pokes.countdown(600_000))
        assertEquals("0:01", Pokes.countdown(1))
        assertEquals("a_b", Pokes.docId("a", "b"))
    }
}
