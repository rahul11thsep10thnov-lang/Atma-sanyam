package com.rangepatte.app.profile

import com.rangepatte.app.domain.friends.RelationStatus
import com.rangepatte.app.domain.invites.PlayRequest
import com.rangepatte.app.domain.invites.PlayRequests
import com.rangepatte.app.domain.invites.RequestStatus
import com.rangepatte.app.domain.invites.SendProblem
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.domain.presence.FriendState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PlayRequestsTest {
    private val t0 = 1_000_000L
    private val req = PlayRequest("r1", "a", "b", GameId.TEEN_PATTI, null, t0, t0 + PlayRequests.TTL_MS)

    @Test fun sendingNeedsFriendAvailableSupportedAndNoPending() {
        assertNull(PlayRequests.canSend("a", "b", RelationStatus.FRIENDS, FriendState.AVAILABLE, GameId.RUMMY, false))
        assertEquals(SendProblem.SELF, PlayRequests.canSend("a", "a", RelationStatus.FRIENDS, FriendState.AVAILABLE, GameId.RUMMY, false))
        assertEquals(SendProblem.NOT_FRIENDS, PlayRequests.canSend("a", "b", RelationStatus.OUTGOING, FriendState.AVAILABLE, GameId.RUMMY, false))
        assertEquals(SendProblem.NOT_AVAILABLE, PlayRequests.canSend("a", "b", RelationStatus.FRIENDS, FriendState.FULL, GameId.RUMMY, false))
        assertEquals(SendProblem.NOT_AVAILABLE, PlayRequests.canSend("a", "b", RelationStatus.FRIENDS, FriendState.OFFLINE, GameId.RUMMY, false))
        assertEquals(SendProblem.GAME_UNSUPPORTED, PlayRequests.canSend("a", "b", RelationStatus.FRIENDS, FriendState.AVAILABLE, GameId.SOLITAIRE, false))
        assertEquals(SendProblem.ALREADY_PENDING, PlayRequests.canSend("a", "b", RelationStatus.FRIENDS, FriendState.AVAILABLE, GameId.RUMMY, true))
    }

    @Test fun onlyTheRightPersonCanAnswerAndOnlyOnce() {
        assertEquals(RequestStatus.ACCEPTED, PlayRequests.answer(req, "b", RequestStatus.ACCEPTED, t0 + 5_000)!!.status)
        assertEquals(RequestStatus.DECLINED, PlayRequests.answer(req, "b", RequestStatus.DECLINED, t0 + 5_000)!!.status)
        assertEquals(RequestStatus.CANCELLED, PlayRequests.answer(req, "a", RequestStatus.CANCELLED, t0 + 5_000)!!.status)
        assertNull("sender cannot accept", PlayRequests.answer(req, "a", RequestStatus.ACCEPTED, t0 + 5_000))
        assertNull("receiver cannot cancel", PlayRequests.answer(req, "b", RequestStatus.CANCELLED, t0 + 5_000))
        val accepted = PlayRequests.answer(req, "b", RequestStatus.ACCEPTED, t0 + 5_000)!!
        assertNull("already answered", PlayRequests.answer(accepted, "b", RequestStatus.DECLINED, t0 + 6_000))
        assertNull("expired", PlayRequests.answer(req, "b", RequestStatus.ACCEPTED, t0 + PlayRequests.TTL_MS + 1))
    }

    @Test fun expiryIsReadFromTheClock() {
        assertEquals(RequestStatus.PENDING, PlayRequests.effectiveStatus(req, t0 + 10_000))
        assertEquals(RequestStatus.EXPIRED, PlayRequests.effectiveStatus(req, t0 + PlayRequests.TTL_MS))
    }
}
