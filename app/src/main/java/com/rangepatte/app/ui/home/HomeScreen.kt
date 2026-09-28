package com.rangepatte.app.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.ui.components.FeaturedGameCard
import com.rangepatte.app.ui.components.GamesGrid
import com.rangepatte.app.ui.components.OrnamentalDivider
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.ParchmentTextDim

/** Grid columns for game cards at a given available width — phones, large phones/landscape, tablets. */
internal fun gameGridColumns(width: Dp): Int = when {
    width >= 900.dp -> 4
    width >= 600.dp -> 3
    else -> 2
}

@Composable
fun HomeScreen(
    onPlayGame: (GameInfo) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: HomeViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    WatermarkBackground(backgroundType = uiState.background, modifier = modifier) {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val columns = gameGridColumns(maxWidth)
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                item { TitleCrest() }
                item {
                    RoyalPanel(title = stringResource(R.string.section_featured_game), modifier = Modifier.fillMaxWidth()) {
                        FeaturedGameCard(game = uiState.featuredGame, onPlayClick = { onPlayGame(uiState.featuredGame) })
                    }
                }
                item {
                    RoyalPanel(title = stringResource(R.string.section_popular_games), modifier = Modifier.fillMaxWidth()) {
                        GamesGrid(games = uiState.popularGames, onPlayClick = onPlayGame, columns = columns)
                    }
                }
                item {
                    RoyalPanel(title = stringResource(R.string.section_more_games), modifier = Modifier.fillMaxWidth()) {
                        GamesGrid(games = uiState.moreGames, onPlayClick = onPlayGame, columns = columns)
                    }
                }
            }
        }
    }
}

@Composable
private fun TitleCrest() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp)
    ) {
        OrnamentalDivider(modifier = Modifier.padding(bottom = 4.dp))
        Text(
            text = stringResource(R.string.app_name).uppercase(),
            style = MaterialTheme.typography.displayLarge.copy(
                shadow = Shadow(color = Color.Black.copy(alpha = 0.7f), offset = Offset(0f, 3f), blurRadius = 6f)
            ),
            color = GoldBevelLight,
            textAlign = TextAlign.Center
        )
        Text(
            text = stringResource(R.string.app_tagline).uppercase(),
            style = MaterialTheme.typography.titleMedium,
            color = ParchmentTextDim,
            textAlign = TextAlign.Center
        )
        OrnamentalDivider(modifier = Modifier.padding(top = 8.dp))
    }
}
