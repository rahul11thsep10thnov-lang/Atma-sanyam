package com.rangepatte.app.domain.invites

import com.rangepatte.app.domain.friends.RelationStatus
import com.rangepatte.app.domain.model.GameId
import com.rangepatte.app.domain.presence.FriendState
import com.rangepatte.app.domain.presence.GameCapabilities

enum class RequestStatus { PENDING, ACCEPTED, DECLINED, CANCELLED, EXPIRED }

/** "Come and play X with me": one document, answered once. */
data class PlayRequest(
    val id: String,
    val from: String,
    val to: String,
    val gameId: GameId,
    /** The host's table to join (room code), or null when the sender will open a table on acceptance. */
    val tableCode: String?,
    val createdAt: Long,
    val expiresAt: Long,
    val status: RequestStatus = RequestStatus.PENDING
) {
    fun isPendingAt(now: Long) = status == RequestStatus.PENDING && now < expiresAt
}

/** Why a request cannot be sent right now. */
enum class SendProblem { NOT_FRIENDS, NOT_AVAILABLE, GAME_UNSUPPORTED, ALREADY_PENDING, SELF }

object PlayRequests {
    const val TTL_MS = 60_000L

    /** Null when a request may go out; the client checks this and the store checks it again. */
    fun canSend(me: String, other: String, relation: RelationStatus, state: FriendState, gameId: GameId, pendingToOther: Boolean): SendProblem? = when {
        me == other -> SendProblem.SELF
        relation != RelationStatus.FRIENDS -> SendProblem.NOT_FRIENDS
        !GameCapabilities.supportsPlayRequests(gameId) -> SendProblem.GAME_UNSUPPORTED
        state != FriendState.AVAILABLE -> SendProblem.NOT_AVAILABLE
        pendingToOther -> SendProblem.ALREADY_PENDING
        else -> null
    }

    /** What a pending request becomes after [by] does [action]; null when the request is no longer answerable. */
    fun answer(request: PlayRequest, by: String, action: RequestStatus, now: Long): PlayRequest? {
        if (!request.isPendingAt(now)) return null
        val allowed = when (action) {
            RequestStatus.ACCEPTED, RequestStatus.DECLINED -> by == request.to
            RequestStatus.CANCELLED -> by == request.from
            else -> false
        }
        return if (allowed) request.copy(status = action) else null
    }

    /** A pending request past its time reads as expired, whether or not the store has caught up. */
    fun effectiveStatus(request: PlayRequest, now: Long): RequestStatus =
        if (request.status == RequestStatus.PENDING && now >= request.expiresAt) RequestStatus.EXPIRED else request.status
}
