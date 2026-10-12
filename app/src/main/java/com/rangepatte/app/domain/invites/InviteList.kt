package com.rangepatte.app.domain.invites

import com.rangepatte.app.domain.presence.FriendState

/** One friend as the lobby's Invite friends sheet shows them (Ludo stage 7). */
data class InviteCandidate(
    val uid: String,
    val username: String,
    val avatarId: String?,
    val state: FriendState,
    /** A play request from me to them is still pending. */
    val sent: Boolean
) {
    /** Only a friend who is online and free can be invited (the store checks the same rule again). */
    val canInvite: Boolean get() = state == FriendState.AVAILABLE && !sent
}

object InviteList {
    /**
     * Online-and-free friends first (the ones to tap), then those already invited, then friends at a
     * full table, then offline friends; by name within each group.
     */
    fun rank(candidates: List<InviteCandidate>): List<InviteCandidate> =
        candidates.sortedWith(compareBy<InviteCandidate> { group(it) }.thenBy { it.username.lowercase() })

    private fun group(c: InviteCandidate): Int = when {
        c.canInvite -> 0
        c.sent -> 1
        c.state == FriendState.FULL -> 2
        else -> 3
    }
}
