package com.rangepatte.app.ui.entertainment

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.board.BoardCatalog
import com.rangepatte.app.domain.board.BoardGameId
import com.rangepatte.app.domain.board.BoardGameInfo
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.BoardGameTile
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.thumbnails.LudoThumbnail

/**
 * The Entertainment tab: the board games in the same two-column grid of tiles Khel uses (Ludo stage
 * 1, Design 1). Tapping a tile opens that game's own introduction page.
 */
@Composable
fun EntertainmentScreen(onPlayGame: (BoardGameInfo) -> Unit = {}, modifier: Modifier = Modifier) {
    WatermarkBackground(backgroundType = BackgroundType.EVENING_BALCONY, modifier = modifier) {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val columns = if (maxWidth >= 600.dp) 3 else 2
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                item {
                    RoyalPanel(title = stringResource(R.string.nav_entertainment), modifier = Modifier.fillMaxWidth()) {
                        BoardCatalog.all.chunked(columns).forEach { rowGames ->
                            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                                rowGames.forEach { game ->
                                    BoardGameTile(game = game, onPlayClick = { onPlayGame(game) }, modifier = Modifier.weight(1f)) {
                                        when (game.id) {
                                            BoardGameId.LUDO -> LudoThumbnail()
                                            BoardGameId.SNAKES_LADDERS -> com.rangepatte.app.ui.thumbnails.SnakesThumbnail()
                                        }
                                    }
                                }
                                repeat(columns - rowGames.size) { Spacer(modifier = Modifier.weight(1f)) }
                            }
                        }
                    }
                }
            }
        }
    }
}
