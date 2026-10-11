package com.rangepatte.app.ui.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.domain.notifications.Notice
import com.rangepatte.app.domain.notifications.NoticeBook
import com.rangepatte.app.domain.notifications.NoticeKind
import com.rangepatte.app.ui.theme.ButtonSteelBottom
import com.rangepatte.app.ui.theme.ButtonSteelTop
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow

/** One notice as the scroll shows it: who, what, when, and the one thing to do about it. */
data class NoticeUi(val notice: Notice, val name: String, val avatarId: String?, val timeText: String)

/** The brass bell in the top bar with the unread count on a crimson seal. */
@Composable
fun NotificationBell(unread: Int, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val label = stringResource(R.string.notif_bell, unread)
    Box(
        modifier = modifier
            .size(36.dp)
            .background(Brush.verticalGradient(listOf(ButtonSteelTop, ButtonSteelBottom)), RoundedCornerShape(3.dp))
            .border(1.dp, GoldBevelDark, RoundedCornerShape(3.dp))
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = label }
    ) {
        Icon(Icons.Filled.Notifications, contentDescription = null, tint = GoldenGlow, modifier = Modifier.size(22.dp).align(Alignment.Center))
        if (unread > 0) {
            Text(
                text = if (unread > 9) "9+" else "$unread",
                color = Color.White,
                fontSize = 10.sp,
                fontWeight = FontWeight.Black,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(2.dp)
                    .background(Color(0xFF8A1F2B), CircleShape)
                    .border(1.dp, GoldenGlow, CircleShape)
                    .padding(horizontal = 4.dp, vertical = 1.dp)
            )
        }
    }
}

/**
 * The parchment scroll that drops from the bar: New above Earlier, each line with its one action
 * (Accept, Play, Poke back), swipe-free: a small × dismisses, "Clear all" at the foot.
 */
@Composable
fun NotificationScroll(
    items: List<NoticeUi>,
    newIds: Set<String>,
    onOpen: (NoticeUi) -> Unit,
    onAct: (NoticeUi) -> Unit,
    onDismiss: (NoticeUi) -> Unit,
    onClearAll: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    val parchment = Color(0xFFF3E7CB)
    val ink = Color(0xFF3A2515)
    Box(modifier = Modifier.fillMaxSize().clickable(onClick = onClose, role = Role.Button)) {
        Column(
            modifier = modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp)
                .shadow(12.dp, RoundedCornerShape(0.dp, 0.dp, 12.dp, 12.dp))
                .background(parchment, RoundedCornerShape(0.dp, 0.dp, 12.dp, 12.dp))
                .border(2.dp, GoldBevelDark, RoundedCornerShape(0.dp, 0.dp, 12.dp, 12.dp))
                .clickable(enabled = false) {}
                .padding(10.dp)
                .heightIn(max = 460.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = stringResource(R.string.notif_title).uppercase(),
                style = MaterialTheme.typography.labelMedium.copy(letterSpacing = 1.5.sp),
                color = ink.copy(alpha = 0.7f)
            )
            if (items.isEmpty()) {
                Text(stringResource(R.string.notif_empty), style = MaterialTheme.typography.bodyMedium, color = ink, modifier = Modifier.padding(vertical = 10.dp))
            }
            val (fresh, earlier) = NoticeBook.split(items.map { it.notice }, newIds)
            val byId = items.associateBy { it.notice.id }
            if (fresh.isNotEmpty()) Section(stringResource(R.string.notif_new), ink)
            fresh.forEach { n -> byId[n.id]?.let { NoticeRow(it, unread = true, ink, onOpen, onAct, onDismiss) } }
            if (earlier.isNotEmpty()) Section(stringResource(R.string.notif_earlier), ink)
            earlier.forEach { n -> byId[n.id]?.let { NoticeRow(it, unread = false, ink, onOpen, onAct, onDismiss) } }
            if (items.isNotEmpty()) {
                Text(
                    text = stringResource(R.string.notif_clear_all),
                    style = MaterialTheme.typography.labelLarge,
                    color = Color(0xFF8A1F2B),
                    modifier = Modifier.align(Alignment.CenterHorizontally).clickable(onClick = onClearAll).padding(6.dp)
                )
            }
        }
    }
}

@Composable
private fun Section(text: String, ink: Color) {
    Text(text.uppercase(), style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 1.2.sp), color = ink.copy(alpha = 0.6f), modifier = Modifier.padding(top = 4.dp))
}

/** The sentence for a notice, in the player's language. */
@Composable
fun noticeText(kind: NoticeKind, name: String): String = when (kind) {
    NoticeKind.FRIEND_REQUEST -> stringResource(R.string.notif_friend_request, name)
    NoticeKind.REQUEST_ACCEPTED -> stringResource(R.string.notif_request_accepted, name)
    NoticeKind.PLAY_REQUEST -> stringResource(R.string.notif_play_request, name)
    NoticeKind.POKE -> stringResource(R.string.notif_poke, name)
    NoticeKind.FRIEND_ONLINE -> stringResource(R.string.notif_friend_online, name)
    NoticeKind.SEATED -> stringResource(R.string.notif_seated, name)
}

private fun icon(kind: NoticeKind) = when (kind) {
    NoticeKind.FRIEND_REQUEST -> "👥"; NoticeKind.REQUEST_ACCEPTED -> "✅"; NoticeKind.PLAY_REQUEST -> "🃏"
    NoticeKind.POKE -> "👉"; NoticeKind.FRIEND_ONLINE -> "🟢"; NoticeKind.SEATED -> "🪑"
}

/** The action a live notice offers, or null. */
@Composable
fun actionText(kind: NoticeKind, live: Boolean): String? = when {
    !live && kind == NoticeKind.PLAY_REQUEST -> stringResource(R.string.notif_expired)
    !live -> null
    kind == NoticeKind.FRIEND_REQUEST -> stringResource(R.string.friends_accept)
    kind == NoticeKind.REQUEST_ACCEPTED -> stringResource(R.string.notif_play)
    kind == NoticeKind.PLAY_REQUEST -> stringResource(R.string.notif_play)
    kind == NoticeKind.POKE -> stringResource(R.string.notif_poke_back)
    else -> null
}

@Composable
private fun NoticeRow(item: NoticeUi, unread: Boolean, ink: Color, onOpen: (NoticeUi) -> Unit, onAct: (NoticeUi) -> Unit, onDismiss: (NoticeUi) -> Unit) {
    val n = item.notice
    val action = actionText(n.kind, n.live)
    val actionable = n.live && action != null
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFFFF8E6), RoundedCornerShape(8.dp))
            .border(1.dp, if (unread) Color(0xFF8A1F2B) else Color(0xFFE3CF9A), RoundedCornerShape(8.dp))
            .clickable { onOpen(item) }
            .padding(start = 8.dp, end = 4.dp, top = 6.dp, bottom = 6.dp)
    ) {
        Text(icon(n.kind), fontSize = 16.sp, modifier = Modifier.width(24.dp))
        Column(modifier = Modifier.weight(1f).padding(horizontal = 6.dp)) {
            Text(noticeText(n.kind, item.name), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = if (unread) FontWeight.Bold else FontWeight.Medium), color = ink, maxLines = 2)
            Text(item.timeText, style = MaterialTheme.typography.labelSmall, color = ink.copy(alpha = 0.6f))
        }
        if (action != null) {
            Text(
                text = action,
                style = MaterialTheme.typography.labelLarge,
                color = if (actionable) Color.White else ink.copy(alpha = 0.5f),
                modifier = Modifier
                    .background(if (actionable) Color(0xFF8A1F2B) else Color.Transparent, RoundedCornerShape(6.dp))
                    .then(if (actionable) Modifier.border(1.dp, GoldBevelLight, RoundedCornerShape(6.dp)) else Modifier)
                    .clickable(enabled = actionable) { onAct(item) }
                    .padding(horizontal = 9.dp, vertical = 5.dp)
            )
        }
        val dismissLabel = stringResource(R.string.notif_dismiss)
        Text(
            text = "×",
            fontSize = 18.sp,
            color = ink.copy(alpha = 0.55f),
            modifier = Modifier.clickable { onDismiss(item) }.padding(horizontal = 6.dp).semantics { contentDescription = dismissLabel }
        )
    }
}
