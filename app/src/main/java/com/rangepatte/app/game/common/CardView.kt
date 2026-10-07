package com.rangepatte.app.game.common

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.cards.CARD_CORNER
import com.rangepatte.app.ui.cards.drawRoyalCardBack
import com.rangepatte.app.domain.model.PlayingCard
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
 * height follows the real card proportions. It draws the antique royal-deck card (see
 * `ui/cards/AntiqueCard.kt`), so every game, every size and every thumbnail share one look.
 *
 * - [faceDown] shows the burgundy-and-gold royal card back.
 * - [inlineIndex] puts the rank and suit side by side so a card still reads when only its top strip
 *   is visible in an overlapping column.
 * - [selected] raises the card a little with a warm gold glow; [dimmed] darkens it (e.g. cards that
 *   can't be played now).
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
    val raise by animateFloatAsState(targetValue = if (selected) 1f else 0f, animationSpec = tween(140), label = "cardRaise")
    Canvas(
        modifier = modifier
            .aspectRatio(1f / CARD_ASPECT)
            .graphicsLayer { translationY = -raise * size.height * SelectionLift }
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
    ) {
        val corner = CornerRadius(size.width * CARD_CORNER)
        if (raise > 0f) {
            // A warm glow under a lifted card.
            for (i in 3 downTo 1) {
                val grow = size.width * 0.03f * i
                drawRoundRect(
                    GoldenGlow.copy(alpha = 0.10f * raise),
                    Offset(-grow, -grow), Size(size.width + grow * 2, size.height + grow * 2),
                    CornerRadius(size.width * CARD_CORNER + grow)
                )
            }
        }
        when {
            faceDown -> drawRoyalCardBack(Offset.Zero, size)
            isJoker -> drawJokerCard(Offset.Zero, size, measurer, cardPalette)
            else -> drawMiniCard(card, Offset.Zero, size, measurer, cardPalette, inlineIndex)
        }
        if (dimmed) {
            // Darken rather than fade, so the cards underneath in an overlapping hand don't show through.
            drawRoundRect(Color.Black.copy(alpha = 0.42f), Offset.Zero, size, corner)
        }
        if (raise > 0f) {
            drawRoundRect(GoldenGlow.copy(alpha = raise), Offset.Zero, size, corner, style = Stroke(width = size.width * 0.035f))
        }
    }
}

/** How far a selected card rises, as a fraction of its height — callers reserve this much headroom. */
const val SelectionLift = 0.1f

/** The headroom a caller should leave above cards of this [cardWidth] so a lifted card is not clipped. */
fun selectionHeadroom(cardWidth: Dp): Dp = cardWidth * CARD_ASPECT * SelectionLift

/** An empty pile position: a shallow recess in the wood with a dashed gold outline, optionally tappable. */
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
            val corner = CornerRadius(size.width * CARD_CORNER)
            drawRoundRect(Color.Black.copy(alpha = 0.22f), cornerRadius = corner)
            drawRoundRect(
                color = Color(0x88E8C77A),
                cornerRadius = corner,
                style = Stroke(
                    width = 1.5.dp.toPx(),
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(5.dp.toPx(), 4.dp.toPx()))
                )
            )
        }
        content()
    }
}
