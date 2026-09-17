package com.rangepatte.app.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.ui.cards.CardStyle
import com.rangepatte.app.ui.cards.PlayingCardView

/**
 * A fanned, overlapping display of cards — used for opponent hands and decorative flourishes where
 * a full-width [com.rangepatte.app.ui.cards.Hand] row would not fit.
 */
@Composable
fun CardFan(
    cards: List<PlayingCard>,
    cardWidth: Dp,
    cardHeight: Dp,
    modifier: Modifier = Modifier,
    faceUp: Boolean = false,
    style: CardStyle = CardStyle.CLASSICAL_IVORY,
    overlap: Dp = cardWidth * 0.55f
) {
    val totalWidth = if (cards.isEmpty()) cardWidth else cardWidth + overlap * (cards.size - 1)

    Box(modifier = modifier.size(width = totalWidth, height = cardHeight)) {
        cards.forEachIndexed { index, card ->
            Box(
                modifier = Modifier
                    .offset(x = overlap * index)
                    .size(width = cardWidth, height = cardHeight)
            ) {
                PlayingCardView(
                    card = card,
                    faceUp = faceUp,
                    style = style,
                    modifier = Modifier.size(width = cardWidth, height = cardHeight)
                )
            }
        }
    }
}
