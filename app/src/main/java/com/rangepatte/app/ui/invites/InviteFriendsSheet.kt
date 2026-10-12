package com.rangepatte.app.ui.invites

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.rangepatte.app.R
import com.rangepatte.app.domain.invites.InviteCandidate
import com.rangepatte.app.domain.presence.FriendState
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.friends.PersonAvatar
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim

/**
 * The lobby's Invite friends sheet (Ludo stage 7, Design 1): the Friends list with online-and-free
 * friends first and an Invite pill per friend. A tap sends a play request that carries the room code,
 * so the friend lands in the next free seat. [candidates] come ranked ([InviteList.rank]).
 */
@Composable
fun InviteFriendsSheet(candidates: List<InviteCandidate>, onInvite: (uid: String) -> Unit, onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        RoyalPanel(title = stringResource(R.string.invite_sheet_title), modifier = Modifier.fillMaxWidth()) {
            if (candidates.isEmpty()) {
                Text(
                    text = stringResource(R.string.invite_sheet_empty),
                    style = MaterialTheme.typography.bodyLarge,
                    color = ParchmentTextDim,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp)
                )
            } else {
                Column(modifier = Modifier.fillMaxWidth().heightIn(max = 360.dp).verticalScroll(rememberScrollState())) {
                    candidates.forEach { c -> CandidateRow(c, onInvite) }
                }
            }
            RoyalButton(stringResource(R.string.invite_sheet_done), onClick = onDismiss, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
        }
    }
}

@Composable
private fun CandidateRow(c: InviteCandidate, onInvite: (String) -> Unit) {
    val shape = RoundedCornerShape(3.dp)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp)
            .background(PanelWoodDark, shape)
            .border(1.dp, GoldBevelDark, shape)
            .padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        PersonAvatar(c.avatarId, online = c.state != FriendState.OFFLINE, size = 34.dp)
        Text(
            text = c.username,
            style = MaterialTheme.typography.bodyLarge,
            color = if (c.state == FriendState.OFFLINE) ParchmentTextDim else ParchmentText,
            modifier = Modifier.weight(1f).padding(horizontal = 10.dp)
        )
        when {
            c.canInvite -> RoyalButton(stringResource(R.string.invite_pill_invite), onClick = { onInvite(c.uid) }, compact = true)
            c.sent -> RoyalButton(stringResource(R.string.invite_pill_sent), onClick = {}, enabled = false, style = RoyalButtonStyle.STEEL, compact = true)
            else -> Text(
                text = stringResource(if (c.state == FriendState.FULL) R.string.invite_pill_playing else R.string.invite_pill_offline),
                style = MaterialTheme.typography.bodySmall,
                color = ParchmentTextDim
            )
        }
    }
}
