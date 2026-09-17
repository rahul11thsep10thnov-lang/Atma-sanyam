package com.rangepatte.app.ui.rules

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.WatermarkBackground

/**
 * "How to Play" reference for a game. Content is a placeholder until each engine's rules are
 * written alongside it (Phase 7+); the screen shell itself is complete and reusable for all games.
 */
@Composable
fun RulesScreen(
    game: GameInfo,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    WatermarkBackground(backgroundType = BackgroundType.MOUNTAIN_VALLEY, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            GameHeader(
                title = stringResource(R.string.rules_title_format, stringResource(game.nameRes)),
                onBackClick = onBackClick
            )
            Text(
                text = stringResource(R.string.rules_placeholder),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 20.dp)
            )
        }
    }
}
