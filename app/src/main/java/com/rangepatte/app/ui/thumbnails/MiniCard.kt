package com.rangepatte.app.ui.thumbnails

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.text.TextMeasurer
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.ui.cards.CardPalette
import com.rangepatte.app.ui.cards.drawAntiqueCard
import com.rangepatte.app.ui.cards.drawAntiqueJoker

/** Height ÷ width of every playing card in the app. */
internal const val CARD_ASPECT = 1.42f

/**
 * Draws one card of the antique royal deck at any size (see [drawAntiqueCard]); the full-size card
 * views and the game thumbnails share it, so every card in the app looks like it came from one deck.
 */
internal fun DrawScope.drawMiniCard(
    card: PlayingCard?,
    topLeft: Offset,
    cardSize: Size,
    textMeasurer: TextMeasurer,
    palette: CardPalette,
    inlineIndex: Boolean = false
) = drawAntiqueCard(card, topLeft, cardSize, textMeasurer, palette, inlineIndex)

/** A printed Joker of the same deck. */
internal fun DrawScope.drawJokerCard(
    topLeft: Offset,
    cardSize: Size,
    textMeasurer: TextMeasurer,
    palette: CardPalette
) = drawAntiqueJoker(topLeft, cardSize, textMeasurer, palette)
