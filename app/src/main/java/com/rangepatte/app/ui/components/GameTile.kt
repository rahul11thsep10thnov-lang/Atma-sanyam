package com.rangepatte.app.ui.components

import androidx.compose.foundation.layout.widthIn
import androidx.compose.ui.unit.sp
import com.rangepatte.app.ui.theme.TypeScale
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.ui.theme.AppType
import com.rangepatte.app.ui.theme.ButtonCrimsonBottom
import com.rangepatte.app.ui.theme.ButtonCrimsonTop
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim
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
fun GamePortrait(game: GameInfo, modifier: Modifier = Modifier, size: Dp? = null, maxWidth: Dp = Dp.Unspecified) {
    val (light, dark) = portraitPalettes[game.id.ordinal % portraitPalettes.size]
    val shape = RoundedCornerShape(3.dp)
    Box(
        modifier = modifier
            .let { if (size != null) it.size(size) else it.widthIn(max = maxWidth).fillMaxWidth().aspectRatio(1f) }
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
    modifier: Modifier = Modifier,
    /** Caps the portrait in a one-column grid (very large system font), so it does not fill the screen. */
    maxPortraitWidth: Dp = Dp.Unspecified
) {
    val playLabel = stringResource(R.string.action_play)
    Column(
        modifier = modifier.clickable(role = Role.Button, onClickLabel = playLabel, onClick = onPlayClick),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        GamePortrait(game = game, maxWidth = maxPortraitWidth)
        NamePlaque(text = stringResource(game.nameRes))
        Text(
            text = stringResource(game.descriptionRes),
            style = AppType.BodyText,
            color = ParchmentTextDim,
            textAlign = TextAlign.Center,
            maxLines = 4,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 6.dp)
        )
        Text(
            text = playerCountLabel(game.minPlayers, game.maxPlayers, stringResource(R.string.players_suffix)),
            style = AppType.Metadata,
            color = GoldBevelDark,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 2.dp)
        )
    }
}

@Composable
private fun NamePlaque(text: String) {
    val shape = RoundedCornerShape(2.dp)
    val style = AppType.GameTitle
    // Game names are large (21 sp), so the plaque always has room for two lines. Every plaque in a grid
    // is the same height, and a one-line name sits in the middle of it.
    val twoLines = with(LocalDensity.current) { style.lineHeight.toDp() * 2 }
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp)
            .background(Brush.verticalGradient(listOf(ButtonCrimsonTop, ButtonCrimsonBottom)), shape)
            .border(1.dp, GoldBevelDark, shape)
            .heightIn(min = twoLines + 10.dp)
            .padding(horizontal = 6.dp, vertical = 5.dp),
        contentAlignment = Alignment.Center
    ) {
        // Steps down (to 15 sp at the least) only when a long name would not fit two lines whole —
        // a very large system font size or a narrow column.
        FitText(
            text = text,
            style = style,
            color = ParchmentText,
            textAlign = TextAlign.Center,
            maxLines = 2,
            minFontSize = TypeScale.GAME_TITLE_MIN.sp
        )
    }
}

/**
 * The same tile for a board game (Ludo stage 1, Design 1): the gold-framed portrait is painted by
 * [portrait] instead of a card thumbnail; plaque, summary and player count are identical to Khel's.
 */
@Composable
fun BoardGameTile(
    game: com.rangepatte.app.domain.board.BoardGameInfo,
    onPlayClick: () -> Unit,
    modifier: Modifier = Modifier,
    maxPortraitWidth: Dp = Dp.Unspecified,
    portrait: @Composable () -> Unit
) {
    val playLabel = stringResource(R.string.action_play)
    val (light, dark) = portraitPalettes[(game.id.ordinal + 3) % portraitPalettes.size]
    val shape = RoundedCornerShape(3.dp)
    Column(
        modifier = modifier.clickable(role = Role.Button, onClickLabel = playLabel, onClick = onPlayClick),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .widthIn(max = maxPortraitWidth).fillMaxWidth().aspectRatio(1f)
                .background(Brush.radialGradient(listOf(light, dark)), shape)
                .border(2.dp, GoldBevelDark, shape)
                .padding(3.dp)
                .border(1.dp, GoldBevelLight.copy(alpha = 0.6f), shape),
            contentAlignment = Alignment.Center
        ) {
            Box(modifier = Modifier.fillMaxSize().padding(4.dp)) { portrait() }
        }
        NamePlaque(text = stringResource(game.nameRes))
        game.altNameRes?.let { alt ->
            // The familiar name under the plaque (Moksha Patam · Snakes & Ladders).
            Text(
                text = stringResource(alt),
                style = AppType.Metadata,
                color = GoldBevelLight,
                textAlign = TextAlign.Center,
                maxLines = 1,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
        Text(
            text = stringResource(game.descriptionRes),
            style = AppType.BodyText,
            color = ParchmentTextDim,
            textAlign = TextAlign.Center,
            maxLines = 4,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = if (game.altNameRes != null) 2.dp else 6.dp)
        )
        Text(
            text = playerCountLabel(game.minPlayers, game.maxPlayers, stringResource(R.string.players_suffix)),
            style = AppType.Metadata,
            color = GoldBevelDark,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 2.dp)
        )
    }
}

/** Portrait size when a grid shows a single column. */
val ONE_COLUMN_PORTRAIT: Dp = 200.dp

/**
 * Grid columns for game tiles: by the width available, measured in "text widths" — the width divided by
 * the system font scale — so that with a very large font size the grid falls back to fewer, wider
 * columns instead of breaking game names and descriptions apart.
 */
fun gameGridColumns(width: Dp, fontScale: Float): Int {
    val textWidth = width.value / fontScale.coerceAtLeast(1f)
    return when {
        textWidth >= 900f -> 4
        textWidth >= 600f -> 3
        textWidth >= 250f -> 2
        else -> 1
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
                        modifier = Modifier.weight(1f),
                        maxPortraitWidth = if (columns == 1) ONE_COLUMN_PORTRAIT else Dp.Unspecified
                    )
                }
                repeat(columns - rowGames.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}
