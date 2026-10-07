package com.rangepatte.app.ui.cards

import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.domain.model.Rank
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

private val FaceTop = Color(0xFFF8EDD2)
private val FaceBottom = Color(0xFFEAD8B0)
private val Foxing = Color(0xFF9A6B2F)
private val BorderGold = Color(0xFFD2AC52)
private val BorderGoldDark = Color(0xFF8F6A28)
private val Rule = Color(0xFF8A6A33)

/** Corner radius of every card, as a fraction of its width. */
internal const val CARD_CORNER = 0.105f

/**
 * Draws a playing card of the antique royal deck at any size, from proportions of [cardSize] alone:
 * aged ivory with a hint of paper grain and darkened edges, a gold border with a fine inner rule,
 * large corner indices (mirrored at the opposite corner), and then — by rank — a full pip layout for
 * 2–10, a grand medallion for the Ace, or the double-ended royal portrait for K, Q and J.
 *
 * [card] null draws a blank face (the edges of stacked piles). [inlineIndex] puts rank and suit side by
 * side in the top corner only, so a card still reads when only its top strip shows in a cascade.
 */
internal fun DrawScope.drawAntiqueCard(
    card: PlayingCard?,
    topLeft: Offset,
    cardSize: Size,
    textMeasurer: TextMeasurer,
    palette: CardPalette,
    inlineIndex: Boolean = false
) {
    val w = cardSize.width
    val h = cardSize.height
    val corner = CornerRadius(w * CARD_CORNER)
    val shape = Path().apply { addRoundRect(RoundRect(Rect(topLeft, cardSize), corner)) }

    // Soft shadow, so the card sits on the wood rather than floating on it.
    drawRoundRect(Color.Black.copy(alpha = 0.22f), topLeft + Offset(w * 0.025f, w * 0.045f), cardSize, corner)
    drawRoundRect(Color.Black.copy(alpha = 0.28f), topLeft + Offset(w * 0.01f, w * 0.02f), cardSize, corner)

    // Aged ivory.
    drawRoundRect(
        brush = Brush.verticalGradient(listOf(FaceTop, FaceBottom), startY = topLeft.y, endY = topLeft.y + h),
        topLeft = topLeft, size = cardSize, cornerRadius = corner
    )
    clipPath(shape) {
        // Edges are a little darker where thumbs have held the card for years.
        drawRoundRect(Foxing.copy(alpha = 0.05f), topLeft, cardSize, corner, style = Stroke(w * 0.17f))
        drawRoundRect(Foxing.copy(alpha = 0.07f), topLeft, cardSize, corner, style = Stroke(w * 0.09f))
        drawRoundRect(Foxing.copy(alpha = 0.09f), topLeft, cardSize, corner, style = Stroke(w * 0.04f))
        // Paper grain: a scatter of tiny flecks and two faint fibres, steady for each card.
        val random = Random((card?.id?.hashCode() ?: 17) * 31 + 7)
        repeat(16) {
            val x = topLeft.x + w * (0.08f + random.nextFloat() * 0.84f)
            val y = topLeft.y + h * (0.05f + random.nextFloat() * 0.9f)
            drawCircle(Foxing.copy(alpha = 0.05f + random.nextFloat() * 0.06f), w * (0.004f + random.nextFloat() * 0.008f), Offset(x, y))
        }
        repeat(2) {
            val x = topLeft.x + w * (0.1f + random.nextFloat() * 0.8f)
            val y = topLeft.y + h * (0.1f + random.nextFloat() * 0.8f)
            drawLine(Foxing.copy(alpha = 0.06f), Offset(x, y), Offset(x + w * 0.12f, y + w * 0.03f), strokeWidth = w * 0.006f)
        }
    }

    // Gold border, and a fine inner rule with a tiny jewel at each corner.
    drawRoundRect(
        brush = Brush.linearGradient(listOf(BorderGold, BorderGoldDark, BorderGold), start = topLeft, end = topLeft + Offset(w, h)),
        topLeft = topLeft, size = cardSize, cornerRadius = corner, style = Stroke(width = w * 0.034f)
    )
    val inset = w * 0.07f
    val inner = Rect(topLeft.x + inset, topLeft.y + inset, topLeft.x + w - inset, topLeft.y + h - inset)
    drawRoundRect(Rule.copy(alpha = 0.6f), inner.topLeft, inner.size, CornerRadius(w * 0.05f), style = Stroke(w * 0.011f))
    listOf(inner.topLeft, inner.topRight, inner.bottomLeft, inner.bottomRight).forEach {
        drawCircle(BorderGold, w * 0.014f, it)
    }
    if (card == null) return

    val ink = if (card.isRed) palette.redInk else palette.blackInk
    when {
        hasPortrait(card.rank) -> drawRoyalPortraitPanel(card.rank, card.suit, topLeft, cardSize, ink)
        card.rank == Rank.ACE -> drawAceMedallion(card, topLeft, cardSize, ink)
        else -> drawPips(card, topLeft, cardSize, ink)
    }
    // Indices go on last so they are never covered by artwork.
    drawIndex(card, topLeft, cardSize, textMeasurer, ink, inlineIndex)
    if (!inlineIndex && h > 0f) {
        rotate(180f, pivot = Offset(topLeft.x + w / 2f, topLeft.y + h / 2f)) {
            drawIndex(card, topLeft, cardSize, textMeasurer, ink, inline = false)
        }
    }
}

/** Rank and suit in a corner. */
private fun DrawScope.drawIndex(
    card: PlayingCard,
    topLeft: Offset,
    cardSize: Size,
    textMeasurer: TextMeasurer,
    ink: Color,
    inline: Boolean
) {
    val w = cardSize.width
    val rankPx = w * if (card.rank.label.length > 1) 0.235f else 0.285f
    val layout = textMeasurer.measure(
        text = card.rank.label,
        style = TextStyle(
            color = ink, fontSize = rankPx.toSp(), fontWeight = FontWeight.Bold, fontFamily = FontFamily.Serif,
            letterSpacing = if (card.rank.label.length > 1) (-0.04f * rankPx).toSp() else androidx.compose.ui.unit.TextUnit.Unspecified
        )
    )
    val origin = topLeft + Offset(w * 0.085f, w * 0.02f)
    drawText(layout, topLeft = origin)
    val pipRadius = w * 0.07f
    if (inline) {
        drawSuitPip(card.suit, Offset(origin.x + layout.size.width + pipRadius * 1.35f, origin.y + layout.size.height * 0.56f), pipRadius, ink)
    } else {
        val cx = origin.x + layout.size.width / 2f
        drawSuitPip(card.suit, Offset(cx, origin.y + layout.size.height + pipRadius * 0.95f), pipRadius, ink)
    }
}

private val leftCol = 0.375f
private val centerCol = 0.5f
private val rightCol = 0.625f
private val rows4 = listOf(0.25f, 0.4167f, 0.5833f, 0.75f)
private val rows3 = listOf(0.25f, 0.5f, 0.75f)

private fun pipLayout(value: Int): List<Offset> {
    fun col(x: Float, ys: List<Float>) = ys.map { Offset(x, it) }
    val sides = fun(rows: List<Float>) = col(leftCol, rows) + col(rightCol, rows)
    return when (value) {
        2 -> col(centerCol, listOf(0.25f, 0.75f))
        3 -> col(centerCol, rows3)
        4 -> sides(listOf(0.25f, 0.75f))
        5 -> sides(listOf(0.25f, 0.75f)) + Offset(centerCol, 0.5f)
        6 -> sides(rows3)
        7 -> sides(rows3) + Offset(centerCol, 0.375f)
        8 -> sides(rows3) + col(centerCol, listOf(0.375f, 0.625f))
        9 -> sides(rows4) + Offset(centerCol, 0.5f)
        10 -> sides(rows4) + col(centerCol, listOf(0.3333f, 0.6667f))
        else -> emptyList()
    }
}

private fun DrawScope.drawPips(card: PlayingCard, topLeft: Offset, cardSize: Size, ink: Color) {
    val w = cardSize.width
    val h = cardSize.height
    val positions = pipLayout(card.rank.value)
    val radius = w * when {
        positions.size <= 3 -> 0.135f
        positions.size <= 6 -> 0.105f
        else -> 0.088f
    }
    // Kept upright all over: a suit must never be misread, so no inverted pips.
    positions.forEach { p ->
        drawSuitPip(card.suit, Offset(topLeft.x + p.x * w, topLeft.y + p.y * h), radius, ink)
    }
}

/** The Ace: one grand suit symbol set in a gold medallion ring. */
private fun DrawScope.drawAceMedallion(card: PlayingCard, topLeft: Offset, cardSize: Size, ink: Color) {
    val w = cardSize.width
    val center = Offset(topLeft.x + w / 2f, topLeft.y + cardSize.height / 2f)
    val ring = w * 0.34f
    drawCircle(BorderGold.copy(alpha = 0.16f), ring, center)
    drawCircle(BorderGold, ring, center, style = Stroke(w * 0.014f))
    drawCircle(BorderGoldDark.copy(alpha = 0.7f), ring * 0.9f, center, style = Stroke(w * 0.006f))
    for (i in 0 until 16) {
        val a = (2 * Math.PI / 16 * i).toFloat()
        drawCircle(BorderGold, w * 0.011f, Offset(center.x + cos(a) * ring * 1.12f, center.y + sin(a) * ring * 1.12f))
    }
    drawSuitPip(card.suit, center, w * 0.235f, ink)
}

/** A printed Joker: blank ivory card with a crimson star and the word JOKER, at any size. */
internal fun DrawScope.drawAntiqueJoker(
    topLeft: Offset,
    cardSize: Size,
    textMeasurer: TextMeasurer,
    palette: CardPalette
) {
    drawAntiqueCard(card = null, topLeft = topLeft, cardSize = cardSize, textMeasurer = textMeasurer, palette = palette)
    val w = cardSize.width
    val center = Offset(topLeft.x + w / 2f, topLeft.y + cardSize.height * 0.5f)
    drawCircle(BorderGold.copy(alpha = 0.18f), w * 0.36f, center)
    drawCircle(BorderGold, w * 0.36f, center, style = Stroke(w * 0.014f))
    val outer = w * 0.3f
    val inner = outer * 0.42f
    val star = Path().apply {
        for (i in 0 until 12) {
            val radius = if (i % 2 == 0) outer else inner
            val angle = Math.toRadians(-90.0 + 30.0 * i)
            val x = center.x + (radius * cos(angle)).toFloat()
            val y = center.y + (radius * sin(angle)).toFloat()
            if (i == 0) moveTo(x, y) else lineTo(x, y)
        }
        close()
    }
    drawPath(star, color = palette.redInk)
    drawCircle(Color(0xFFF3E7CB), inner * 0.7f, center)
    drawCircle(BorderGold, inner * 0.7f, center, style = Stroke(w * 0.012f))
    val label = textMeasurer.measure(
        text = "JOKER",
        style = TextStyle(color = palette.redInk, fontSize = (w * 0.15f).toSp(), fontWeight = FontWeight.Bold, fontFamily = FontFamily.Serif)
    )
    drawText(label, topLeft = Offset(topLeft.x + (w - label.size.width) / 2f, topLeft.y + cardSize.height * 0.1f))
    rotate(180f, pivot = Offset(topLeft.x + w / 2f, topLeft.y + cardSize.height / 2f)) {
        drawText(label, topLeft = Offset(topLeft.x + (w - label.size.width) / 2f, topLeft.y + cardSize.height * 0.1f))
    }
}

/**
 * The back of every card in the collection: a burgundy ground, antique-gold borders, a lotus
 * medallion at the centre and small lotus buds at the corners — the same in every game.
 */
internal fun DrawScope.drawRoyalCardBack(topLeft: Offset, cardSize: Size) {
    val w = cardSize.width
    val h = cardSize.height
    val corner = CornerRadius(w * CARD_CORNER)
    val shape = Path().apply { addRoundRect(RoundRect(Rect(topLeft, cardSize), corner)) }
    val center = Offset(topLeft.x + w / 2f, topLeft.y + h / 2f)
    val gold = Color(0xFFDDB75C)
    val goldDim = Color(0xFFB08A3A)

    drawRoundRect(Color.Black.copy(alpha = 0.22f), topLeft + Offset(w * 0.025f, w * 0.045f), cardSize, corner)
    drawRoundRect(Color.Black.copy(alpha = 0.28f), topLeft + Offset(w * 0.01f, w * 0.02f), cardSize, corner)
    drawRoundRect(
        brush = Brush.radialGradient(listOf(Color(0xFF8A1C2D), Color(0xFF5A0F1C), Color(0xFF3F0912)), center = center, radius = h * 0.75f),
        topLeft = topLeft, size = cardSize, cornerRadius = corner
    )
    clipPath(shape) {
        // A band of small gold diamonds round the edge, like a woven border.
        val band = w * 0.115f
        val step = w * 0.085f
        var x = topLeft.x + band
        while (x < topLeft.x + w - band * 0.5f) {
            diamondDot(Offset(x, topLeft.y + band), w * 0.02f, goldDim)
            diamondDot(Offset(x, topLeft.y + h - band), w * 0.02f, goldDim)
            x += step
        }
        var y = topLeft.y + band
        while (y < topLeft.y + h - band * 0.5f) {
            diamondDot(Offset(topLeft.x + band, y), w * 0.02f, goldDim)
            diamondDot(Offset(topLeft.x + w - band, y), w * 0.02f, goldDim)
            y += step
        }
        // Corner buds.
        listOf(
            Offset(topLeft.x + w * 0.2f, topLeft.y + w * 0.2f), Offset(topLeft.x + w * 0.8f, topLeft.y + w * 0.2f),
            Offset(topLeft.x + w * 0.2f, topLeft.y + h - w * 0.2f), Offset(topLeft.x + w * 0.8f, topLeft.y + h - w * 0.2f)
        ).forEach { lotus(it, w * 0.085f, 6, gold, Color(0xFF8A1C2D)) }
        // Small diamonds above and below the medallion.
        listOf(0.17f, 0.83f).forEach { diamondDot(Offset(center.x, topLeft.y + h * it), w * 0.045f, gold) }
    }
    drawRoundRect(
        brush = Brush.linearGradient(listOf(gold, BorderGoldDark, gold), start = topLeft, end = topLeft + Offset(w, h)),
        topLeft = topLeft, size = cardSize, cornerRadius = corner, style = Stroke(width = w * 0.034f)
    )
    val inset = w * 0.07f
    drawRoundRect(gold.copy(alpha = 0.8f), topLeft + Offset(inset, inset), Size(w - inset * 2, h - inset * 2), CornerRadius(w * 0.05f), style = Stroke(w * 0.012f))
    val inset2 = w * 0.1f
    drawRoundRect(goldDim.copy(alpha = 0.7f), topLeft + Offset(inset2, inset2), Size(w - inset2 * 2, h - inset2 * 2), CornerRadius(w * 0.04f), style = Stroke(w * 0.006f))

    // Central lotus medallion.
    val medal = w * 0.3f
    drawCircle(Color(0xFF3F0912), medal * 1.05f, center)
    drawCircle(gold, medal * 1.05f, center, style = Stroke(w * 0.016f))
    drawCircle(goldDim, medal * 0.95f, center, style = Stroke(w * 0.006f))
    lotus(center, medal * 0.9f, 12, gold, Color(0xFF7A1626))
    lotus(center, medal * 0.52f, 8, gold, Color(0xFF9A2234))
    drawCircle(gold, medal * 0.16f, center)
    drawCircle(Color(0xFFB3182A), medal * 0.09f, center)
}

private fun DrawScope.diamondDot(c: Offset, r: Float, color: Color) {
    val p = Path().apply {
        moveTo(c.x, c.y - r); lineTo(c.x + r * 0.7f, c.y); lineTo(c.x, c.y + r); lineTo(c.x - r * 0.7f, c.y); close()
    }
    drawPath(p, color)
}

/** A lotus rosette of [petals] pointed petals reaching [radius] from [c]. */
private fun DrawScope.lotus(c: Offset, radius: Float, petals: Int, line: Color, fill: Color) {
    for (i in 0 until petals) {
        val a = (2 * Math.PI / petals * i - Math.PI / 2).toFloat()
        val tip = Offset(c.x + cos(a) * radius, c.y + sin(a) * radius)
        val side = (Math.PI / petals).toFloat() * 0.9f
        val l = Offset(c.x + cos(a - side) * radius * 0.62f, c.y + sin(a - side) * radius * 0.62f)
        val r = Offset(c.x + cos(a + side) * radius * 0.62f, c.y + sin(a + side) * radius * 0.62f)
        val petal = Path().apply {
            moveTo(c.x, c.y)
            quadraticTo(l.x, l.y, tip.x, tip.y)
            quadraticTo(r.x, r.y, c.x, c.y)
            close()
        }
        drawPath(petal, fill)
        drawPath(petal, line, style = Stroke(radius * 0.045f, cap = StrokeCap.Round))
    }
}
