package com.rangepatte.app.ui.cards

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.domain.model.PlayingCard
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

    Box(
        modifier = modifier
            .shadow(
                elevation = if (selected) 8.dp else 2.dp,
                shape = RoundedCornerShape(PlayingCardCornerRadius)
            )
            .clip(RoundedCornerShape(PlayingCardCornerRadius))
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

@Composable
internal fun CardFace(card: PlayingCard, palette: CardPalette, modifier: Modifier = Modifier) {
    val ink = if (card.isRed) palette.redInk else palette.blackInk

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(palette.faceColor, RoundedCornerShape(PlayingCardCornerRadius))
            .border(1.dp, palette.borderColor, RoundedCornerShape(PlayingCardCornerRadius))
            .padding(4.dp)
    ) {
        // Ornamental inner border — a restrained double-rule frame rather than an image asset.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .border(0.5.dp, palette.borderColor.copy(alpha = 0.6f), RoundedCornerShape(6.dp))
        )

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

        Text(
            text = card.suit.symbol,
            color = ink,
            fontSize = 26.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.align(Alignment.Center)
        )

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
