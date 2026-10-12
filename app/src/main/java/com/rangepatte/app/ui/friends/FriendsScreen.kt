package com.rangepatte.app.ui.friends

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
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
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim

enum class FriendsTab { FRIENDS, REQUESTS, FIND, ONLINE }

/** Everything the Friends tab shows; the route fills it from the repositories. */
data class FriendsState(
    val friends: List<PersonUi> = emptyList(),
    val incoming: List<PersonUi> = emptyList(),
    val outgoing: List<PersonUi> = emptyList(),
    val find: FindPeopleState = FindPeopleState(),
    val offline: Boolean = false,
    val loading: Boolean = false,
    /** Element 17: the plain cause of a failed load, already localized; null when all is well. */
    val error: String? = null,
    /** Element 17: still rows while the system asks for less motion. */
    val shimmer: Boolean = true
)

/** What the row's ⋯ menu offers for a friend. */
enum class FriendMenu { REMOVE, BLOCK, FAVOURITE, MUTE }

/**
 * The Friends tab (approved Design 1): four plaque tabs — Friends · Requests · Find · Online — over
 * nameplate rows; Requests carries the count of people waiting. Stateless; see [FriendsRoute].
 */
@Composable
fun FriendsScreen(
    state: FriendsState,
    tab: FriendsTab,
    onTab: (FriendsTab) -> Unit,
    onFindMode: (SearchMode) -> Unit,
    onFindQuery: (String) -> Unit,
    onFindPhone: () -> Unit,
    onAction: (PersonUi, RelationAction) -> Unit,
    onRetry: () -> Unit = {},
    onMenu: (PersonUi, FriendMenu) -> Unit,
    onOpen: (PersonUi) -> Unit,
    modifier: Modifier = Modifier
) {
    WatermarkBackground(backgroundType = BackgroundType.EVENING_BALCONY, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(12.dp)) {
            RoyalPanel(title = stringResource(R.string.nav_friends), modifier = Modifier.fillMaxWidth()) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    FriendsTab.entries.forEach { t ->
                        val label = stringResource(when (t) {
                            FriendsTab.FRIENDS -> R.string.friends_tab_friends; FriendsTab.REQUESTS -> R.string.friends_tab_requests
                            FriendsTab.FIND -> R.string.friends_tab_find; FriendsTab.ONLINE -> R.string.friends_tab_online
                        })
                        val count = if (t == FriendsTab.REQUESTS) state.incoming.size else 0
                        RoyalButton(
                            text = if (count > 0) "$label ($count)" else label,
                            onClick = { onTab(t) },
                            style = if (tab == t) RoyalButtonStyle.CRIMSON else RoyalButtonStyle.STEEL,
                            compact = true,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                if (state.offline) com.rangepatte.app.ui.components.royal.OfflineBand(stringResource(R.string.state_offline_title), stringResource(R.string.state_offline_body), modifier = Modifier.padding(top = 10.dp))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
                    val error = state.error
                    when {
                        error != null && tab != FriendsTab.FIND -> com.rangepatte.app.ui.components.royal.ErrorPlaque(stringResource(R.string.state_error_title), error, stringResource(R.string.state_retry), onRetry)
                        tab == FriendsTab.FRIENDS -> FriendList(state.friends, state.loading, state.shimmer, onAction, onMenu, onOpen) {
                            com.rangepatte.app.ui.components.royal.EmptyState("\uD83E\uDD1D", stringResource(R.string.state_friends_empty_title), stringResource(R.string.state_friends_empty_body), stringResource(R.string.friends_tab_find), onButton = { onTab(FriendsTab.FIND) })
                        }
                        tab == FriendsTab.ONLINE -> FriendList(state.friends.filter { it.online }, state.loading, state.shimmer, onAction, onMenu, onOpen) {
                            if (state.friends.isEmpty()) com.rangepatte.app.ui.components.royal.EmptyState("\uD83E\uDD1D", stringResource(R.string.state_friends_empty_title), stringResource(R.string.state_friends_empty_body), stringResource(R.string.friends_tab_find), onButton = { onTab(FriendsTab.FIND) })
                            else com.rangepatte.app.ui.components.royal.EmptyState("\uD83C\uDF19", stringResource(R.string.state_online_empty_title), stringResource(R.string.state_online_empty_body, state.friends.size))
                        }
                        tab == FriendsTab.REQUESTS -> {
                            if (state.incoming.isEmpty() && state.outgoing.isEmpty()) com.rangepatte.app.ui.components.royal.EmptyState("\uD83D\uDCEC", stringResource(R.string.state_requests_empty_title), stringResource(R.string.state_requests_empty_body))
                            else RequestsPanel(state.incoming, state.outgoing, onAction)
                        }
                        else -> FindPeoplePanel(state.find, onFindMode, onFindQuery, onFindPhone, onAction, onOpen)
                    }
                }
            }
        }
    }
}

@Composable
private fun FriendList(
    friends: List<PersonUi>, loading: Boolean, shimmer: Boolean,
    onAction: (PersonUi, RelationAction) -> Unit, onMenu: (PersonUi, FriendMenu) -> Unit, onOpen: (PersonUi) -> Unit,
    empty: @Composable () -> Unit
) {
    if (loading && friends.isEmpty()) { com.rangepatte.app.ui.components.royal.SkeletonRows(count = 3, shimmer = shimmer, loadingLabel = stringResource(R.string.friends_loading)); return }
    if (friends.isEmpty()) { empty(); return }
    friends.forEach { person ->
        var menuOpen by remember(person.uid) { mutableStateOf(false) }
        Box {
            PersonRow(person, onAction = { onAction(person, it) }, onOpen = { onOpen(person) }, trailing = {
                Text("⋯", style = MaterialTheme.typography.titleLarge, color = ParchmentText,
                    modifier = Modifier.padding(start = 6.dp).clickable { menuOpen = true })
            })
            DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }, modifier = Modifier.background(PanelWoodDark)) {
                DropdownMenuItem(text = { Text(stringResource(if (person.favourite) R.string.poke_unfavourite else R.string.poke_favourite), color = ParchmentText) }, onClick = { menuOpen = false; onMenu(person, FriendMenu.FAVOURITE) })
                DropdownMenuItem(text = { Text(stringResource(if (person.muted) R.string.poke_unmute_person else R.string.poke_mute_person), color = ParchmentText) }, onClick = { menuOpen = false; onMenu(person, FriendMenu.MUTE) })
                DropdownMenuItem(text = { Text(stringResource(R.string.friends_remove), color = ParchmentText) }, onClick = { menuOpen = false; onMenu(person, FriendMenu.REMOVE) })
                DropdownMenuItem(text = { Text(stringResource(R.string.friends_block), color = ParchmentText) }, onClick = { menuOpen = false; onMenu(person, FriendMenu.BLOCK) })
            }
        }
    }
}

@Composable
private fun Note(text: String, color: androidx.compose.ui.graphics.Color) =
    Text(text, style = MaterialTheme.typography.bodyMedium, color = color, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp))

/** Shown instead of the tab when nobody is signed in: what friends can do, and a way to log in. */
@Composable
fun FriendsGate(onLoginClick: () -> Unit, modifier: Modifier = Modifier) {
    WatermarkBackground(backgroundType = BackgroundType.EVENING_BALCONY, modifier = modifier) {
        Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
            RoyalPanel(title = stringResource(R.string.friends_gate_title), modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.friends_gate_intro), style = MaterialTheme.typography.bodyLarge, color = ParchmentText, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                listOf(R.string.friends_gate_1, R.string.friends_gate_2, R.string.friends_gate_3, R.string.friends_gate_4, R.string.friends_gate_5).forEach {
                    Text("•  " + stringResource(it), style = MaterialTheme.typography.bodyLarge, color = ParchmentTextDim, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
                }
                RoyalButton(stringResource(R.string.login_title), onClick = onLoginClick, modifier = Modifier.fillMaxWidth().padding(top = 18.dp))
            }
        }
    }
}
