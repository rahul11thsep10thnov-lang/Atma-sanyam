package com.rangepatte.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.ui.theme.BodyFont
import com.rangepatte.app.ui.theme.ButtonCrimsonBottom
import com.rangepatte.app.ui.theme.ButtonCrimsonTop
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim
import com.rangepatte.app.ui.theme.RoyalLabelStyle
import com.rangepatte.app.ui.thumbnails.GameThumbnail

/** Portrait backdrops cycle through four royal colours, like the coloured portrait cards of a strategy game. */
private val portraitPalettes = listOf(
    Color(0xFF9A2E1E) to Color(0xFF3E0D07), // crimson
    Color(0xFF2F4F8A) to Color(0xFF10192E), // indigo
    Color(0xFF2E7A4F) to Color(0xFF0E2A1A), // emerald
    Color(0xFFB8741E) to Color(0xFF3E2408)  // saffron
)

/**
 * A framed square "portrait" for a game: coloured radial backdrop, bevelled gold frame, and the
 * game's [GameThumbnail] — its signature cards — on top.
 */
@Composable
fun GamePortrait(game: GameInfo, modifier: Modifier = Modifier, size: Dp? = null) {
    val (light, dark) = portraitPalettes[game.id.ordinal % portraitPalettes.size]
    val shape = RoundedCornerShape(3.dp)
    Box(
        modifier = modifier
            .let { if (size != null) it.size(size) else it.fillMaxWidth().aspectRatio(1f) }
            .background(Brush.radialGradient(listOf(light, dark)), shape)
            .border(2.dp, GoldBevelDark, shape)
            .padding(3.dp)
            .border(1.dp, GoldBevelLight.copy(alpha = 0.6f), shape),
        contentAlignment = Alignment.Center
    ) {
        GameThumbnail(
            gameId = game.id,
            modifier = Modifier
                .fillMaxSize()
                .padding(4.dp)
        )
    }
}

/**
 * One game in a grid: framed portrait, a crimson name plaque beneath it, then the one-clause
 * summary and player count. The whole card is the tap target.
 */
@Composable
fun GameTile(
    game: GameInfo,
    onPlayClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val playLabel = stringResource(R.string.action_play)
    Column(
        modifier = modifier.clickable(role = Role.Button, onClickLabel = playLabel, onClick = onPlayClick),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        GamePortrait(game = game)
        NamePlaque(text = stringResource(game.nameRes))
        Text(
            text = stringResource(game.descriptionRes),
            style = TextStyle(fontFamily = BodyFont, fontSize = 14.sp, lineHeight = 18.sp),
            color = ParchmentTextDim,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 6.dp)
        )
        Text(
            text = playerCountLabel(game.minPlayers, game.maxPlayers, stringResource(R.string.players_suffix)),
            style = RoyalLabelStyle.copy(fontSize = 12.sp),
            color = GoldBevelDark,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 2.dp)
        )
    }
}

@Composable
private fun NamePlaque(text: String) {
    val shape = RoundedCornerShape(2.dp)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp)
            .background(Brush.verticalGradient(listOf(ButtonCrimsonTop, ButtonCrimsonBottom)), shape)
            .border(1.dp, GoldBevelDark, shape)
            .padding(horizontal = 6.dp, vertical = 5.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text.uppercase(),
            style = RoyalLabelStyle.copy(fontSize = 14.sp),
            color = ParchmentText,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

private fun playerCountLabel(min: Int, max: Int, suffix: String): String =
    if (min == max) "$min $suffix" else "$min–$max $suffix"

@Composable
fun GamesGrid(
    games: List<GameInfo>,
    onPlayClick: (GameInfo) -> Unit,
    modifier: Modifier = Modifier,
    columns: Int = 2
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(18.dp)) {
        games.chunked(columns).forEach { rowGames ->
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
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
