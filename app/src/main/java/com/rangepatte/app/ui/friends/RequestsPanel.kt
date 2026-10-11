package com.rangepatte.app.ui.friends

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.friends.RelationAction
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalSectionTitle
import com.rangepatte.app.ui.components.royal.antiquePlaque
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.ParchmentTextDim

/**
 * Friend requests (approved Design 1): incoming cards with Accept / Decline, outgoing with Cancel,
 * a count badge on the Incoming title. Stateless.
 */
@Composable
fun RequestsPanel(
    incoming: List<PersonUi>,
    outgoing: List<PersonUi>,
    onAction: (PersonUi, RelationAction) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            RoyalSectionTitle(stringResource(R.string.friends_incoming), modifier = Modifier.weight(1f))
            if (incoming.isNotEmpty()) Text(
                incoming.size.toString(), style = MaterialTheme.typography.labelLarge, color = PanelWoodDark,
                modifier = Modifier.background(GoldenGlow, CircleShape).padding(horizontal = 9.dp, vertical = 2.dp)
            )
        }
        if (incoming.isEmpty()) Empty(stringResource(R.string.friends_no_incoming))
        incoming.forEach { person ->
            RequestCard(person) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    RoyalButton(stringResource(R.string.friends_accept), onClick = { onAction(person, RelationAction.ACCEPT) }, modifier = Modifier.weight(1f))
                    RoyalButton(stringResource(R.string.friends_decline), onClick = { onAction(person, RelationAction.DECLINE) }, style = RoyalButtonStyle.STEEL, modifier = Modifier.weight(1f))
                }
            }
        }
        RoyalSectionTitle(stringResource(R.string.friends_outgoing))
        if (outgoing.isEmpty()) Empty(stringResource(R.string.friends_no_outgoing))
        outgoing.forEach { person ->
            RequestCard(person) {
                RoyalButton(stringResource(R.string.friends_cancel_request), onClick = { onAction(person, RelationAction.CANCEL_REQUEST) }, style = RoyalButtonStyle.STEEL, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun RequestCard(person: PersonUi, buttons: @Composable () -> Unit) {
    Column(modifier = Modifier.fillMaxWidth().antiquePlaque().padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            PersonAvatar(person.avatarId, person.online)
            Column(modifier = Modifier.padding(start = 10.dp)) {
                Text("@${person.username}", style = MaterialTheme.typography.titleMedium, color = GoldBevelLight)
                person.detail?.let { Text(it, style = MaterialTheme.typography.labelMedium, color = ParchmentTextDim) }
            }
        }
        buttons()
    }
}

@Composable
private fun Empty(text: String) =
    Text(text, style = MaterialTheme.typography.bodyMedium, color = ParchmentTextDim, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp))
