package com.rangepatte.app.ui.games

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameCatalog
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.ui.components.GameTile
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.background.BackgroundType

/** Full list of every game in the catalog — the "see everything" counterpart to the curated Home grid. */
@Composable
fun GamesScreen(
    onPlayGame: (GameInfo) -> Unit,
    modifier: Modifier = Modifier
) {
    WatermarkBackground(backgroundType = BackgroundType.WOODEN_VERANDA, modifier = modifier) {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Text(
                    text = stringResource(R.string.games_title),
                    style = MaterialTheme.typography.headlineLarge,
                    color = MaterialTheme.colorScheme.onBackground
                )
            }
            items(GameCatalog.all, key = { it.id.name }) { game ->
                GameTile(game = game, onPlayClick = { onPlayGame(game) })
            }
        }
    }
}
