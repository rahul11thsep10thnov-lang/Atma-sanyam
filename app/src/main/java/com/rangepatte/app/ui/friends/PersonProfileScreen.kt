package com.rangepatte.app.ui.friends

import androidx.compose.foundation.border
import com.rangepatte.app.ui.theme.GoldBevelDark
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.friends.RelationAction
import com.rangepatte.app.domain.friends.RelationStatus
import com.rangepatte.app.domain.friends.Relations
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.components.royal.antiquePlaque
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim
import com.rangepatte.app.ui.theme.RoyalTitleStyle

/** A line of the small facts under the hero: label + value, already localized. */
data class ProfileFact(val label: String, val value: String)

/** Which relationship-changing step the user has asked for and must confirm. */
enum class ProfileConfirm { REMOVE, BLOCK, REPORT }

/**
 * Another player's page (approved Design 1): nameplate hero with a gold ring, presence and current
 * game, a few facts, Play request / Poke when allowed, and the relationship controls with confirmation.
 * Stateless; [canPlayRequest] and [canPoke] are decided by the presence and poke rules (Elements 8–13).
 */
@Composable
fun PersonProfileScreen(
    person: PersonUi,
    facts: List<ProfileFact>,
    canPlayRequest: Boolean,
    canPoke: Boolean,
    /** Element 13: "9:58" while this friend was poked recently (the button turns steel and waits), else null. */
    pokeCountdown: String? = null,
    /** Element 13: the parchment confirmation under the row ("You poked priya_q"), or null. */
    pokedLine: String? = null,
    onPlayRequest: () -> Unit,
    onPoke: () -> Unit,
    onAction: (RelationAction) -> Unit,
    onReport: () -> Unit,
    onBackClick: () -> Unit,
    /** Set when the friend is at a full online table that can be watched: the first button becomes "Watch". */
    onWatch: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    var confirm by remember { mutableStateOf<ProfileConfirm?>(null) }
    WatermarkBackground(backgroundType = BackgroundType.EVENING_BALCONY, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize()) {
            GameHeader(title = stringResource(R.string.profile_title), onBackClick = onBackClick)
            Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                RoyalPanel(modifier = Modifier.widthIn(max = 520.dp).fillMaxWidth()) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().antiquePlaque(active = person.online).padding(14.dp)) {
                        Box(modifier = Modifier.border(3.dp, GoldenGlow, CircleShape).padding(3.dp)) {
                            PersonAvatar(person.avatarId, person.online, size = 76.dp)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
                            Text("@${person.username}", style = RoyalTitleStyle, color = GoldBevelLight)
                            StateMedallion(person.state, modifier = Modifier.padding(start = 8.dp))
                        }
                        Text(
                            person.detail ?: stringResource(if (person.online) R.string.profile_online else R.string.profile_offline),
                            style = MaterialTheme.typography.bodyMedium, color = ParchmentTextDim
                        )
                    }
                    if (facts.isNotEmpty()) Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
                        facts.forEach { fact ->
                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f).antiquePlaque().padding(8.dp)) {
                                Text(fact.value, style = MaterialTheme.typography.titleMedium, color = GoldBevelLight, textAlign = TextAlign.Center)
                                Text(fact.label, style = MaterialTheme.typography.labelSmall, color = ParchmentTextDim, textAlign = TextAlign.Center)
                            }
                        }
                    }
                    if (person.status == RelationStatus.FRIENDS) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth().padding(top = 14.dp)) {
                            if (onWatch != null) RoyalButton(stringResource(R.string.profile_watch), onClick = onWatch, compact = true, modifier = Modifier.weight(1f))
                            else RoyalButton(stringResource(R.string.profile_play_request), onClick = onPlayRequest, enabled = canPlayRequest, compact = true, modifier = Modifier.weight(1f))
                            if (pokeCountdown != null) {
                                RoyalButton(stringResource(R.string.poke_again_format, pokeCountdown), onClick = {}, enabled = false, style = RoyalButtonStyle.STEEL, compact = true, modifier = Modifier.weight(1f))
                            } else {
                                RoyalButton("\uD83D\uDC49 " + stringResource(R.string.profile_poke), onClick = onPoke, enabled = canPoke, compact = true, modifier = Modifier.weight(1f))
                            }
                        }
                        if (pokedLine != null) {
                            Text(
                                text = pokedLine,
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFF3A2515),
                                textAlign = TextAlign.Center,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 8.dp)
                                    .background(Color(0xFFF3E7CB), RoundedCornerShape(8.dp))
                                    .border(1.dp, GoldBevelDark, RoundedCornerShape(8.dp))
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        } else if (!canPoke && pokeCountdown == null && person.status == RelationStatus.FRIENDS && !person.online) {
                            Text(stringResource(R.string.poke_offline_hint), style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
                        }
                    } else {
                        Relations.primaryAction(person.status)?.let { action ->
                            RoyalButton(stringResource(actionLabel(action)), onClick = { onAction(action) }, modifier = Modifier.fillMaxWidth().padding(top = 14.dp))
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth().padding(top = 18.dp)) {
                        if (person.status == RelationStatus.FRIENDS) RoyalButton(stringResource(R.string.friends_remove), onClick = { confirm = ProfileConfirm.REMOVE }, style = RoyalButtonStyle.STEEL, compact = true, modifier = Modifier.weight(1f))
                        if (person.status != RelationStatus.BLOCKED_BY_ME) RoyalButton(stringResource(R.string.friends_block), onClick = { confirm = ProfileConfirm.BLOCK }, style = RoyalButtonStyle.STEEL, compact = true, modifier = Modifier.weight(1f))
                        RoyalButton(stringResource(R.string.profile_report), onClick = { confirm = ProfileConfirm.REPORT }, style = RoyalButtonStyle.STEEL, compact = true, modifier = Modifier.weight(1f))
                    }
                    Text(stringResource(R.string.profile_privacy_note), style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
                }
            }
        }
    }
    confirm?.let { step ->
        val (title, body, primary) = when (step) {
            ProfileConfirm.REMOVE -> Triple(R.string.friends_remove, R.string.profile_confirm_remove, R.string.friends_remove)
            ProfileConfirm.BLOCK -> Triple(R.string.friends_block, R.string.profile_confirm_block, R.string.friends_block)
            ProfileConfirm.REPORT -> Triple(R.string.profile_report, R.string.profile_confirm_report, R.string.profile_report)
        }
        GameResultDialog(
            title = stringResource(title), lines = listOf(stringResource(body, person.username)),
            primaryText = stringResource(primary),
            onPrimary = {
                when (step) {
                    ProfileConfirm.REMOVE -> onAction(RelationAction.REMOVE_FRIEND)
                    ProfileConfirm.BLOCK -> onAction(RelationAction.BLOCK)
                    ProfileConfirm.REPORT -> onReport()
                }
                confirm = null
            },
            secondaryText = stringResource(R.string.profile_cancel), onSecondary = { confirm = null }
        )
    }
}
