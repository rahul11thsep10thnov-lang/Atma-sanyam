package com.rangepatte.app.ui.setup

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.domain.model.PlayMode
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.ClassicalButton
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.rules.RulesDialog

/**
 * Pre-game setup: how to play (vs computer / pass & play / nearby / online), player count, and AI
 * difficulty. The rules scroll pops up automatically the moment a game is selected (per the design
 * brief), and can be reopened any time via the header's scroll icon.
 */
@Composable
fun GameSetupScreen(
    game: GameInfo,
    onBackClick: () -> Unit,
    onStartGame: (playerCount: Int, difficulty: AiDifficulty, mode: PlayMode) -> Unit,
    modifier: Modifier = Modifier
) {
    var playerCount by remember(game.id) { mutableIntStateOf(game.minPlayers) }
    var difficulty by remember { mutableStateOf(AiDifficulty.MEDIUM) }
    var mode by remember(game.id) { mutableStateOf(PlayMode.VS_COMPUTER) }
    var showRules by remember(game.id) { mutableStateOf(false) }
    val isMultiplayerCapable = game.maxPlayers > 1

    LaunchedEffect(game.id) { showRules = true }

    WatermarkBackground(backgroundType = BackgroundType.COURTYARD, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            GameHeader(
                title = stringResource(game.nameRes),
                onBackClick = onBackClick,
                onSettingsClick = { showRules = true }
            )

            Column(
                modifier = Modifier.padding(top = 24.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                Text(text = stringResource(R.string.setup_title), style = MaterialTheme.typography.headlineMedium)

                if (isMultiplayerCapable) {
                    Column {
                        Text(text = stringResource(R.string.setup_mode_title), style = MaterialTheme.typography.titleMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                            FilterChip(
                                selected = mode == PlayMode.VS_COMPUTER,
                                onClick = { mode = PlayMode.VS_COMPUTER },
                                label = { Text(stringResource(R.string.setup_mode_vs_computer)) }
                            )
                            FilterChip(
                                selected = mode == PlayMode.PASS_AND_PLAY,
                                onClick = { mode = PlayMode.PASS_AND_PLAY },
                                label = { Text(stringResource(R.string.setup_mode_pass_play)) }
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                            val comingSoon = stringResource(R.string.setup_mode_coming_soon)
                            FilterChip(
                                selected = false,
                                enabled = false,
                                onClick = {},
                                label = { Text("${stringResource(R.string.setup_mode_nearby)} · $comingSoon") }
                            )
                            FilterChip(
                                selected = false,
                                enabled = false,
                                onClick = {},
                                label = { Text("${stringResource(R.string.setup_mode_online)} · $comingSoon") }
                            )
                        }
                    }

                    Column {
                        Text(text = stringResource(R.string.setup_players), style = MaterialTheme.typography.titleMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                            (game.minPlayers..game.maxPlayers).forEach { count ->
                                FilterChip(
                                    selected = playerCount == count,
                                    onClick = { playerCount = count },
                                    label = { Text(count.toString()) }
                                )
                            }
                        }
                    }
                }

                if (!isMultiplayerCapable || mode == PlayMode.VS_COMPUTER) {
                    Column {
                        Text(text = stringResource(R.string.setup_difficulty), style = MaterialTheme.typography.titleMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                            AiDifficulty.entries.forEach { level ->
                                FilterChip(
                                    selected = difficulty == level,
                                    onClick = { difficulty = level },
                                    label = { Text(level.name.lowercase().replaceFirstChar { it.uppercase() }) }
                                )
                            }
                        }
                    }
                }

                ClassicalButton(
                    text = stringResource(R.string.setup_start),
                    onClick = { onStartGame(playerCount, difficulty, if (isMultiplayerCapable) mode else PlayMode.VS_COMPUTER) }
                )
            }
        }
    }

    if (showRules) {
        RulesDialog(game = game, onDismiss = { showRules = false })
    }
}
