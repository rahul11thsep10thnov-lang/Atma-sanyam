package com.rangepatte.app.ui.thumbnails

import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.ui.cards.CardPalette
import com.rangepatte.app.ui.cards.drawFaceCrest
import com.rangepatte.app.ui.cards.drawSuitMotif

/** Height ÷ width of every playing card in the app. */
internal const val CARD_ASPECT = 1.42f

private val faceRanks = setOf(Rank.JACK, Rank.QUEEN, Rank.KING)

/**
 * Draws one antique ivory card — gold border, thin inner frame, corner index, and the same Indian
 * suit motif / royal crest the full-size [com.rangepatte.app.ui.cards.PlayingCardView] uses — at any
 * size, entirely from proportions of [cardSize] so it stays crisp in small game thumbnails.
 *
 * [card] null draws a blank card (used for the edges of a stacked pile).
 * [inlineIndex] puts rank and suit side by side ("K♠") for cascades where only a thin top strip
 * of each card shows; otherwise the suit sits under the rank, as on a real card.
 */
internal fun DrawScope.drawMiniCard(
    card: PlayingCard?,
    topLeft: Offset,
    cardSize: Size,
    textMeasurer: TextMeasurer,
    palette: CardPalette,
    inlineIndex: Boolean = false
) {
    val w = cardSize.width
    val corner = CornerRadius(w * 0.09f)

    // Soft drop shadow, then the aged-ivory face, gold border and the thin inner frame.
    drawRoundRect(Color.Black.copy(alpha = 0.35f), topLeft + Offset(w * 0.03f, w * 0.05f), cardSize, corner)
    drawRoundRect(
        brush = Brush.verticalGradient(
            listOf(palette.faceColor, lerp(palette.faceColor, palette.frameInnerColor, 0.18f)),
            startY = topLeft.y,
            endY = topLeft.y + cardSize.height
        ),
        topLeft = topLeft,
        size = cardSize,
        cornerRadius = corner
    )
    drawRoundRect(palette.borderColor, topLeft, cardSize, corner, style = Stroke(width = w * 0.035f))
    val inset = w * 0.07f
    drawRoundRect(
        color = palette.frameInnerColor.copy(alpha = 0.55f),
        topLeft = topLeft + Offset(inset, inset),
        size = Size(w - inset * 2, cardSize.height - inset * 2),
        cornerRadius = CornerRadius(w * 0.05f),
        style = Stroke(width = w * 0.012f)
    )
    if (card == null) return

    val ink = if (card.isRed) palette.redInk else palette.blackInk
    val rankPx = w * if (card.rank.label.length > 1) 0.25f else 0.29f
    val rankLayout = textMeasurer.measure(
        text = card.rank.label,
        style = TextStyle(color = ink, fontSize = rankPx.toSp(), fontWeight = FontWeight.Bold, fontFamily = FontFamily.Serif)
    )
    val suitLayout = textMeasurer.measure(
        text = card.suit.symbol,
        style = TextStyle(color = ink, fontSize = (w * 0.24f).toSp(), fontFamily = FontFamily.Serif)
    )
    val indexOrigin = topLeft + Offset(w * 0.1f, w * 0.03f)
    drawText(rankLayout, topLeft = indexOrigin)
    if (inlineIndex) {
        drawText(suitLayout, topLeft = indexOrigin + Offset(rankLayout.size.width + w * 0.03f, w * 0.02f))
    } else {
        drawText(suitLayout, topLeft = indexOrigin + Offset(w * 0.01f, rankLayout.size.height * 0.78f))
    }

    val center = topLeft + Offset(w / 2f, cardSize.height * 0.56f)
    when {
        card.rank in faceRanks -> drawFaceCrest(card.rank, center, w * 0.28f, palette.faceCardAccent)
        card.rank == Rank.ACE -> drawSuitMotif(card.suit, center, w * 0.33f, ink)
        else -> drawSuitMotif(card.suit, center, w * 0.22f, ink)
    }
}

/** A printed Joker: blank ivory card with a crimson star and the word JOKER, at any size. */
internal fun DrawScope.drawJokerCard(
    topLeft: Offset,
    cardSize: Size,
    textMeasurer: TextMeasurer,
    palette: CardPalette
) {
    drawMiniCard(card = null, topLeft = topLeft, cardSize = cardSize, textMeasurer = textMeasurer, palette = palette)
    val w = cardSize.width
    val center = topLeft + Offset(w / 2f, cardSize.height * 0.5f)
    val outer = w * 0.3f
    val inner = outer * 0.42f
    val star = androidx.compose.ui.graphics.Path().apply {
        for (i in 0 until 10) {
            val radius = if (i % 2 == 0) outer else inner
            val angle = Math.toRadians(-90.0 + 36.0 * i)
            val x = center.x + (radius * kotlin.math.cos(angle)).toFloat()
            val y = center.y + (radius * kotlin.math.sin(angle)).toFloat()
            if (i == 0) moveTo(x, y) else lineTo(x, y)
        }
        close()
    }
    drawPath(star, color = palette.redInk)
    val label = textMeasurer.measure(
        text = "JOKER",
        style = TextStyle(
            color = palette.redInk,
            fontSize = (w * 0.16f).toSp(),
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Serif
        )
    )
    drawText(label, topLeft = Offset(topLeft.x + (w - label.size.width) / 2f, topLeft.y + cardSize.height * 0.12f))
}
