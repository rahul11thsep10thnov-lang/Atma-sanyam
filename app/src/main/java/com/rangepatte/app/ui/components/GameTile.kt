package com.rangepatte.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameInfo

/**
 * A single game entry in the Home/Games grid: illustration placeholder, name, short description,
 * player count and a Play button. The illustration is a plain suit-motif box today — see README
 * for how to swap in real per-game artwork under res/drawable/games/.
 */
@Composable
fun GameTile(
    game: GameInfo,
    onPlayClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onPlayClick),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1.6f)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MaterialTheme.colorScheme.tertiary.copy(alpha = 0.18f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = suitMotifFor(game.id.name),
                    style = MaterialTheme.typography.displayLarge,
                    color = MaterialTheme.colorScheme.tertiary
                )
            }

            Text(
                text = stringResource(game.nameRes),
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 10.dp)
            )
            Text(
                text = stringResource(game.descriptionRes),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 4.dp)
            )
            Text(
                text = playerCountLabel(game.minPlayers, game.maxPlayers),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.outline,
                modifier = Modifier.padding(top = 6.dp)
            )

            ClassicalButton(
                text = stringResource(R.string.action_play),
                onClick = onPlayClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
            )
        }
    }
}

private fun playerCountLabel(min: Int, max: Int): String =
    if (min == max) "$min Players" else "$min–$max Players"

/** A deterministic suit glyph per game so tiles are visually distinct without real artwork yet. */
private fun suitMotifFor(gameIdName: String): String {
    val motifs = listOf("♠", "♥", "♦", "♣")
    val index = gameIdName.sumOf { it.code } % motifs.size
    return motifs[index]
}

@Composable
fun GamesGrid(
    games: List<GameInfo>,
    onPlayClick: (GameInfo) -> Unit,
    modifier: Modifier = Modifier,
    columns: Int = 2
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        games.chunked(columns).forEach { rowGames ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                rowGames.forEach { game ->
                    GameTile(
                        game = game,
                        onPlayClick = { onPlayClick(game) },
                        modifier = Modifier.weight(1f)
                    )
                }
                repeat(columns - rowGames.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}
