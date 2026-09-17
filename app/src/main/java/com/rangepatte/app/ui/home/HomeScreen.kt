package com.rangepatte.app.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.ui.components.GameTile
import com.rangepatte.app.ui.components.GamesGrid
import com.rangepatte.app.ui.components.WatermarkBackground

@Composable
fun HomeScreen(
    onPlayGame: (GameInfo) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: HomeViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    WatermarkBackground(backgroundType = uiState.background, modifier = modifier) {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            item {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(top = 8.dp)) {
                    Text(
                        text = stringResource(R.string.app_name),
                        style = MaterialTheme.typography.displayLarge,
                        color = MaterialTheme.colorScheme.primary,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        text = stringResource(R.string.app_tagline),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            }

            item {
                SectionHeading(stringResource(R.string.section_featured_game))
            }
            item {
                GameTile(
                    game = uiState.featuredGame,
                    onPlayClick = { onPlayGame(uiState.featuredGame) }
                )
            }

            item {
                SectionHeading(stringResource(R.string.section_popular_games))
            }
            item {
                GamesGrid(games = uiState.popularGames, onPlayClick = onPlayGame)
            }

            item {
                SectionHeading(stringResource(R.string.section_more_games))
            }
            item {
                GamesGrid(games = uiState.moreGames, onPlayClick = onPlayGame)
            }

            item {
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun SectionHeading(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.headlineMedium,
        color = MaterialTheme.colorScheme.onBackground
    )
}
