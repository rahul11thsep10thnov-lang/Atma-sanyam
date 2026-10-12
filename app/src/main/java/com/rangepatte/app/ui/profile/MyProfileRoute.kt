package com.rangepatte.app.ui.profile

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.rangepatte.app.AppServices
import com.rangepatte.app.R
import com.rangepatte.app.domain.friends.Relation
import com.rangepatte.app.domain.profile.ProfileRules
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.ui.components.royal.RoyalOrbToggle
import com.rangepatte.app.ui.theme.ParchmentText

/** My Profile wired to the repositories (Element 16). */
@Composable
fun MyProfileRoute(onChangeAvatar: () -> Unit, onChangeUsername: () -> Unit, onSignedOut: () -> Unit, onBackClick: () -> Unit) {
    val context = LocalContext.current
    val user by AppServices.account.currentUser.collectAsState()
    val profile by AppServices.profile.profile.collectAsState()
    val settings by AppServices.myProfile.value.collectAsState()
    val invisible by AppServices.presence.invisible.collectAsState()
    val relations by AppServices.friends.relations.collectAsState()
    val people by AppServices.friends.people.collectAsState()
    val me = user ?: run { onBackClick(); return }
    val friendUids = relations.filter { it.kind == Relation.Kind.FRIENDS }.map { it.other(me.uid) }
    var chooseOnline by remember { mutableStateOf(false) }
    val sinceLabel = stringResource(R.string.myprofile_member_since)
    val failed = stringResource(R.string.myprofile_delete_failed)

    val ludo by AppServices.ludoRecord.value.collectAsState()
    val ui = MyProfileUi(
        username = profile?.username ?: "",
        avatarId = profile?.avatarId,
        maskedPhone = ProfileRules.maskPhone(me.phoneNumber),
        memberSince = profile?.createdAt?.takeIf { it > 0 }?.let { sinceLabel.format(java.text.SimpleDateFormat("MMM yyyy", java.util.Locale.getDefault()).format(java.util.Date(it))) },
        friendCount = friendUids.size,
        appearOffline = invisible,
        phoneDiscoverable = profile?.phoneDiscoverable == true,
        acceptPlayRequests = settings.acceptPlayRequests,
        notifyFriendRequests = settings.notifyFriendRequests,
        notifyPlayRequests = settings.notifyPlayRequests,
        onlineWatchNames = settings.onlineWatch.mapNotNull { people[it]?.username },
        usernameDaysLeft = ProfileRules.daysUntilUsernameChange(profile?.usernameChangedAt ?: 0, System.currentTimeMillis()),
        ludoRecord = ludo.takeIf { it.played > 0 }?.let { stringResource(R.string.myprofile_ludo_format, it.played, it.won) }
    )
    MyProfileScreen(
        ui = ui,
        actions = MyProfileActions(
            onChangeAvatar = onChangeAvatar,
            onChangeUsername = onChangeUsername,
            onAppearOffline = { AppServices.presence.setInvisible(it) },
            onPhoneDiscoverable = { AppServices.profile.setPhoneDiscoverable(me.phoneNumber, it) },
            onAcceptPlayRequests = { on -> AppServices.myProfile.update { it.copy(acceptPlayRequests = on) } },
            onNotifyFriendRequests = { on -> AppServices.myProfile.update { it.copy(notifyFriendRequests = on) } },
            onNotifyPlayRequests = { on -> AppServices.myProfile.update { it.copy(notifyPlayRequests = on) } },
            onChooseOnlineFriends = { chooseOnline = true },
            onLogOut = { AppServices.account.signOut(); onSignedOut() },
            onDeleteAccount = {
                AppServices.profile.deleteProfile { r ->
                    if (r.isSuccess) { AppServices.account.signOut(); onSignedOut() }
                    else Toast.makeText(context, failed, Toast.LENGTH_SHORT).show()
                }
            },
            onBackClick = onBackClick
        )
    )
    if (chooseOnline) {
        GameResultDialog(
            title = stringResource(R.string.myprofile_online_notices),
            lines = listOf(stringResource(R.string.myprofile_online_pick_hint)),
            primaryText = stringResource(R.string.myprofile_done),
            onPrimary = { chooseOnline = false },
            extra = {
                if (friendUids.isEmpty()) Text(stringResource(R.string.friends_empty), style = MaterialTheme.typography.bodyMedium, color = ParchmentText)
                friendUids.forEach { uid ->
                    val on = uid in settings.onlineWatch
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable {
                        AppServices.myProfile.update { it.copy(onlineWatch = if (on) it.onlineWatch - uid else it.onlineWatch + uid) }
                    }) {
                        Text("@" + (people[uid]?.username ?: "…"), style = MaterialTheme.typography.bodyLarge, color = ParchmentText, modifier = Modifier.weight(1f))
                        RoyalOrbToggle(checked = on, onCheckedChange = { want -> AppServices.myProfile.update { it.copy(onlineWatch = if (want) it.onlineWatch + uid else it.onlineWatch - uid) } })
                    }
                }
            }
        )
    }
}
