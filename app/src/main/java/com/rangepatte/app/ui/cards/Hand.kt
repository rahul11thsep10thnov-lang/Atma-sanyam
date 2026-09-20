package com.rangepatte.app.ui.cards

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.rangepatte.app.domain.model.PlayingCard
import kotlinx.coroutines.delay

/**
 * A player's hand laid out as a simple, evenly-spaced row (used for the local player's cards and
 * for compact opponent displays). For a fanned arc, see [CardFan] in ui/components.
 *
 * [animateDealIn] plays a staggered "dealt across the charpai" entrance — each card fades, slides
 * up and settles its rotation in turn — rather than the whole hand appearing at once. It defaults
 * to off so existing static usages (e.g. a re-sorted hand) aren't unexpectedly re-animated.
 */
@Composable
fun Hand(
    cards: List<PlayingCard>,
    cardWidth: Dp,
    cardHeight: Dp,
    modifier: Modifier = Modifier,
    faceUp: Boolean = true,
    style: CardStyle = CardStyle.CLASSICAL_IVORY,
    selectedCardIds: Set<String> = emptySet(),
    animateDealIn: Boolean = false,
    onCardClick: ((PlayingCard) -> Unit)? = null
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        cards.forEachIndexed { index, card ->
            val cardView = @Composable {
                PlayingCardView(
                    card = card,
                    faceUp = faceUp,
                    selected = selectedCardIds.contains(card.id),
                    style = style,
                    onClick = onCardClick?.let { { it(card) } },
                    modifier = Modifier.size(width = cardWidth, height = cardHeight)
                )
            }

            if (animateDealIn) {
                val progress = remember(card.id) { Animatable(0f) }
                LaunchedEffect(card.id) {
                    delay(index * 90L)
                    progress.animateTo(1f, animationSpec = tween(320, easing = FastOutSlowInEasing))
                }
                val p = progress.value
                DealWrapper(progress = p) { cardView() }
            } else {
                cardView()
            }
        }
    }
}

@Composable
private fun DealWrapper(progress: Float, content: @Composable () -> Unit) {
    Box(
        modifier = Modifier.graphicsLayer {
            alpha = progress
            translationY = (1f - progress) * 60f
            rotationZ = (1f - progress) * -6f
        }
    ) {
        content()
    }
}
