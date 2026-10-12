package com.rangepatte.app.ui.invites

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.rangepatte.app.AppServices
import com.rangepatte.app.R
import com.rangepatte.app.domain.invites.PlayRequests
import com.rangepatte.app.domain.invites.RequestStatus
import com.rangepatte.app.domain.model.PlayMode

/**
 * App-wide: shows the incoming invitation card and the sender's waiting banner wherever the player
 * is. [onJoin] opens the right lobby; [onHost] opens a hosting lobby for the sender once accepted.
 */
@Composable
fun BoxScope.PlayRequestOverlay(onJoin: (gameRoute: String, mode: PlayMode, code: String?) -> Unit, onHost: (gameRoute: String) -> Unit) {
    val repo = AppServices.playRequests
    val incoming by repo.incoming.collectAsState()
    val outgoing by repo.outgoing.collectAsState()
    val now by repo.now.collectAsState()
    val people by AppServices.friends.people.collectAsState()
    val presence by AppServices.presence.friends.collectAsState()
    fun gameName(id: com.rangepatte.app.domain.model.GameId) = com.rangepatte.app.domain.model.GameNames.nameRes(id)?.let { stringResource(it) } ?: id.name

    incoming?.let { req ->
        val from = people[req.from]
        if (from == null) { androidx.compose.runtime.LaunchedEffect(req.from) { AppServices.friends.loadPerson(req.from) } }
        PlayRequestCard(
            invite = IncomingInvite(from?.username ?: "…", from?.avatarId, gameName(req.gameId), ((req.expiresAt - now) / 1000).toInt().coerceAtLeast(0), (PlayRequests.TTL_MS / 1000).toInt()),
            onJoin = {
                repo.answer(req, RequestStatus.ACCEPTED) { r ->
                    r.onSuccess { onJoin(req.gameId.routeSegment, PlayMode.ONLINE, req.tableCode) }
                }
            },
            onDecline = { repo.answer(req, RequestStatus.DECLINED) }
        )
    }

    outgoing?.let { req ->
        val name = people[req.to]?.username ?: "…"
        val status = PlayRequests.effectiveStatus(req, now)
        val text = when (status) {
            RequestStatus.PENDING -> stringResource(R.string.invite_waiting_format, name, ((req.expiresAt - now) / 1000).toInt().coerceAtLeast(0))
            RequestStatus.ACCEPTED -> stringResource(R.string.invite_accepted_format, name)
            RequestStatus.DECLINED -> stringResource(R.string.invite_declined_format, name)
            RequestStatus.CANCELLED -> stringResource(R.string.invite_cancelled)
            RequestStatus.EXPIRED -> if (Presence.isOnline(presence[req.to], now)) stringResource(R.string.invite_expired_format, name) else stringResource(R.string.invite_offline_format, name)
        }
        Box(modifier = Modifier.align(Alignment.BottomCenter)) {
            OutgoingRequestBanner(
                text = text, cancelable = status == RequestStatus.PENDING,
                onCancel = { repo.answer(req, RequestStatus.CANCELLED) },
                onDismiss = {
                    repo.dismiss(req)
                    // They said yes and we have no table yet: open one for them to join.
                    if (status == RequestStatus.ACCEPTED && req.tableCode == null) onHost(req.gameId.routeSegment)
                }
            )
        }
    }
}

private typealias Presence = com.rangepatte.app.domain.presence.Presence

/** The games a friend can be invited to: the card games with a multiplayer machine, and the board games (Ludo, stage 7). */
fun invitableGames(): List<com.rangepatte.app.domain.model.GameId> = com.rangepatte.app.domain.model.GameNames.invitable()

