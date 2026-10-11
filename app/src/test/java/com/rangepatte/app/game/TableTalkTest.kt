package com.rangepatte.app.game

import com.rangepatte.app.domain.talk.TableTalk
import com.rangepatte.app.net.core.Wire
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TableTalkTest {
    @Test fun idsAreEitherPhrasesOrEmoji() {
        assertTrue(TableTalk.isPhrase(0)); assertTrue(TableTalk.isPhrase(9)); assertFalse(TableTalk.isPhrase(10))
        assertTrue(TableTalk.isEmoji(100)); assertTrue(TableTalk.isEmoji(107)); assertFalse(TableTalk.isEmoji(108))
        assertEquals("🔥", TableTalk.emojiOf(104)); assertNull(TableTalk.emojiOf(3))
        assertFalse(TableTalk.isValid(-1)); assertFalse(TableTalk.isValid(50))
    }

    @Test fun watchersMayReactButNotSpeak() {
        assertTrue(TableTalk.allowedFor(isSpectator = true, id = 100))
        assertFalse(TableTalk.allowedFor(isSpectator = true, id = 2))
        assertTrue(TableTalk.allowedFor(isSpectator = false, id = 2))
        assertFalse(TableTalk.allowedFor(isSpectator = false, id = 999))
    }

    @Test fun rateLimitIsOnePerTwoSecondsAndFivePerHalfMinute() {
        assertTrue(TableTalk.canSend(emptyList(), 10_000))
        assertFalse(TableTalk.canSend(listOf(9_000), 10_000))
        assertTrue(TableTalk.canSend(listOf(7_999), 10_000))
        val burst = listOf(1_000L, 4_000L, 7_000L, 10_000L, 13_000L)
        assertFalse("five in the window", TableTalk.canSend(burst, 20_000))
        assertTrue("the first has aged out", TableTalk.canSend(burst, 31_001))
    }

    @Test fun sayRoundTrips() {
        val mine = Wire.Say(3, 104)
        assertEquals(mine, Wire.decode(mine.encode()))
        val watcher = Wire.Say(-1, 101, "Zara|K")
        assertEquals(watcher, Wire.decode(watcher.encode()))
    }
}
