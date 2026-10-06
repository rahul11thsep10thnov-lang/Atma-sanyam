package com.rangepatte.app.game.common

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.ui.cards.CardBack
import com.rangepatte.app.ui.cards.CardStyle
import com.rangepatte.app.ui.cards.palette
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.thumbnails.CARD_ASPECT
import com.rangepatte.app.ui.thumbnails.drawJokerCard
import com.rangepatte.app.ui.thumbnails.drawMiniCard

/** One shared text measurer for every card on a table (provided by [GameFrame]) — hundreds of cards, one cache. */
val LocalCardTextMeasurer = staticCompositionLocalOf<TextMeasurer?> { null }

private val cardPalette = CardStyle.CLASSICAL_IVORY.palette()

/**
 * The one composable every game uses to show a card, at any size: the caller sets the width, the
 * height follows the real card proportions. It draws the same antique ivory card as the thumbnails.
 *
 * - [faceDown] shows the mandala card back.
 * - [inlineIndex] puts the rank and suit side by side so a card still reads when only its top strip
 *   is visible in an overlapping column.
 * - [selected] adds a gold border; [dimmed] fades the card (e.g. cards that can't be played now).
 * - [isJoker] draws a printed Joker instead of [card].
 */
@Composable
fun CardView(
    card: PlayingCard?,
    modifier: Modifier = Modifier,
    faceDown: Boolean = false,
    selected: Boolean = false,
    dimmed: Boolean = false,
    inlineIndex: Boolean = false,
    isJoker: Boolean = false,
    onClick: (() -> Unit)? = null
) {
    val measurer = LocalCardTextMeasurer.current ?: rememberTextMeasurer()
    val shape = RoundedCornerShape(5.dp)
    Box(
        modifier = modifier
            .aspectRatio(1f / CARD_ASPECT)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
    ) {
        if (faceDown) {
            Box(modifier = Modifier.fillMaxSize().clip(shape)) { CardBack(palette = cardPalette) }
        } else {
            Canvas(modifier = Modifier.fillMaxSize()) {
                if (isJoker) {
                    drawJokerCard(Offset.Zero, size, measurer, cardPalette)
                } else {
                    drawMiniCard(card, Offset.Zero, size, measurer, cardPalette, inlineIndex)
                }
            }
        }
        if (dimmed) {
            // Darken rather than fade, so the cards underneath in an overlapping hand don't show through.
            Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.45f), shape))
        }
        if (selected) {
            Box(modifier = Modifier.fillMaxSize().border(2.dp, GoldenGlow, shape))
        }
    }
}

/** An empty pile position: a faint dashed-looking gold outline, optionally tappable (e.g. an empty column). */
@Composable
fun CardSlot(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable BoxScope.() -> Unit = {}
) {
    Box(
        modifier = modifier
            .aspectRatio(1f / CARD_ASPECT)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawRoundRect(
                color = Color(0x55E8C77A),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(5.dp.toPx()),
                style = Stroke(width = 1.5.dp.toPx())
            )
        }
        content()
    }
}
