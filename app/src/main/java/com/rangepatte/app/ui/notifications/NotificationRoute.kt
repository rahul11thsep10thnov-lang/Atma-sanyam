package com.rangepatte.app.ui.notifications

import androidx.compose.foundation.layout.BoxScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.res.stringResource
import com.rangepatte.app.AppServices
import com.rangepatte.app.R
import com.rangepatte.app.domain.invites.RequestStatus
import com.rangepatte.app.domain.notifications.NoticeKind

/**
 * The open notification scroll, wired to the repositories: names from the friends directory, the
 * actions to the right place (Accept → relations, Play → the lobby, Poke back → Element 13).
 */
@Composable
fun BoxScope.NotificationCentre(
    newIds: Set<String>,
    onOpenPerson: (String) -> Unit,
    onJoin: (gameRoute: String, code: String?) -> Unit,
    onClose: () -> Unit
) {
    val repo = AppServices.notifications
    val notices by repo.notices.collectAsState()
    val people by AppServices.friends.people.collectAsState()
    val requests by AppServices.playRequests.all.collectAsState()
    val now by AppServices.presence.clock.collectAsState()
    notices.filter { people[it.uid] == null }.forEach { n -> LaunchedEffect(n.uid) { AppServices.friends.loadPerson(n.uid) } }
    val justNow = stringResource(R.string.notif_just_now); val minutes = stringResource(R.string.notif_minutes_ago)
    val hours = stringResource(R.string.notif_hours_ago); val yesterday = stringResource(R.string.notif_yesterday); val days = stringResource(R.string.notif_days_ago)
    fun timeText(at: Long): String {
        val m = ((now - at) / 60_000L).coerceAtLeast(0)
        return when {
            m < 1 -> justNow
            m < 60 -> minutes.format(m)
            m < 24 * 60 -> hours.format(m / 60)
            m < 48 * 60 -> yesterday
            else -> days.format(m / (24 * 60))
        }
    }
    val items = notices.map { n -> NoticeUi(n, people[n.uid]?.username ?: "…", people[n.uid]?.avatarId, timeText(n.at)) }
    NotificationScroll(
        items = items,
        newIds = newIds,
        onOpen = { item -> onClose(); onOpenPerson(item.notice.uid) },
        onAct = { item ->
            val n = item.notice
            when (n.kind) {
                NoticeKind.FRIEND_REQUEST -> AppServices.friends.act(n.uid, com.rangepatte.app.domain.friends.RelationAction.ACCEPT)
                NoticeKind.PLAY_REQUEST -> {
                    val q = requests.firstOrNull { it.id == n.ref } ?: return@NotificationScroll
                    AppServices.playRequests.answer(q, RequestStatus.ACCEPTED) { r -> r.onSuccess { onClose(); onJoin(q.gameId.routeSegment, q.tableCode) } }
                }
                NoticeKind.REQUEST_ACCEPTED -> { onClose(); onOpenPerson(n.uid) } // the profile has "Play request"
                NoticeKind.POKE -> {
                    // Poke back right here when allowed (friend online, cooldown over); otherwise show the profile.
                    if (AppServices.pokes.canPoke(n.uid)) AppServices.pokes.poke(n.uid) else { onClose(); onOpenPerson(n.uid) }
                }
                else -> { onClose(); onOpenPerson(n.uid) }
            }
        },
        onDismiss = { repo.dismiss(it.notice.id) },
        onClearAll = { repo.clearAll(); onClose() },
        onClose = onClose
    )
}
