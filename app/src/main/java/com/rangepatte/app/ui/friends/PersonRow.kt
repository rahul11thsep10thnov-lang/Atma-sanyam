package com.rangepatte.app.ui.friends

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.friends.RelationAction
import com.rangepatte.app.domain.friends.RelationStatus
import com.rangepatte.app.domain.friends.Relations
import com.rangepatte.app.domain.presence.FriendState
import com.rangepatte.app.domain.profile.AvatarCatalog
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.sp
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.antiquePlaque
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim

/** The green "online" dot, drawn the same everywhere. */
val OnlineGreen = Color(0xFF2ECC71)

/** Everything a row needs to know about a person, with no store behind it (so screens are previewable). */
data class PersonUi(
    val uid: String,
    val username: String,
    val avatarId: String?,
    val status: RelationStatus,
    val online: Boolean = false,
    /** A short second line: "Online · Teen Patti", "Sent 3 h ago"… already localized. */
    val detail: String? = null,
    /** Available / full / offline (Element 8); OFFLINE also for people whose presence we may not see. */
    val state: FriendState = FriendState.OFFLINE,
    /** Element 15: a starred friend ("Favourites only" may poke) and a friend whose pokes are muted. */
    val favourite: Boolean = false,
    val muted: Boolean = false
)

/**
 * The approved Element 8 mark: a gold medallion with a pointing finger (a seat can be joined) or an
 * open palm (their table is full). Nothing for offline. Always labelled for screen readers.
 */
@Composable
fun StateMedallion(state: FriendState, modifier: Modifier = Modifier, size: androidx.compose.ui.unit.Dp = 26.dp) {
    if (state == FriendState.OFFLINE) return
    val label = stringResource(if (state == FriendState.AVAILABLE) R.string.presence_available else R.string.presence_full)
    Box(
        modifier = modifier.size(size).semantics { contentDescription = label }
            .background(Brush.verticalGradient(listOf(Color(0xFFF2D58A), Color(0xFFB08A3A))), CircleShape)
            .border(1.dp, GoldBevelDark, CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Text(if (state == FriendState.AVAILABLE) "\uD83D\uDC49" else "\u270B", fontSize = (size.value * 0.55f).sp, modifier = Modifier.clearAndSetSemantics {})
    }
}

/** A small avatar disc with the online dot; the real artwork once it is in `res/drawable`. */
@Composable
fun PersonAvatar(avatarId: String?, online: Boolean, size: androidx.compose.ui.unit.Dp = 40.dp) {
    val avatar = AvatarCatalog.byId(avatarId)
    val disc = Color(avatar?.discColor ?: 0xFF4A301B)
    Box(modifier = Modifier.size(size)) {
        Box(
            modifier = Modifier.size(size).background(Brush.radialGradient(listOf(disc, disc.copy(alpha = 0.75f))), CircleShape)
                .border(1.dp, GoldBevelDark, CircleShape),
            contentAlignment = Alignment.Center
        ) { AvatarArt(avatar?.resName, size) }
        if (online) Box(
            modifier = Modifier.align(Alignment.BottomEnd).size(size * 0.3f)
                .background(Color(0xFF24160C), CircleShape).padding(2.dp).background(OnlineGreen, CircleShape)
        )
    }
}

/**
 * One person on a nameplate (approved Design 1): avatar, @username, a detail line, and the one button
 * that fits the relationship. [onAction] receives what the button means.
 */
@Composable
fun PersonRow(person: PersonUi, onAction: (RelationAction) -> Unit, onOpen: (() -> Unit)? = null, modifier: Modifier = Modifier, trailing: @Composable () -> Unit = {}) {
    val action = Relations.primaryAction(person.status)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier.fillMaxWidth().antiquePlaque().then(if (onOpen != null) Modifier.clickable(onClick = onOpen) else Modifier)
            .padding(horizontal = 10.dp, vertical = 8.dp)
    ) {
        PersonAvatar(person.avatarId, person.online)
        Column(modifier = Modifier.weight(1f).padding(horizontal = 10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text((if (person.favourite) "\u2605 " else "") + "@${person.username}", style = MaterialTheme.typography.titleMedium, color = GoldBevelLight, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                StateMedallion(person.state, modifier = Modifier.padding(start = 6.dp), size = 22.dp)
            }
            person.detail?.let { Text(it, style = MaterialTheme.typography.labelMedium, color = ParchmentTextDim, maxLines = 1, overflow = TextOverflow.Ellipsis) }
        }
        when {
            person.status == RelationStatus.FRIENDS -> Text(stringResource(R.string.friends_status_friends), style = MaterialTheme.typography.labelLarge, color = ParchmentText)
            action != null -> RoyalButton(
                text = stringResource(actionLabel(action)),
                onClick = { onAction(action) },
                style = if (action == RelationAction.CANCEL_REQUEST || action == RelationAction.UNBLOCK) RoyalButtonStyle.STEEL else RoyalButtonStyle.CRIMSON
            )
        }
        trailing()
    }
}

fun actionLabel(action: RelationAction): Int = when (action) {
    RelationAction.ADD_FRIEND -> R.string.friends_add
    RelationAction.CANCEL_REQUEST -> R.string.friends_request_sent
    RelationAction.ACCEPT -> R.string.friends_accept
    RelationAction.DECLINE -> R.string.friends_decline
    RelationAction.REMOVE_FRIEND -> R.string.friends_remove
    RelationAction.BLOCK -> R.string.friends_block
    RelationAction.UNBLOCK -> R.string.friends_unblock
}
