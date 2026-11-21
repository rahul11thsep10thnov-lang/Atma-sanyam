package com.rangepatte.app.ui.games

import com.rangepatte.app.ui.components.gameGridColumns
import androidx.compose.ui.platform.LocalDensity
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameCatalog
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GamesGrid
import com.rangepatte.app.ui.components.OrnamentalDivider
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.ParchmentTextDim

/**
 * "Khel" — the page the app opens on. The app's title crest and tagline, then every game in one
 * grid (no categories), each tile showing its signature cards.
 */
@Composable
fun GamesScreen(
    onPlayGame: (GameInfo) -> Unit,
    modifier: Modifier = Modifier
) {
    WatermarkBackground(backgroundType = BackgroundType.WOODEN_VERANDA, modifier = modifier) {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val columns = gameGridColumns(maxWidth, LocalDensity.current.fontScale)
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item { TitleCrest() }
                item {
                    RoyalPanel(title = stringResource(R.string.games_title), modifier = Modifier.fillMaxWidth()) {
                        GamesGrid(games = GameCatalog.all, onPlayClick = onPlayGame, columns = columns)
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
        modifier = Modifier.fillMaxWidth()
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
            text = stringResource(R.string.app_tagline),
            style = MaterialTheme.typography.bodyLarge,
            color = ParchmentTextDim,
            textAlign = TextAlign.Center
        )
        OrnamentalDivider(modifier = Modifier.padding(top = 8.dp))
    }
}
