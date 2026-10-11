package com.rangepatte.app.ui.invites

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.rangepatte.app.R
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.components.royal.antiquePlaque
import com.rangepatte.app.ui.friends.PersonAvatar
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim
import com.rangepatte.app.ui.theme.RoyalTitleStyle

/** The incoming invitation as the card shows it: who, which game, and how much time is left. */
data class IncomingInvite(val fromUsername: String, val fromAvatarId: String?, val gameName: String, val secondsLeft: Int, val totalSeconds: Int)

/**
 * The invitation card (approved Design 9): gold-rimmed, the sender's nameplate, the game, a draining
 * gold timer bar, Join / Not now. Shown over whatever the player is doing.
 */
@Composable
fun PlayRequestCard(invite: IncomingInvite, onJoin: () -> Unit, onDecline: () -> Unit) {
    Dialog(onDismissRequest = onDecline, properties = DialogProperties(dismissOnBackPress = true, dismissOnClickOutside = false)) {
        RoyalPanel(title = stringResource(R.string.invite_title), modifier = Modifier.fillMaxWidth()) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().antiquePlaque(active = true).padding(12.dp)) {
                PersonAvatar(invite.fromAvatarId, online = true, size = 56.dp)
                Text("@${invite.fromUsername}", style = RoyalTitleStyle, color = GoldBevelLight, modifier = Modifier.padding(top = 6.dp))
            }
            Text(
                stringResource(R.string.invite_body_format, invite.gameName),
                style = MaterialTheme.typography.bodyLarge, color = ParchmentText, textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
            )
            TimerBar(fraction = invite.secondsLeft / invite.totalSeconds.toFloat().coerceAtLeast(1f), modifier = Modifier.padding(top = 12.dp))
            Text(stringResource(R.string.invite_expires_format, invite.secondsLeft), style = MaterialTheme.typography.labelMedium, color = ParchmentTextDim, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth().padding(top = 14.dp)) {
                RoyalButton(stringResource(R.string.invite_join), onClick = onJoin, modifier = Modifier.weight(1f))
                RoyalButton(stringResource(R.string.invite_not_now), onClick = onDecline, style = RoyalButtonStyle.STEEL, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun TimerBar(fraction: Float, modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxWidth().height(6.dp).background(GoldBevelDark.copy(alpha = 0.35f), RoundedCornerShape(3.dp))) {
        Box(modifier = Modifier.fillMaxWidth(fraction.coerceIn(0f, 1f)).height(6.dp).background(GoldenGlow, RoundedCornerShape(3.dp)))
    }
}

/** The sender's side: a slim plaque at the bottom — "Waiting for @name… 37 s · Cancel", then one outcome line. */
@Composable
fun OutgoingRequestBanner(text: String, cancelable: Boolean, onCancel: () -> Unit, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier.fillMaxWidth().padding(10.dp).antiquePlaque(active = cancelable).padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Text(text, style = MaterialTheme.typography.bodyMedium, color = ParchmentText, modifier = Modifier.weight(1f))
        if (cancelable) RoyalButton(stringResource(R.string.profile_cancel), onClick = onCancel, style = RoyalButtonStyle.STEEL, compact = true)
        else Text("✕", color = GoldBevelLight, modifier = Modifier.padding(start = 8.dp).clickable(onClick = onDismiss))
    }
}

/** A small chooser: which game to invite a friend to. */
@Composable
fun GamePickerDialog(games: List<Pair<String, String>>, onPick: (String) -> Unit, onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        RoyalPanel(title = stringResource(R.string.invite_pick_game), modifier = Modifier.fillMaxWidth()) {
            games.forEach { (id, name) ->
                RoyalButton(name, onClick = { onPick(id) }, style = RoyalButtonStyle.STEEL, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
            }
            RoyalButton(stringResource(R.string.profile_cancel), onClick = onDismiss, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
        }
    }
}
