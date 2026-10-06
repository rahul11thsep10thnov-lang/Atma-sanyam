package com.rangepatte.app.ui.multiplayer

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.components.royal.RoyalSectionTitle
import com.rangepatte.app.ui.components.royal.RoyalTextField
import com.rangepatte.app.ui.theme.BodyFont
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim

/**
 * Where a table with other people comes together. The host sees who has joined (and, online, the room
 * code to share); a guest sees tables nearby to tap, or types a room code. The host presses Start when
 * everyone is in; empty seats are played by the computer.
 */
@Composable
fun LobbyScreen(
    game: GameInfo,
    lobby: LobbyUi,
    initialName: String,
    permissionsGranted: Boolean,
    onRequestPermissions: () -> Unit,
    onNameChange: (String) -> Unit,
    onShareCode: (String) -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var name by remember { mutableStateOf(initialName) }
    var code by remember { mutableStateOf("") }
    val needsPermission = !lobby.isOnline && !permissionsGranted

    WatermarkBackground(backgroundType = BackgroundType.COURTYARD, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize()) {
            GameHeader(title = stringResource(game.nameRes), onBackClick = onBackClick)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                RoyalPanel(
                    title = stringResource(
                        when {
                            lobby.isHost -> R.string.net_host_table
                            else -> R.string.net_join_table
                        }
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = stringResource(if (lobby.isOnline) R.string.net_mode_online else R.string.net_mode_nearby),
                        style = MaterialTheme.typography.titleMedium,
                        color = GoldBevelLight,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (needsPermission) {
                        Text(
                            text = stringResource(R.string.net_perm_body),
                            style = MaterialTheme.typography.bodyLarge,
                            color = ParchmentText,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                        )
                        RoyalButton(
                            text = stringResource(R.string.net_perm_allow),
                            onClick = onRequestPermissions,
                            modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                        )
                    } else if (lobby.stage == LobbyStage.IDLE) {
                        RoyalTextField(
                            value = name,
                            onValueChange = { name = it.take(20); onNameChange(name) },
                            label = stringResource(R.string.net_your_name),
                            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                            modifier = Modifier.padding(top = 12.dp)
                        )
                        if (lobby.isOnline && !lobby.isHost) {
                            RoyalTextField(
                                value = code,
                                onValueChange = { code = it.uppercase().filter { c -> c.isLetterOrDigit() }.take(6) },
                                label = stringResource(R.string.net_enter_code),
                                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters),
                                textStyle = TextStyle(fontFamily = BodyFont, fontSize = 22.sp, letterSpacing = 4.sp, color = ParchmentText),
                                modifier = Modifier.padding(top = 10.dp)
                            )
                            RoyalButton(
                                text = stringResource(R.string.net_join),
                                enabled = code.length >= 4,
                                onClick = { onNameChange(name); lobby.joinOnline(code) },
                                modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                            )
                        } else {
                            RoyalButton(
                                text = stringResource(if (lobby.isHost) R.string.net_open_table else R.string.net_search_tables),
                                onClick = { onNameChange(name); lobby.begin(name) },
                                modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                            )
                        }
                    } else {
                        if (lobby.isHost) HostSection(lobby, onShareCode) else GuestSection(lobby)
                    }

                    lobby.error?.let { error ->
                        Text(
                            text = if (error.detail != null) stringResource(error.messageRes, error.detail) else stringResource(error.messageRes),
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFFF08A7A),
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun HostSection(lobby: LobbyUi, onShareCode: (String) -> Unit) {
    lobby.roomCode?.let { roomCode ->
        RoyalSectionTitle(stringResource(R.string.net_room_code))
        Text(
            text = roomCode,
            style = TextStyle(fontFamily = BodyFont, fontSize = 40.sp, letterSpacing = 8.sp, color = GoldenGlow),
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )
        RoyalButton(
            text = stringResource(R.string.net_share_code),
            onClick = { onShareCode(roomCode) },
            style = RoyalButtonStyle.STEEL,
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
        )
    }
    if (lobby.stage == LobbyStage.WORKING && lobby.roomCode == null && lobby.names.isEmpty()) {
        Text(
            text = stringResource(R.string.net_waiting_players),
            style = MaterialTheme.typography.bodyLarge,
            color = ParchmentTextDim,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
        )
    }
    RoyalSectionTitle(stringResource(R.string.net_players_format, lobby.names.size, lobby.totalSeats))
    PeopleList(lobby.names)
    Text(
        text = stringResource(R.string.net_empty_seats_note),
        style = MaterialTheme.typography.bodyMedium,
        color = ParchmentTextDim,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
    )
    RoyalButton(
        text = stringResource(R.string.net_start_game),
        enabled = lobby.names.size >= 2,
        onClick = lobby::startGame,
        modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
    )
    if (lobby.names.size < 2) {
        Text(
            text = stringResource(R.string.net_need_one_guest),
            style = MaterialTheme.typography.bodyMedium,
            color = ParchmentTextDim,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 6.dp)
        )
    }
}

@Composable
private fun GuestSection(lobby: LobbyUi) {
    if (lobby.stage == LobbyStage.AT_TABLE) {
        RoyalSectionTitle(stringResource(R.string.net_players_format, lobby.names.size, lobby.totalSeats))
        PeopleList(lobby.names)
        Text(
            text = stringResource(R.string.net_joined_waiting),
            style = MaterialTheme.typography.bodyLarge,
            color = GoldenGlow,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
        )
    } else if (lobby.isOnline) {
        Text(
            text = stringResource(R.string.net_connecting),
            style = MaterialTheme.typography.bodyLarge,
            color = ParchmentTextDim,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
        )
    } else {
        Text(
            text = stringResource(if (lobby.foundTables.isEmpty()) R.string.net_no_tables else R.string.net_tap_to_join),
            style = MaterialTheme.typography.bodyLarge,
            color = ParchmentTextDim,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp, bottom = 8.dp)
        )
        lobby.foundTables.forEach { table ->
            val shape = RoundedCornerShape(3.dp)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
                    .background(PanelWoodDark, shape)
                    .border(1.dp, GoldBevelDark, shape)
                    .clickable(role = Role.Button) { lobby.joinNearby(table.endpointId) }
                    .padding(14.dp)
            ) {
                Icon(Icons.Filled.Person, contentDescription = null, tint = GoldBevelLight)
                Text(
                    text = table.hostName,
                    style = MaterialTheme.typography.titleMedium,
                    color = ParchmentText,
                    modifier = Modifier.padding(start = 10.dp)
                )
            }
        }
    }
}

@Composable
private fun PeopleList(names: List<String>) {
    names.forEachIndexed { index, person ->
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
            Icon(Icons.Filled.Person, contentDescription = null, tint = if (index == 0) GoldenGlow else GoldBevelLight)
            Text(
                text = person,
                style = MaterialTheme.typography.bodyLarge,
                color = ParchmentText,
                modifier = Modifier.padding(start = 10.dp)
            )
        }
    }
}
