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
    val panel = Rect(topLeft.x + w * 0.275f, topLeft.y + h * 0.085f, topLeft.x + w * 0.725f, topLeft.y + h * 0.915f)
    val panelPath = Path().apply { addRoundRect(RoundRect(panel, CornerRadius(w * 0.01f))) }
    drawRect(Color.White, panel.topLeft, panel.size)

    val bounds = Rect(panel.left, panel.top, panel.right, panel.top + panel.height / 2f)
    val center = Offset(topLeft.x + w / 2f, topLeft.y + h / 2f)
    clipPath(panelPath) {
        drawFigure(role, bounds)
        rotate(180f, pivot = center) { drawFigure(role, bounds) }
    }

    val rule = maxOf(0.8f, w * 0.008f)
    drawLine(Ink, Offset(panel.left, center.y), Offset(panel.right, center.y), strokeWidth = rule)
    val pip = w * 0.052f
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

private fun DrawScope.shape(p: Path, fill: Color) {
    drawPath(p, fill)
    drawPath(p, Ink, style = Stroke(1.1f, join = StrokeJoin.Round))
}

private fun DrawScope.oval(cx: Float, cy: Float, rx: Float, ry: Float, fill: Color, outline: Boolean = true) {
    drawOval(fill, Offset(cx - rx, cy - ry), Size(rx * 2, ry * 2))
    if (outline) drawOval(Ink, Offset(cx - rx, cy - ry), Size(rx * 2, ry * 2), style = Stroke(1.1f))
}

/** One figure painted into [bounds] (a 100 × 100 portrait-unit box mapped onto it, trimmed at the sides). */
private fun DrawScope.drawFigure(role: Role, bounds: Rect) {
    val scale = bounds.height / 100f
    withTransform({
        translate(bounds.center.x - 50f * scale, bounds.top)
        scale(scale, scale, pivot = Offset.Zero)
    }) {
        // What the figure holds is drawn first, so the clothes lie over it.
        when (role) {
            Role.KING -> {
                shape(poly(79f, 20f, 83f, 20f, 83f, 90f, 79f, 90f), Grey)
                shape(poly(72f, 62f, 90f, 62f, 90f, 67f, 72f, 67f), Yellow)
            }
            Role.JACK -> {
                drawLine(Ink, Offset(19f, 10f), Offset(19f, 100f), strokeWidth = 3.6f)
                drawLine(Yellow, Offset(19f, 10f), Offset(19f, 100f), strokeWidth = 2f)
                shape(poly(19f, 10f, 29f, 20f, 19f, 32f), Grey)
            }
            Role.QUEEN -> Unit
        }
        drawBody(role)
        // Neck.
        shape(poly(44f, 52f, 56f, 52f, 58f, 68f, 42f, 68f), Skin)
        when (role) {
            Role.KING -> shape(poly(33f, 30f, 67f, 30f, 69f, 58f, 31f, 58f), Grey)
            Role.QUEEN -> shape(poly(31f, 26f, 69f, 26f, 74f, 72f, 26f, 72f), Yellow)
            Role.JACK -> shape(poly(33f, 30f, 67f, 30f, 69f, 56f, 61f, 50f, 39f, 50f, 31f, 56f), Yellow)
        }
        oval(50f, 44f, 12.5f, 15.5f, Skin)
        // Eyes, brows, nose, mouth.
        oval(43f, 42f, 2.3f, 1.4f, Ink, outline = false)
        oval(57f, 42f, 2.3f, 1.4f, Ink, outline = false)
        drawLine(Ink, Offset(40f, 38.5f), Offset(46f, 38f), strokeWidth = 1f, cap = StrokeCap.Round)
        drawLine(Ink, Offset(54f, 38f), Offset(60f, 38.5f), strokeWidth = 1f, cap = StrokeCap.Round)
        drawPath(Path().apply { moveTo(50f, 43f); lineTo(48.3f, 49f); lineTo(51.5f, 49.4f) }, Ink, style = Stroke(0.9f, join = StrokeJoin.Round))
        when (role) {
            Role.KING -> {
                // Grey beard, with the moustache over it.
                shape(Path().apply {
                    moveTo(37.5f, 47f); lineTo(38f, 60f); quadraticTo(50f, 76f, 62f, 60f); lineTo(62.5f, 47f)
                    lineTo(58f, 53f); lineTo(42f, 53f); close()
                }, Grey)
                shape(poly(41f, 52f, 50f, 50.5f, 59f, 52f, 55f, 56f, 50f, 54f, 45f, 56f), Grey)
                drawLine(Ink, Offset(46.5f, 59f), Offset(53.5f, 59f), strokeWidth = 1f, cap = StrokeCap.Round)
                shape(poly(36f, 31f, 35f, 15f, 43f, 22f, 50f, 11f, 57f, 22f, 65f, 15f, 64f, 31f), Yellow)
                shape(poly(36f, 26f, 64f, 26f, 64f, 31f, 36f, 31f), Red)
                oval(50f, 19f, 2.1f, 2.1f, Red)
                drawLine(Ink, Offset(50f, 11f), Offset(50f, 3f), strokeWidth = 3.8f)
                drawLine(Ink, Offset(46f, 6.5f), Offset(54f, 6.5f), strokeWidth = 3.8f)
                drawLine(Yellow, Offset(50f, 11f), Offset(50f, 3.8f), strokeWidth = 2f)
                drawLine(Yellow, Offset(46.8f, 6.5f), Offset(53.2f, 6.5f), strokeWidth = 2f)
            }
            Role.QUEEN -> {
                drawLine(Red, Offset(46f, 53.2f), Offset(54f, 53.2f), strokeWidth = 2.1f, cap = StrokeCap.Round)
                shape(poly(37f, 30f, 36f, 17f, 43f, 23f, 50f, 12f, 57f, 23f, 64f, 17f, 63f, 30f), Yellow)
                shape(poly(37f, 26f, 63f, 26f, 63f, 30f, 37f, 30f), Red)
                oval(50f, 19f, 2.2f, 2.2f, Blue)
                // Rose in the right hand.
                drawLine(Green, Offset(81f, 100f), Offset(80f, 76f), strokeWidth = 1.6f)
                oval(80f, 71f, 5.5f, 5.5f, Red)
                oval(80f, 71f, 2.2f, 2.2f, Yellow)
            }
            Role.JACK -> {
                drawLine(Ink, Offset(46f, 53.5f), Offset(54f, 53.5f), strokeWidth = 1f, cap = StrokeCap.Round)
                shape(Path().apply { moveTo(34f, 31f); lineTo(38f, 17f); quadraticTo(50f, 10f, 62f, 17f); lineTo(66f, 31f); close() }, Red)
                shape(poly(34f, 26f, 66f, 26f, 66.5f, 31f, 33.5f, 31f), Yellow)
                shape(Path().apply { moveTo(62f, 17f); quadraticTo(76f, 4f, 82f, 14f); quadraticTo(72f, 16f, 62f, 21f); close() }, Yellow)
            }
        }
    }
}

private fun DrawScope.drawBody(role: Role) {
    val body = poly(8f, 100f, 15f, 77f, 34f, 66f, 66f, 66f, 85f, 77f, 92f, 100f)
    clipPath(body) {
        when (role) {
            Role.KING -> {
                drawRect(Red, Offset(0f, 60f), Size(100f, 40f))
                shape(poly(50f, 66f, 72f, 84f, 50f, 100f, 28f, 84f), Yellow)
                shape(poly(50f, 75f, 60f, 84f, 50f, 93f, 40f, 84f), Blue)
                shape(poly(15f, 77f, 34f, 66f, 34f, 72f, 20f, 82f), Yellow)
                shape(poly(85f, 77f, 66f, 66f, 66f, 72f, 80f, 82f), Yellow)
            }
            Role.QUEEN -> {
                drawRect(Blue, Offset(0f, 60f), Size(100f, 40f))
                shape(poly(38f, 66f, 50f, 92f, 62f, 66f, 56f, 66f, 50f, 80f, 44f, 66f), Yellow)
                shape(poly(8f, 100f, 15f, 77f, 24f, 72f, 30f, 100f), Red)
                shape(poly(92f, 100f, 85f, 77f, 76f, 72f, 70f, 100f), Red)
            }
            Role.JACK -> {
                drawRect(Yellow, Offset(0f, 60f), Size(100f, 40f))
                shape(poly(8f, 100f, 15f, 77f, 34f, 66f, 50f, 100f), Red)
                shape(poly(92f, 100f, 85f, 77f, 66f, 66f, 50f, 100f), Blue)
                shape(poly(50f, 80f, 56f, 90f, 50f, 100f, 44f, 90f), Yellow)
            }
        }
    }
    drawPath(body, Ink, style = Stroke(1.1f, join = StrokeJoin.Round))
    // The collar: white ruff for the King and Jack, a gold necklace for the Queen.
    if (role == Role.QUEEN) {
        shape(poly(37f, 64f, 63f, 64f, 60f, 70f, 50f, 74f, 40f, 70f), Yellow)
    } else {
        shape(poly(35f, 63f, 65f, 63f, 61f, 71f, 50f, 75f, 39f, 71f), Color.White)
    }
}
