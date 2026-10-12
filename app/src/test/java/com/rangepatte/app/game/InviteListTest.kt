package com.rangepatte.app.game

import com.rangepatte.app.domain.invites.InviteCandidate
import com.rangepatte.app.domain.invites.InviteList
import com.rangepatte.app.domain.presence.FriendState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Ludo stage 7: the lobby's Invite friends list. */
class InviteListTest {
    private fun c(name: String, state: FriendState, sent: Boolean = false) = InviteCandidate(name, name, null, state, sent)

    @Test fun onlineAndFreeFriendsComeFirstThenSentThenBusyThenOffline() {
        val ranked = InviteList.rank(listOf(
            c("zara", FriendState.OFFLINE), c("neha", FriendState.FULL), c("amit", FriendState.AVAILABLE, sent = true),
            c("Priya", FriendState.AVAILABLE), c("bimal", FriendState.AVAILABLE)
        ))
        assertEquals(listOf("bimal", "Priya", "amit", "neha", "zara"), ranked.map { it.username })
    }

    @Test fun onlyAnOnlineFreeFriendWithoutAPendingRequestCanBeInvited() {
        assertTrue(c("a", FriendState.AVAILABLE).canInvite)
        assertFalse(c("a", FriendState.AVAILABLE, sent = true).canInvite)
        assertFalse(c("a", FriendState.FULL).canInvite)
        assertFalse(c("a", FriendState.OFFLINE).canInvite)
    }
}
