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

private val FaceTop = Color(0xFFFFFFFF)
private val FaceBottom = Color(0xFFF4F2EC)
private val Edge = Color(0xFF9C9A94)
private val BorderGold = Color(0xFFD2AC52)
private val BorderGoldDark = Color(0xFF8F6A28)

/** Corner radius of every card, as a fraction of its width. */
internal const val CARD_CORNER = 0.085f

/**
 * Draws a playing card at any size, from proportions of [cardSize] alone. The base is the classic
 * standard deck — bright white stock, a hairline edge, bold corner indices (mirrored at the opposite
 * corner), the traditional pip layout with the lower half printed upside-down, a big single pip for the
 * Ace and a framed double-ended court figure for K, Q and J — with the royal court touches kept small:
 * a fine gold inner line and a gold ring round the Ace.
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

    // Soft shadow, so the card sits on the table rather than floating on it.
    drawRoundRect(Color.Black.copy(alpha = 0.2f), topLeft + Offset(w * 0.025f, w * 0.045f), cardSize, corner)
    drawRoundRect(Color.Black.copy(alpha = 0.26f), topLeft + Offset(w * 0.01f, w * 0.02f), cardSize, corner)

    // White card stock with the faintest sheen.
    drawRoundRect(
        brush = Brush.verticalGradient(listOf(FaceTop, FaceBottom), startY = topLeft.y, endY = topLeft.y + h),
        topLeft = topLeft, size = cardSize, cornerRadius = corner
    )
    drawRoundRect(Edge, topLeft, cardSize, corner, style = Stroke(width = maxOf(1f, w * 0.012f)))
    // The royal touch: a fine gold line just inside the edge.
    val inset = w * 0.035f
    drawRoundRect(
        BorderGold.copy(alpha = 0.85f), topLeft + Offset(inset, inset), Size(w - inset * 2, h - inset * 2),
        CornerRadius(w * (CARD_CORNER - 0.03f)), style = Stroke(maxOf(0.8f, w * 0.008f))
    )
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
    val rankPx = w * if (card.rank.label.length > 1) 0.2f else 0.245f
    val layout = textMeasurer.measure(
        text = card.rank.label,
        style = TextStyle(
            color = ink, fontSize = rankPx.toSp(), fontWeight = FontWeight.Bold, fontFamily = FontFamily.Serif,
            letterSpacing = if (card.rank.label.length > 1) (-0.04f * rankPx).toSp() else androidx.compose.ui.unit.TextUnit.Unspecified
        )
    )
    val origin = topLeft + Offset(w * 0.07f, w * 0.035f)
    drawText(layout, topLeft = origin)
    val pipRadius = w * 0.06f
    if (inline) {
        drawSuitPip(card.suit, Offset(origin.x + layout.size.width + pipRadius * 1.35f, origin.y + layout.size.height * 0.56f), pipRadius, ink)
    } else {
        val cx = origin.x + layout.size.width / 2f
        drawSuitPip(card.suit, Offset(cx, origin.y + layout.size.height + pipRadius * 0.95f), pipRadius, ink)
    }
}

private val leftCol = 0.35f
private val centerCol = 0.5f
private val rightCol = 0.65f
private val rows4 = listOf(0.22f, 0.4067f, 0.5933f, 0.78f)
private val rows3 = listOf(0.22f, 0.5f, 0.78f)

/** The standard pip positions, as fractions of the card's width and height. */
private fun pipLayout(value: Int): List<Offset> {
    fun col(x: Float, ys: List<Float>) = ys.map { Offset(x, it) }
    val sides = fun(rows: List<Float>) = col(leftCol, rows) + col(rightCol, rows)
    return when (value) {
        2 -> col(centerCol, listOf(0.22f, 0.78f))
        3 -> col(centerCol, rows3)
        4 -> sides(listOf(0.22f, 0.78f))
        5 -> sides(listOf(0.22f, 0.78f)) + Offset(centerCol, 0.5f)
        6 -> sides(rows3)
        7 -> sides(rows3) + Offset(centerCol, 0.36f)
        8 -> sides(rows3) + col(centerCol, listOf(0.36f, 0.64f))
        9 -> sides(rows4) + Offset(centerCol, 0.5f)
        10 -> sides(rows4) + col(centerCol, listOf(0.3133f, 0.6867f))
        else -> emptyList()
    }
}

private fun DrawScope.drawPips(card: PlayingCard, topLeft: Offset, cardSize: Size, ink: Color) {
    val w = cardSize.width
    val h = cardSize.height
    val positions = pipLayout(card.rank.value)
    val radius = w * when {
        positions.size <= 3 -> 0.115f
        positions.size <= 6 -> 0.1f
        else -> 0.085f
    }
    // As on a printed deck, the pips below the middle stand on their heads.
    positions.forEach { p ->
        val c = Offset(topLeft.x + p.x * w, topLeft.y + p.y * h)
        if (p.y > 0.5f) rotate(180f, pivot = c) { drawSuitPip(card.suit, c, radius, ink) }
        else drawSuitPip(card.suit, c, radius, ink)
    }
}

/** The Ace: one big suit symbol — the Ace of Spades larger still — inside a fine gold ring. */
private fun DrawScope.drawAceMedallion(card: PlayingCard, topLeft: Offset, cardSize: Size, ink: Color) {
    val w = cardSize.width
    val center = Offset(topLeft.x + w / 2f, topLeft.y + cardSize.height / 2f)
    val spade = card.suit == com.rangepatte.app.domain.model.Suit.SPADES
    val ring = w * if (spade) 0.36f else 0.3f
    drawCircle(BorderGold, ring, center, style = Stroke(w * 0.01f))
    for (i in 0 until 24) {
        val a = (2 * Math.PI / 24 * i).toFloat()
        drawCircle(BorderGold, w * 0.007f, Offset(center.x + cos(a) * ring * 1.08f, center.y + sin(a) * ring * 1.08f))
    }
    drawSuitPip(card.suit, center, w * if (spade) 0.27f else 0.2f, ink)
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
    drawCircle(Color.White, inner * 0.7f, center)
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
 * The back of every card: the classic patterned back — a white margin round a red (or [blue]) field
 * covered in a fine diamond lattice — with one royal touch, a small gold-ringed lotus medallion at
 * the centre. The same back is used by every game.
 */
internal fun DrawScope.drawRoyalCardBack(topLeft: Offset, cardSize: Size, blue: Boolean = false) {
    val w = cardSize.width
    val h = cardSize.height
    val corner = CornerRadius(w * CARD_CORNER)
    val center = Offset(topLeft.x + w / 2f, topLeft.y + h / 2f)
    val field = if (blue) Color(0xFF1F4E9C) else Color(0xFFB3182A)
    val fieldDeep = if (blue) Color(0xFF163A78) else Color(0xFF8C1020)
    val gold = Color(0xFFDDB75C)

    drawRoundRect(Color.Black.copy(alpha = 0.2f), topLeft + Offset(w * 0.025f, w * 0.045f), cardSize, corner)
    drawRoundRect(Color.Black.copy(alpha = 0.26f), topLeft + Offset(w * 0.01f, w * 0.02f), cardSize, corner)
    drawRoundRect(Color.White, topLeft, cardSize, corner)
    drawRoundRect(Edge, topLeft, cardSize, corner, style = Stroke(width = maxOf(1f, w * 0.012f)))

    val m = w * 0.075f
    val inner = Rect(topLeft.x + m, topLeft.y + m, topLeft.x + w - m, topLeft.y + h - m)
    val innerCorner = CornerRadius(w * 0.035f)
    val innerPath = Path().apply { addRoundRect(RoundRect(inner, innerCorner)) }
    drawRoundRect(field, inner.topLeft, inner.size, innerCorner)
    clipPath(innerPath) {
        // Diamond lattice in thin white lines, with a dot in every diamond.
        val step = w * 0.09f
        val line = Color.White.copy(alpha = 0.55f)
        val stroke = maxOf(0.7f, w * 0.007f)
        var k = -h
        while (k < w + h) {
            drawLine(line, Offset(inner.left + k, inner.top), Offset(inner.left + k + inner.height, inner.bottom), stroke)
            drawLine(line, Offset(inner.left + k, inner.top), Offset(inner.left + k - inner.height, inner.bottom), stroke)
            k += step
        }
        var y = inner.top
        var row = 0
        while (y < inner.bottom + step) {
            var x = inner.left + if (row % 2 == 0) 0f else step / 2f
            while (x < inner.right + step) {
                drawCircle(fieldDeep, w * 0.014f, Offset(x, y + step / 2f))
                x += step
            }
            y += step / 2f; row++
        }
    }
    drawRoundRect(Color.White, inner.topLeft, inner.size, innerCorner, style = Stroke(w * 0.012f))
    val in2 = w * 0.025f
    drawRoundRect(Color.White.copy(alpha = 0.8f), inner.topLeft + Offset(in2, in2), Size(inner.width - in2 * 2, inner.height - in2 * 2), CornerRadius(w * 0.02f), style = Stroke(w * 0.006f))

    // The royal touch: a small lotus medallion ringed in gold.
    val medal = w * 0.2f
    drawCircle(Color.White, medal * 1.12f, center)
    drawCircle(field, medal, center)
    drawCircle(gold, medal, center, style = Stroke(w * 0.014f))
    lotus(center, medal * 0.82f, 8, gold, fieldDeep)
    drawCircle(gold, medal * 0.16f, center)
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
