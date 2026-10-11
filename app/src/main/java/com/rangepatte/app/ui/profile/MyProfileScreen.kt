package com.rangepatte.app.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalOptionRow
import com.rangepatte.app.ui.components.royal.RoyalOrbToggle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.components.royal.RoyalSectionTitle
import com.rangepatte.app.ui.components.royal.antiquePlaque
import com.rangepatte.app.ui.friends.PersonAvatar
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim

/** Everything My Profile shows (Element 16), already localized where it is text. */
data class MyProfileUi(
    val username: String,
    val avatarId: String?,
    val maskedPhone: String,
    /** "Member since Mar 2026", or null when unknown. */
    val memberSince: String?,
    val friendCount: Int,
    val appearOffline: Boolean,
    val phoneDiscoverable: Boolean,
    val acceptPlayRequests: Boolean,
    val notifyFriendRequests: Boolean,
    val notifyPlayRequests: Boolean,
    /** Names of the friends whose "came online" is wanted (for the caption). */
    val onlineWatchNames: List<String>,
    /** 0 when the username may change now; otherwise the days to wait. */
    val usernameDaysLeft: Int
)

/** What the page can do; each is wired by the route. */
class MyProfileActions(
    val onChangeAvatar: () -> Unit,
    val onChangeUsername: () -> Unit,
    val onAppearOffline: (Boolean) -> Unit,
    val onPhoneDiscoverable: (Boolean) -> Unit,
    val onAcceptPlayRequests: (Boolean) -> Unit,
    val onNotifyFriendRequests: (Boolean) -> Unit,
    val onNotifyPlayRequests: (Boolean) -> Unit,
    val onChooseOnlineFriends: () -> Unit,
    val onLogOut: () -> Unit,
    val onDeleteAccount: () -> Unit,
    val onBackClick: () -> Unit
)

/**
 * The player's own page (Element 16, Design 1): the nameplate hero with gold pencils on the avatar
 * and the name; Privacy, Notifications and Account plaques with orb switches; Log out and Delete
 * account at the foot (each asks once).
 */
@Composable
fun MyProfileScreen(ui: MyProfileUi, actions: MyProfileActions, modifier: Modifier = Modifier) {
    var confirm by remember { mutableStateOf<MyProfileConfirm?>(null) }
    WatermarkBackground(backgroundType = BackgroundType.EVENING_BALCONY, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize()) {
            GameHeader(title = stringResource(R.string.myprofile_title), onBackClick = actions.onBackClick)
            Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(12.dp)) {
                RoyalPanel(modifier = Modifier.fillMaxWidth()) {
                    Hero(ui, actions)

                    RoyalSectionTitle(stringResource(R.string.myprofile_privacy))
                    RoyalOptionRow(label = stringResource(R.string.myprofile_appear_offline)) {
                        RoyalOrbToggle(checked = ui.appearOffline, onCheckedChange = actions.onAppearOffline)
                    }
                    Caption(stringResource(R.string.myprofile_appear_offline_hint))
                    RoyalOptionRow(label = stringResource(R.string.myprofile_phone_discovery)) {
                        RoyalOrbToggle(checked = ui.phoneDiscoverable, onCheckedChange = actions.onPhoneDiscoverable)
                    }
                    Caption(stringResource(R.string.myprofile_phone_discovery_hint))
                    RoyalOptionRow(label = stringResource(R.string.myprofile_accept_play)) {
                        RoyalOrbToggle(checked = ui.acceptPlayRequests, onCheckedChange = actions.onAcceptPlayRequests)
                    }

                    RoyalSectionTitle(stringResource(R.string.myprofile_notifications))
                    RoyalOptionRow(label = stringResource(R.string.myprofile_notify_friend_requests)) {
                        RoyalOrbToggle(checked = ui.notifyFriendRequests, onCheckedChange = actions.onNotifyFriendRequests)
                    }
                    RoyalOptionRow(label = stringResource(R.string.myprofile_notify_play_requests)) {
                        RoyalOrbToggle(checked = ui.notifyPlayRequests, onCheckedChange = actions.onNotifyPlayRequests)
                    }
                    RoyalOptionRow(label = stringResource(R.string.myprofile_online_notices), onClick = actions.onChooseOnlineFriends) {
                        Text(stringResource(R.string.myprofile_choose), style = MaterialTheme.typography.labelLarge, color = GoldBevelLight)
                    }
                    Caption(if (ui.onlineWatchNames.isEmpty()) stringResource(R.string.myprofile_online_none) else ui.onlineWatchNames.joinToString(", "))

                    RoyalSectionTitle(stringResource(R.string.myprofile_account))
                    RoyalOptionRow(label = stringResource(R.string.myprofile_phone)) {
                        Text(ui.maskedPhone, style = MaterialTheme.typography.bodyLarge, color = ParchmentText)
                    }
                    RoyalOptionRow(label = stringResource(R.string.myprofile_username_change), onClick = actions.onChangeUsername) {
                        Text(stringResource(R.string.myprofile_edit), style = MaterialTheme.typography.labelLarge, color = GoldBevelLight)
                    }
                    Caption(if (ui.usernameDaysLeft > 0) stringResource(R.string.myprofile_username_wait_format, ui.usernameDaysLeft) else stringResource(R.string.myprofile_username_free))

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth().padding(top = 18.dp)) {
                        RoyalButton(stringResource(R.string.myprofile_log_out), onClick = { confirm = MyProfileConfirm.LOG_OUT }, modifier = Modifier.weight(1f))
                        RoyalButton(stringResource(R.string.myprofile_delete), onClick = { confirm = MyProfileConfirm.DELETE }, style = RoyalButtonStyle.STEEL, modifier = Modifier.weight(1f))
                    }
                    Text(stringResource(R.string.profile_privacy_note), style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
                }
            }
        }
    }
    confirm?.let { step ->
        val delete = step == MyProfileConfirm.DELETE
        GameResultDialog(
            title = stringResource(if (delete) R.string.myprofile_delete else R.string.myprofile_log_out),
            lines = listOf(stringResource(if (delete) R.string.myprofile_delete_confirm else R.string.myprofile_log_out_confirm)),
            primaryText = stringResource(if (delete) R.string.myprofile_delete_yes else R.string.myprofile_log_out),
            onPrimary = { confirm = null; if (delete) actions.onDeleteAccount() else actions.onLogOut() },
            secondaryText = stringResource(R.string.myprofile_cancel),
            onSecondary = { confirm = null }
        )
    }
}

enum class MyProfileConfirm { LOG_OUT, DELETE }

@Composable
private fun Caption(text: String) {
    Text(text, style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim, modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp))
}

/** The nameplate hero: avatar with a gold pencil, "@name ✎", masked phone and facts. */
@Composable
private fun Hero(ui: MyProfileUi, actions: MyProfileActions) {
    val changeAvatar = stringResource(R.string.myprofile_change_avatar)
    val changeName = stringResource(R.string.myprofile_username_change)
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxWidth()
            .antiquePlaque(active = true, cornerRadius = 10.dp)
            .background(Brush.verticalGradient(listOf(Color(0xFF4A2A14), Color(0xFF2B1A0E))), RoundedCornerShape(10.dp))
            .padding(vertical = 16.dp, horizontal = 12.dp)
    ) {
        Box(modifier = Modifier.clickable(role = Role.Button, onClickLabel = changeAvatar, onClick = actions.onChangeAvatar)) {
            PersonAvatar(ui.avatarId, online = !ui.appearOffline, size = 84.dp)
            Pencil(modifier = Modifier.align(Alignment.TopEnd))
        }
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp).clickable(role = Role.Button, onClickLabel = changeName, onClick = actions.onChangeUsername)) {
            Text("@${ui.username}", style = MaterialTheme.typography.headlineSmall, color = GoldBevelLight)
            Pencil(modifier = Modifier.padding(start = 8.dp))
        }
        Text(
            text = (if (ui.appearOffline) stringResource(R.string.myprofile_you_appear_offline) else stringResource(R.string.profile_online)) + " · " + ui.maskedPhone,
            style = MaterialTheme.typography.bodyMedium, color = ParchmentText, modifier = Modifier.padding(top = 4.dp)
        )
        val facts = listOfNotNull(ui.memberSince, stringResource(R.string.myprofile_friends_format, ui.friendCount))
        Text(facts.joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim, modifier = Modifier.padding(top = 2.dp))
    }
}

@Composable
private fun Pencil(modifier: Modifier = Modifier) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .size(24.dp)
            .background(Brush.verticalGradient(listOf(GoldenGlow, GoldBevelDark)), CircleShape)
            .border(1.dp, GoldBevelDark, CircleShape)
    ) { Text("✎", fontSize = 13.sp, color = Color(0xFF24160C)) }
}
