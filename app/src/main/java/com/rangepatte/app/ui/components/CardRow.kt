package com.rangepatte.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.ui.cards.CardStyle
import com.rangepatte.app.ui.cards.PlayingCardView

/**
 * A lightweight, non-interactive row of cards — used for discard piles, played tricks, or a
 * grouped set within a sorted hand (e.g. one Rummy meld). For a selectable player hand, use
 * [com.rangepatte.app.ui.cards.Hand] instead.
 */
@Composable
fun CardRow(
    cards: List<PlayingCard>,
    cardWidth: Dp,
    cardHeight: Dp,
    modifier: Modifier = Modifier,
    faceUp: Boolean = true,
    style: CardStyle = CardStyle.CLASSICAL_IVORY,
    spacing: Dp = 4.dp
) {
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(spacing)) {
        cards.forEach { card ->
            PlayingCardView(
                card = card,
                faceUp = faceUp,
                style = style,
                modifier = Modifier.size(width = cardWidth, height = cardHeight)
            )
        }
    }
}
