package com.rangepatte.app.ui.history

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.WatermarkBackground

/**
 * Match history placeholder. Backed by Room ([com.rangepatte.app.domain.game.GameStatus] rounds,
 * a `GameHistoryEntity`) starting Phase 17 — this screen only needs its data source swapped then.
 */
@Composable
fun HistoryScreen(modifier: Modifier = Modifier) {
    WatermarkBackground(backgroundType = BackgroundType.EVENING_BALCONY, modifier = modifier) {
        Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
            Text(
                text = stringResource(R.string.history_empty),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }
    }
}
