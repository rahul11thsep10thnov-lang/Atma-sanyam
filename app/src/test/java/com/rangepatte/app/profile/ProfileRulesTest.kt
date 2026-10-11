package com.rangepatte.app.profile

import com.rangepatte.app.domain.profile.ProfileRules
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfileRulesTest {
    private val day = 24 * 60 * 60 * 1000L
    private val now = 1000 * day

    @Test fun usernameChangesOnceEveryThirtyDays() {
        assertTrue(ProfileRules.canChangeUsername(0, now))
        assertFalse(ProfileRules.canChangeUsername(now - 29 * day, now))
        assertTrue(ProfileRules.canChangeUsername(now - 30 * day, now))
        assertEquals(1, ProfileRules.daysUntilUsernameChange(now - 29 * day, now))
        assertEquals(30, ProfileRules.daysUntilUsernameChange(now, now))
        assertEquals(0, ProfileRules.daysUntilUsernameChange(now - 31 * day, now))
    }

    @Test fun releasedNamesFreeAfterThirtyDays() {
        assertTrue(ProfileRules.isNameFree(exists = false, releasedAt = null, now = now))
        assertFalse(ProfileRules.isNameFree(exists = true, releasedAt = null, now = now))
        assertFalse(ProfileRules.isNameFree(exists = true, releasedAt = now - 10 * day, now = now))
        assertTrue(ProfileRules.isNameFree(exists = true, releasedAt = now - 30 * day, now = now))
    }

    @Test fun phoneIsMaskedToLastFour() {
        assertEquals("•••• 4321", ProfileRules.maskPhone("+91 98765 04321"))
    }
}
