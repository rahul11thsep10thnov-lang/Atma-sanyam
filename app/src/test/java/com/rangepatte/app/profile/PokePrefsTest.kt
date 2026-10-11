package com.rangepatte.app.profile

import com.rangepatte.app.domain.pokes.PokeAudience
import com.rangepatte.app.domain.pokes.PokePrefs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PokePrefsTest {
    @Test fun defaultsAcceptAnyFriend() {
        assertTrue(PokePrefs().accepts("a"))
    }

    @Test fun receiveOffMutedAndAudienceAllRefuse() {
        assertFalse(PokePrefs(receive = false).accepts("a"))
        assertFalse(PokePrefs(muted = setOf("a")).accepts("a"))
        assertTrue(PokePrefs(muted = setOf("a")).accepts("b"))
        assertFalse(PokePrefs(audience = PokeAudience.NOBODY).accepts("a"))
        val favs = PokePrefs(audience = PokeAudience.FAVOURITES, favourites = setOf("a"))
        assertTrue(favs.accepts("a")); assertFalse(favs.accepts("b"))
    }

    @Test fun onlyReceiveAndAudienceAreMirrored() {
        val m = PokePrefs(receive = false, audience = PokeAudience.FAVOURITES, muted = setOf("x"), favourites = setOf("y")).mirror()
        assertEquals(mapOf("receive" to false, "audience" to "FAVOURITES"), m)
    }
}
