package com.rangepatte.app.ui.cards

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
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

private val faceCardRanks = setOf(Rank.JACK, Rank.QUEEN, Rank.KING)

@Composable
internal fun CardFace(card: PlayingCard, palette: CardPalette, modifier: Modifier = Modifier) {
    val ink = if (card.isRed) palette.redInk else palette.blackInk
    val agedParchment = Brush.radialGradient(
        colors = listOf(palette.faceColor, palette.faceColor.copy(alpha = 0.85f)),
        radius = 220f
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(agedParchment, RoundedCornerShape(PlayingCardCornerRadius))
            .border(1.25.dp, palette.borderColor, RoundedCornerShape(PlayingCardCornerRadius))
            .padding(3.dp)
    ) {
        // Antique double-rule frame with small corner flourishes — drawn, not an image asset.
        Canvas(modifier = Modifier.fillMaxSize()) {
            val inset = 3.dp.toPx()
            drawRoundRect(
                color = palette.frameInnerColor.copy(alpha = 0.7f),
                topLeft = Offset(inset, inset),
                size = Size(size.width - inset * 2, size.height - inset * 2),
                cornerRadius = CornerRadius(6.dp.toPx()),
                style = Stroke(width = 0.6.dp.toPx())
            )
            val flourish = 7.dp.toPx()
            val margin = inset + 3.dp.toPx()
            drawCornerFlourish(Offset(margin, margin), flourish, palette.frameInnerColor, mirrorX = false, mirrorY = false)
            drawCornerFlourish(Offset(size.width - margin, margin), flourish, palette.frameInnerColor, mirrorX = true, mirrorY = false)
            drawCornerFlourish(Offset(margin, size.height - margin), flourish, palette.frameInnerColor, mirrorX = false, mirrorY = true)
            drawCornerFlourish(Offset(size.width - margin, size.height - margin), flourish, palette.frameInnerColor, mirrorX = true, mirrorY = true)
        }

        Text(
            text = card.rank.label,
            color = ink,
            fontWeight = FontWeight.Bold,
            fontSize = 13.sp,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(start = 6.dp, top = 4.dp)
        )
        Text(
            text = card.suit.symbol,
            color = ink,
            fontSize = 11.sp,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(start = 6.dp, top = 18.dp)
        )

        if (card.rank in faceCardRanks) {
            FaceCardCrest(
                rank = card.rank,
                color = palette.faceCardAccent,
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(26.dp)
            )
        } else {
            SuitMotif(
                suit = card.suit,
                color = ink,
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(24.dp)
            )
        }

        Text(
            text = card.rank.label,
            color = ink,
            fontWeight = FontWeight.Bold,
            fontSize = 13.sp,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 6.dp, bottom = 4.dp)
        )
        Text(
            text = card.suit.symbol,
            color = ink,
            fontSize = 11.sp,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 6.dp, bottom = 18.dp)
        )
    }
}
