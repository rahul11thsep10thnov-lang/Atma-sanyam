package com.rangepatte.app.ui.cards

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.rangepatte.app.domain.model.PlayingCard

/**
 * A player's hand laid out as a simple, evenly-spaced row (used for the local player's cards and
 * for compact opponent displays). For a fanned arc, see [CardFan] in ui/components.
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
    onCardClick: ((PlayingCard) -> Unit)? = null
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        cards.forEach { card ->
            PlayingCardView(
                card = card,
                faceUp = faceUp,
                selected = selectedCardIds.contains(card.id),
                style = style,
                onClick = onCardClick?.let { { it(card) } },
                modifier = Modifier.size(width = cardWidth, height = cardHeight)
            )
        }
    }
}
