package com.rangepatte.app.ui.cards

import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.withTransform
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit

/*
 * The King, Queen and Jack of the app's deck, drawn in the traditional court-card manner: a thin black
 * frame, a double-ended figure split across the middle, flat red / yellow / blue clothes with black
 * outlines, the suit beside each head. Painted from vector paths in a 100 × 100 "portrait unit" box, so
 * the same drawing is sharp on a small thumbnail card and a full-size hand card.
 *
 *   King  — yellow crown with a cross, grey beard and moustache, sword.
 *   Queen — long yellow hair, tiara, red lips, rose.
 *   Jack  — red cap with a feather, yellow hair, halberd.
 */

private val Ink = Color(0xFF141414)
private val Yellow = Color(0xFFF3C531)
private val Red = Color(0xFFD2232A)
private val Blue = Color(0xFF1E3F94)
private val Skin = Color(0xFFFCE9D6)
private val Grey = Color(0xFFCDD0D5)
private val Green = Color(0xFF2E8B4F)

private enum class Role { KING, QUEEN, JACK }

private fun roleOf(rank: Rank): Role? = when (rank) {
    Rank.KING -> Role.KING
    Rank.QUEEN -> Role.QUEEN
    Rank.JACK -> Role.JACK
    else -> null
}

/** True for K, Q and J — the ranks that get a portrait. */
internal fun hasPortrait(rank: Rank): Boolean = roleOf(rank) != null

/**
 * Paints the framed double-ended portrait panel of a face card inside a card of size [cardSize] whose
 * top-left is [topLeft]: a white panel in a thin black frame, two figures split by a rule, and the suit
 * in the top-right and bottom-left corners of the frame.
 */
internal fun DrawScope.drawRoyalPortraitPanel(
    rank: Rank,
    suit: Suit,
    topLeft: Offset,
    cardSize: Size,
    suitInk: Color
) {
    val role = roleOf(rank) ?: return
    val w = cardSize.width
    val h = cardSize.height
    val panel = Rect(topLeft.x + w * 0.26f, topLeft.y + h * 0.085f, topLeft.x + w * 0.74f, topLeft.y + h * 0.915f)
    val panelPath = Path().apply { addRoundRect(RoundRect(panel, CornerRadius(w * 0.01f))) }
    drawRect(Color.White, panel.topLeft, panel.size)

    val bounds = Rect(panel.left, panel.top, panel.right, panel.top + panel.height / 2f)
    val center = Offset(topLeft.x + w / 2f, topLeft.y + h / 2f)
    // The two figures meet along a diagonal seam, as on a printed court card: the upper one is cut by a
    // line running up to the right, the lower one (the same drawing turned half way round) by the same line.
    val dy = panel.height * 0.1f
    val above = Path().apply {
        moveTo(panel.left, center.y + dy); lineTo(panel.right, center.y - dy)
        lineTo(panel.right, panel.top); lineTo(panel.left, panel.top); close()
    }
    clipPath(panelPath) {
        clipPath(above) { drawFigure(role, bounds) }
        rotate(180f, pivot = center) { clipPath(above) { drawFigure(role, bounds) } }
    }
    drawLine(Ink, Offset(panel.left, center.y + dy), Offset(panel.right, center.y - dy), strokeWidth = maxOf(0.8f, w * 0.007f))
    val pip = w * 0.07f
    val pipAt = Offset(panel.right - pip * 1.5f, panel.top + pip * 1.6f)
    drawSuitPip(suit, pipAt, pip, suitInk)
    rotate(180f, pivot = center) { drawSuitPip(suit, pipAt, pip, suitInk) }
    drawRect(Ink, panel.topLeft, panel.size, style = Stroke(maxOf(1f, w * 0.009f)))
}

private fun poly(vararg v: Float): Path = Path().apply {
    moveTo(v[0], v[1])
    var i = 2
    while (i < v.size) { lineTo(v[i], v[i + 1]); i += 2 }
    close()
}

private fun DrawScope.shape(p: Path, fill: Color, width: Float = 1f) {
    drawPath(p, fill)
    drawPath(p, Ink, style = Stroke(width, join = StrokeJoin.Round))
}

private fun DrawScope.oval(cx: Float, cy: Float, rx: Float, ry: Float, fill: Color, outline: Boolean = true) {
    drawOval(fill, Offset(cx - rx, cy - ry), Size(rx * 2, ry * 2))
    if (outline) drawOval(Ink, Offset(cx - rx, cy - ry), Size(rx * 2, ry * 2), style = Stroke(0.9f))
}

private fun DrawScope.line(x1: Float, y1: Float, x2: Float, y2: Float, w: Float = 0.6f, c: Color = Ink) =
    drawLine(c, Offset(x1, y1), Offset(x2, y2), strokeWidth = w, cap = StrokeCap.Round)

/** Fine parallel strokes, the engraver's way of shading hair, beards and fabric. */
private fun DrawScope.hatch(x1: Float, y1: Float, x2: Float, y2: Float, count: Int, dx: Float, dy: Float, w: Float = 0.5f) {
    for (i in 0 until count) {
        val t = if (count == 1) 0f else i / (count - 1f)
        line(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, x1 + (x2 - x1) * t + dx, y1 + (y2 - y1) * t + dy, w)
    }
}

/** A row of small dots along a line, like the studs on a printed hem. */
private fun DrawScope.studs(x1: Float, y1: Float, x2: Float, y2: Float, count: Int, r: Float, c: Color) {
    for (i in 0 until count) {
        val t = if (count == 1) 0f else i / (count - 1f)
        drawCircle(c, r, Offset(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t))
    }
}

/** One figure painted into [bounds] (a 100 × 100 portrait-unit box mapped onto it; it runs on below 100 and is cut by the seam). */
private fun DrawScope.drawFigure(role: Role, bounds: Rect) {
    val scale = bounds.height / 100f
    withTransform({
        translate(bounds.center.x - 50f * scale, bounds.top)
        scale(scale, scale, pivot = Offset.Zero)
        // Heads and shoulders a little larger than the unit box, as on the printed cards.
        scale(1.14f, 1.14f, pivot = Offset(50f, 40f))
    }) {
        // What the figure holds is drawn first, so the clothes lie over it.
        when (role) {
            Role.KING -> {
                // Sword at the left, point down, with its guard.
                shape(poly(16f, 16f, 20f, 16f, 20f, 118f, 18f, 124f, 16f, 118f), Grey)
                line(18f, 18f, 18f, 118f, 0.5f)
                shape(poly(9f, 70f, 27f, 70f, 27f, 74.5f, 9f, 74.5f), Yellow)
                shape(poly(15f, 74.5f, 21f, 74.5f, 21f, 80f, 15f, 80f), Red)
                oval(18f, 66f, 3f, 3f, Yellow)
                // Orb and sceptre at the right.
                shape(poly(80f, 40f, 83f, 40f, 83f, 110f, 80f, 110f), Yellow)
                oval(81.5f, 66f, 7f, 7f, Yellow)
                line(74.5f, 66f, 88.5f, 66f, 0.7f); line(81.5f, 59f, 81.5f, 73f, 0.7f)
                shape(poly(80.5f, 47f, 82.5f, 47f, 82.5f, 52f, 80.5f, 52f), Red, 0.5f)
            }
            Role.JACK -> {
                drawLine(Ink, Offset(15f, 8f), Offset(15f, 124f), strokeWidth = 3.4f)
                drawLine(Yellow, Offset(15f, 8f), Offset(15f, 124f), strokeWidth = 1.9f)
                shape(poly(15f, 8f, 27f, 18f, 15f, 33f), Grey)
                shape(poly(15f, 40f, 24f, 48f, 15f, 52f), Grey)
            }
            Role.QUEEN -> {
                // Long hair falling behind both shoulders.
                shape(poly(28f, 40f, 72f, 40f, 78f, 104f, 74f, 128f, 26f, 128f, 22f, 104f), Yellow)
                hatch(28f, 70f, 28f, 120f, 6, -3f, 0f); hatch(72f, 70f, 72f, 120f, 6, 3f, 0f)
            }
        }
        drawBody(role)
        // Neck.
        shape(poly(44f, 52f, 56f, 52f, 58f, 68f, 42f, 68f), Skin, 0.9f)
        when (role) {
            Role.KING -> {
                // Grey hair and its engraving.
                shape(poly(33f, 30f, 67f, 30f, 70f, 60f, 30f, 60f), Grey)
                hatch(33f, 34f, 33f, 58f, 5, -1.5f, 0f); hatch(67f, 34f, 67f, 58f, 5, 1.5f, 0f)
            }
            Role.QUEEN -> Unit
            Role.JACK -> {
                shape(poly(32f, 30f, 68f, 30f, 72f, 62f, 62f, 54f, 38f, 54f, 28f, 62f), Yellow)
                hatch(32f, 36f, 31f, 60f, 5, -1.8f, 0f); hatch(68f, 36f, 69f, 60f, 5, 1.8f, 0f)
            }
        }
        oval(50f, 44f, 12.5f, 15.5f, Skin)
        // Face: heavy brows, almond eyes with pupils, nose with a shadow line, small mouth, cheek lines.
        for (sx in listOf(-1f, 1f)) {
            val ex = 50f + sx * 6.8f
            drawPath(Path().apply {
                moveTo(ex - 3.6f, 42f); quadraticTo(ex, 39.2f, ex + 3.6f, 42f); quadraticTo(ex, 44f, ex - 3.6f, 42f)
            }, Color.White)
            drawPath(Path().apply {
                moveTo(ex - 3.6f, 42f); quadraticTo(ex, 39.2f, ex + 3.6f, 42f); quadraticTo(ex, 44f, ex - 3.6f, 42f)
            }, Ink, style = Stroke(0.7f))
            drawCircle(Ink, 1.25f, Offset(ex, 42f))
            line(ex - 4.6f, 38.2f, ex + 4.2f, 37.4f, 1.0f)
        }
        drawPath(Path().apply { moveTo(50f, 42f); lineTo(48.2f, 49.5f); lineTo(51.8f, 49.8f) }, Ink, style = Stroke(0.8f, join = StrokeJoin.Round))
        line(41f, 50f, 43f, 52f, 0.5f); line(59f, 50f, 57f, 52f, 0.5f)
        when (role) {
            Role.KING -> {
                shape(Path().apply {
                    moveTo(37.5f, 46f); lineTo(38f, 60f); quadraticTo(50f, 80f, 62f, 60f); lineTo(62.5f, 46f)
                    lineTo(58f, 53f); lineTo(42f, 53f); close()
                }, Grey, 0.9f)
                hatch(41f, 56f, 59f, 56f, 8, 0f, 11f); hatch(40f, 52f, 40f, 62f, 3, 1.5f, 3f); hatch(60f, 52f, 60f, 62f, 3, -1.5f, 3f)
                shape(poly(40f, 52f, 50f, 50f, 60f, 52f, 55f, 57f, 50f, 54.5f, 45f, 57f), Grey, 0.9f)
                line(46.5f, 60.5f, 53.5f, 60.5f, 0.8f)
                // Crown: band, five points with pearls, a red cap showing between, and a cross.
                shape(poly(35f, 31f, 34f, 14f, 42f, 22f, 46f, 10f, 50f, 20f, 54f, 10f, 58f, 22f, 66f, 14f, 65f, 31f), Yellow)
                shape(poly(35f, 25f, 65f, 25f, 65f, 31f, 35f, 31f), Red)
                studs(37f, 28f, 63f, 28f, 7, 0.9f, Yellow)
                shape(poly(42f, 22f, 46f, 10f, 50f, 20f, 54f, 10f, 58f, 22f, 50f, 25f), Red, 0.7f)
                for (x in listOf(34f, 46f, 54f, 66f)) drawCircle(Ink, 1.1f, Offset(x, if (x == 34f || x == 66f) 14f else 10f))
                line(50f, 10f, 50f, 1f, 3.4f); line(45.5f, 5f, 54.5f, 5f, 3.4f)
                line(50f, 10f, 50f, 1.8f, 1.8f, Yellow); line(46.4f, 5f, 53.6f, 5f, 1.8f, Yellow)
            }
            Role.QUEEN -> {
                line(45.5f, 53.4f, 54.5f, 53.4f, 2.4f, Red)
                // Tiara: tall points and jewels over a banded veil.
                shape(poly(35f, 31f, 34f, 15f, 41f, 22f, 45f, 8f, 50f, 19f, 55f, 8f, 59f, 22f, 66f, 15f, 65f, 31f), Yellow)
                shape(poly(35f, 25f, 65f, 25f, 65f, 31f, 35f, 31f), Red)
                studs(37f, 28f, 63f, 28f, 7, 0.9f, Yellow)
                oval(50f, 19f, 2.4f, 2.4f, Blue); oval(45f, 12f, 1.3f, 1.3f, Red); oval(55f, 12f, 1.3f, 1.3f, Red)
                // Hair framing the face, with its engraving.
                hatch(37f, 32f, 36f, 50f, 5, -2f, 3f); hatch(63f, 32f, 64f, 50f, 5, 2f, 3f)
                // Rose held up at the right.
                line(86f, 126f, 85f, 82f, 1.3f, Green)
                oval(85f, 76f, 7f, 7f, Red); oval(85f, 76f, 4.4f, 4.4f, Yellow); oval(85f, 76f, 1.8f, 1.8f, Red)
                shape(poly(85f, 92f, 93f, 86f, 91f, 94f), Green, 0.5f)
            }
            Role.JACK -> {
                line(45.5f, 54f, 54.5f, 54f, 0.9f)
                // Cap with a wide yellow brim and a long feather.
                shape(Path().apply { moveTo(33f, 31f); lineTo(37f, 15f); quadraticTo(50f, 6f, 63f, 15f); lineTo(67f, 31f); close() }, Red)
                shape(poly(32f, 25f, 68f, 25f, 68.5f, 31f, 31.5f, 31f), Yellow)
                studs(35f, 28f, 65f, 28f, 8, 0.8f, Red)
                shape(Path().apply { moveTo(62f, 15f); quadraticTo(82f, -2f, 92f, 16f); quadraticTo(78f, 14f, 64f, 24f); close() }, Yellow)
                line(64f, 17f, 88f, 12f, 0.5f); hatch(70f, 13f, 84f, 15f, 5, 0f, 3f)
            }
        }
    }
}

private fun DrawScope.drawBody(role: Role) {
    val body = poly(2f, 130f, 8f, 86f, 22f, 70f, 36f, 65f, 64f, 65f, 78f, 70f, 92f, 86f, 98f, 130f)
    clipPath(body) {
        when (role) {
            Role.KING -> {
                drawRect(Red, Offset(0f, 60f), Size(100f, 70f))
                // Black-edged yellow chest panel with a blue jewel, red and black bands down the sleeves.
                shape(poly(50f, 70f, 70f, 92f, 50f, 124f, 30f, 92f), Yellow)
                shape(poly(50f, 82f, 60f, 94f, 50f, 106f, 40f, 94f), Blue)
                oval(50f, 94f, 2.6f, 2.6f, Yellow)
                hatch(36f, 84f, 44f, 76f, 4, 2f, 2f); hatch(64f, 84f, 56f, 76f, 4, -2f, 2f)
                shape(poly(8f, 86f, 22f, 70f, 28f, 72f, 14f, 130f, 2f, 130f), Yellow)
                shape(poly(92f, 86f, 78f, 70f, 72f, 72f, 86f, 130f, 98f, 130f), Yellow)
                studs(12f, 88f, 24f, 74f, 5, 0.9f, Red); studs(88f, 88f, 76f, 74f, 5, 0.9f, Red)
                for (i in 0 until 5) { drawCircle(Ink, 1.3f, Offset(10f + i * 4f, 104f + i * 5f)); drawCircle(Ink, 1.3f, Offset(90f - i * 4f, 104f + i * 5f)) }
                shape(poly(2f, 118f, 98f, 106f, 98f, 114f, 2f, 126f), Ink)
                studs(6f, 120f, 94f, 110f, 12, 1.1f, Yellow)
            }
            Role.QUEEN -> {
                drawRect(Blue, Offset(0f, 60f), Size(100f, 70f))
                shape(poly(36f, 66f, 50f, 100f, 64f, 66f, 58f, 66f, 50f, 84f, 42f, 66f), Yellow)
                shape(poly(2f, 130f, 8f, 86f, 22f, 72f, 30f, 130f), Red)
                shape(poly(98f, 130f, 92f, 86f, 78f, 72f, 70f, 130f), Red)
                studs(10f, 92f, 28f, 128f, 7, 1.1f, Yellow); studs(90f, 92f, 72f, 128f, 7, 1.1f, Yellow)
                hatch(34f, 100f, 66f, 100f, 9, 0f, 20f, 0.6f)
                shape(poly(2f, 116f, 98f, 116f, 98f, 122f, 2f, 122f), Ink)
                studs(6f, 119f, 94f, 119f, 13, 1.1f, Yellow)
            }
            Role.JACK -> {
                drawRect(Yellow, Offset(0f, 60f), Size(100f, 70f))
                // A diamond-patterned tunic: red and black quarters with a yellow lozenge, slashed sleeves.
                shape(poly(2f, 130f, 8f, 86f, 22f, 70f, 50f, 125f), Red)
                shape(poly(98f, 130f, 92f, 86f, 78f, 70f, 50f, 125f), Ink)
                shape(poly(50f, 80f, 64f, 100f, 50f, 122f, 36f, 100f), Yellow)
                shape(poly(50f, 88f, 58f, 100f, 50f, 112f, 42f, 100f), Red, 0.8f)
                studs(8f, 92f, 46f, 122f, 6, 1.1f, Yellow); studs(92f, 92f, 54f, 122f, 6, 1.1f, Yellow)
                hatch(10f, 100f, 16f, 124f, 4, 4f, 0f)
            }
        }
    }
    drawPath(body, Ink, style = Stroke(1f, join = StrokeJoin.Round))
    // The collar: an ermine ruff for the King, a jewelled collar for the Queen, a plain white one for the Jack.
    when (role) {
        Role.KING -> {
            shape(poly(33f, 62f, 67f, 62f, 74f, 74f, 50f, 80f, 26f, 74f), Color.White)
            for (x in listOf(34f, 42f, 50f, 58f, 66f)) {
                shape(poly(x - 1.4f, 69f, x + 1.4f, 69f, x, 74f), Ink, 0.3f)
            }
        }
        Role.QUEEN -> {
            shape(poly(35f, 62f, 65f, 62f, 70f, 72f, 50f, 78f, 30f, 72f), Yellow)
            studs(34f, 70f, 66f, 70f, 8, 1.1f, Red)
        }
        Role.JACK -> {
            shape(poly(35f, 63f, 65f, 63f, 61f, 71f, 50f, 75f, 39f, 71f), Color.White)
            studs(40f, 70f, 60f, 70f, 5, 0.7f, Ink)
        }
    }
}
