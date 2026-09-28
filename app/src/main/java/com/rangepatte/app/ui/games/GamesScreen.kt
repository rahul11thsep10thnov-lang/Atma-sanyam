package com.rangepatte.app.ui.games

import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameCatalog
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GamesGrid
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.home.gameGridColumns

/** Every game in the catalog, as a grid of framed portrait cards inside one carved panel. */
@Composable
fun GamesScreen(
    onPlayGame: (GameInfo) -> Unit,
    modifier: Modifier = Modifier
) {
    WatermarkBackground(backgroundType = BackgroundType.WOODEN_VERANDA, modifier = modifier) {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val columns = gameGridColumns(maxWidth)
            LazyColumn(contentPadding = PaddingValues(16.dp)) {
                item {
                    RoyalPanel(title = stringResource(R.string.games_title), modifier = Modifier.fillMaxWidth()) {
                        GamesGrid(games = GameCatalog.all, onPlayClick = onPlayGame, columns = columns)
                    }
                }
            }
        }
    }
}
