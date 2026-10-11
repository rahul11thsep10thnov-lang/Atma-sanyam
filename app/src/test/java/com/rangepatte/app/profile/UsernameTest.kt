package com.rangepatte.app.profile

import com.rangepatte.app.domain.profile.AvatarCatalog
import com.rangepatte.app.domain.profile.Username
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UsernameTest {
    @Test fun validNamesPass() {
        listOf("rahul", "Rahul_Ace", "abc", "a_b_c_1234567890").forEach { assertNull(it, Username.validate(it)) }
    }

    @Test fun problemsAreReported() {
        assertEquals(Username.Problem.TOO_SHORT, Username.validate("ab"))
        assertEquals(Username.Problem.TOO_LONG, Username.validate("a".repeat(17)))
        assertEquals(Username.Problem.BAD_CHARACTERS, Username.validate("rahul.ace"))
        assertEquals(Username.Problem.BAD_CHARACTERS, Username.validate("राहुल"))
        assertEquals(Username.Problem.RESERVED, Username.validate("Admin"))
        assertEquals(Username.Problem.RESERVED, Username.validate("ravi")) // a computer player's name
    }

    @Test fun uniquenessIsCaseInsensitive() {
        assertEquals(Username.normalize("Rahul_Ace"), Username.normalize(" rahul_ace "))
    }

    @Test fun inputIsSanitizedWhileTyping() {
        assertEquals("rahulace_1", Username.sanitizeInput("rahul ace-_1!"))
        assertEquals(16, Username.sanitizeInput("x".repeat(40)).length)
    }

    @Test fun suggestionsAreValidDifferentAndFree() {
        val taken = setOf("rahul_ace")
        val suggestions = Username.suggestions("rahul") { it.lowercase() in taken }
        assertTrue(suggestions.isNotEmpty())
        suggestions.forEach { assertNull(Username.validate(it)); assertTrue(it.lowercase() != "rahul"); assertTrue(it.lowercase() !in taken) }
    }

    @Test fun twentyAvatarsWithUniqueIdsAndResourceNames() {
        assertEquals(20, AvatarCatalog.all.size)
        assertEquals(20, AvatarCatalog.all.map { it.id }.toSet().size)
        assertEquals(20, AvatarCatalog.all.map { it.resName }.toSet().size)
        AvatarCatalog.all.forEach { assertTrue(it.resName, Regex("avatar_\\d\\d_[a-z_]+").matches(it.resName)) }
        assertEquals("avatar_20_mature_mentor_female", AvatarCatalog.byId("av_20")!!.resName)
    }
}
