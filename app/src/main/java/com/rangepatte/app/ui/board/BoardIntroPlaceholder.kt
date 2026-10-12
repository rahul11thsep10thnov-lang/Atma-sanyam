package com.rangepatte.app.ui.board

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.board.BoardGameInfo
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.theme.ParchmentTextDim

/**
 * Where a board-game tile leads until that game's introduction and mode-selection page (its stage 2)
 * is approved and built: the game's name and a plain note, never a half-built game.
 */
@Composable
fun BoardIntroPlaceholder(game: BoardGameInfo, onBackClick: () -> Unit, textRes: Int = R.string.board_table_pending) {
    WatermarkBackground(backgroundType = BackgroundType.EVENING_BALCONY) {
        Column(modifier = Modifier.fillMaxSize()) {
            GameHeader(title = stringResource(game.nameRes), onBackClick = onBackClick)
            RoyalPanel(title = stringResource(game.nameRes), modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Text(
                    text = stringResource(textRes),
                    style = MaterialTheme.typography.bodyLarge,
                    color = ParchmentTextDim,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)
                )
            }
        }
    }
}
