package com.atmasanyam.delivery.core.model

import kotlin.random.Random
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AccountModelTest {
    @Test
    fun guestIsNotSignedIn() {
        assertFalse(AccountState().isSignedIn)
        assertTrue(AccountState(phoneNumber = "9876543210").isSignedIn)
    }

    @Test
    fun unreadCountIgnoresReadNotifications() {
        val state = AccountState(
            phoneNumber = "9876543210",
            notifications = listOf(
                InAppNotification("1", NotificationType.BOOKING_CONFIRMED, "WS-1", 1L, read = true),
                InAppNotification("2", NotificationType.BOOKING_CONFIRMED, "WS-2", 2L),
            ),
        )
        assertEquals(1, state.unreadNotificationCount)
    }

    @Test
    fun referralCodeIsStableSixCharsFromAllowedAlphabet() {
        val code = ReferralCode.forPhone("9876543210")
        assertEquals(code, ReferralCode.forPhone("98765 43210"))
        assertEquals(ReferralCode.LENGTH, code.length)
        assertTrue(code.all { it in "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" })
    }

    @Test
    fun differentPhonesGetDifferentReferralCodes() {
        assertNotEquals(ReferralCode.forPhone("9876543210"), ReferralCode.forPhone("9876543211"))
    }

    @Test
    fun bookingIdHasYearAndSixDigitSequence() {
        val id = BookingIds.generate(2026, Random(1))
        assertTrue(id, Regex("WS-2026-\\d{6}").matches(id))
    }
}
