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
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.ClassicalButton
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.WatermarkBackground

/** Pre-game setup: choose player count (within the game's supported range) and AI difficulty. */
@Composable
fun GameSetupScreen(
    game: GameInfo,
    onBackClick: () -> Unit,
    onStartGame: (playerCount: Int, difficulty: AiDifficulty) -> Unit,
    modifier: Modifier = Modifier
) {
    var playerCount by remember(game.id) { mutableIntStateOf(game.minPlayers) }
    var difficulty by remember { mutableStateOf(AiDifficulty.MEDIUM) }

    WatermarkBackground(backgroundType = BackgroundType.COURTYARD, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            GameHeader(title = stringResource(game.nameRes), onBackClick = onBackClick)

            Column(
                modifier = Modifier.padding(top = 24.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                Text(text = stringResource(R.string.setup_title), style = MaterialTheme.typography.headlineMedium)

                if (game.maxPlayers > game.minPlayers) {
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

                ClassicalButton(
                    text = stringResource(R.string.setup_start),
                    onClick = { onStartGame(playerCount, difficulty) }
                )
            }
        }
    }
}
