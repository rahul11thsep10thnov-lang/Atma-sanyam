package com.rangepatte.app.ui.cards

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.ui.theme.Elevation
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.PlayingCardCornerRadius

/**
 * Renders a single [PlayingCard] face-up or face-down. This is the one place card geometry and
 * paint are decided app-wide — games must render hands through this composable (or [Hand]/[CardFan]
 * which delegate to it) rather than drawing cards themselves.
 */
@Composable
fun PlayingCardView(
    card: PlayingCard,
    modifier: Modifier = Modifier,
    faceUp: Boolean = true,
    selected: Boolean = false,
    style: CardStyle = CardStyle.CLASSICAL_IVORY,
    onClick: (() -> Unit)? = null
) {
    val palette = style.palette()
    val description = if (faceUp) cardAccessibilityLabel(card) else null

    val elevation by animateDpAsState(
        targetValue = if (selected) Elevation.CardRaised else Elevation.CardResting,
        label = "cardElevation"
    )
    val liftScale by animateFloatAsState(targetValue = if (selected) 1.08f else 1f, label = "cardLiftScale")
    val glowAlpha by animateFloatAsState(targetValue = if (selected) 1f else 0f, label = "cardGlowAlpha")

    Box(
        modifier = modifier
            .scale(liftScale)
            .shadow(elevation = elevation, shape = RoundedCornerShape(PlayingCardCornerRadius))
            .clip(RoundedCornerShape(PlayingCardCornerRadius))
            .then(
                if (glowAlpha > 0f) {
                    Modifier.border(2.dp, GoldenGlow.copy(alpha = glowAlpha), RoundedCornerShape(PlayingCardCornerRadius))
                } else Modifier
            )
            .then(
                if (onClick != null) Modifier.clickable { onClick() } else Modifier
            )
            .semantics {
                if (description != null) contentDescription = description
            }
    ) {
        if (faceUp) {
            CardFace(card = card, palette = palette)
        } else {
            CardBack(palette = palette)
        }
    }
}

private fun cardAccessibilityLabel(card: PlayingCard): String =
    "${card.rank.label} of ${card.suit.name.lowercase().replaceFirstChar { it.uppercase() }}"

/** The face of [card] in the antique royal deck, filling its parent (which should keep the card's proportions). */
@Composable
internal fun CardFace(card: PlayingCard, palette: CardPalette, modifier: Modifier = Modifier) {
    val measurer = rememberTextMeasurer()
    Canvas(modifier = modifier.fillMaxSize()) {
        drawAntiqueCard(card, Offset.Zero, size, measurer, palette)
    }
}
