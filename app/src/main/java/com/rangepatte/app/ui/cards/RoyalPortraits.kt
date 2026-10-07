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
import androidx.compose.ui.graphics.drawscope.withTransform
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit

/*
 * The King, Queen and Jack of the app's single antique royal deck.
 *
 * Each is an original miniature-style bust — in the spirit of Mughal and Rajput court portraits, not
 * a copy of any work — painted from vector paths in a 100 × 100 "portrait unit" box, so the same
 * drawing is sharp on a 40dp thumbnail card and a full-size hand card. Face cards are double-ended
 * like a real deck: the upright bust above a gold rule, and the same bust turned upside-down below it.
 *
 *   King  — jewelled turban with aigrette plume, full beard and moustache, pearls, talwar.
 *   Queen — gold mukut crown with maang tikka, veil, nath nose-ring, jhumka earrings, lotus.
 *   Jack  — young prince: smaller turban and peacock feather, clean-shaven, spear.
 */

private val SkinLight = Color(0xFFE4B887)
private val SkinMid = Color(0xFFD09E6B)
private val SkinShade = Color(0xFF9C6A3E)
private val Hair = Color(0xFF1F150E)
private val Ivory = Color(0xFFF3E7CB)
private val IvoryShade = Color(0xFFD9C79C)
private val Gold = Color(0xFFDDB75C)
private val GoldDark = Color(0xFF9A7228)
private val Ruby = Color(0xFFB3182A)
private val Emerald = Color(0xFF1F7A56)
private val Sapphire = Color(0xFF2B55A3)
private val Steel = Color(0xFFC7CDD4)
private val Lip = Color(0xFFA23B3B)

private val PanelBurgundy = Color(0xFF6A1824)
private val PanelBurgundyDeep = Color(0xFF3E0C14)
private val PanelIndigo = Color(0xFF1E2B50)
private val PanelIndigoDeep = Color(0xFF0F1830)

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
 * top-left is [topLeft]: jewel-toned panel, gold frame, two busts split by a gold rule and a small
 * suit medallion at the middle.
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
    val panel = Rect(topLeft.x + w * 0.235f, topLeft.y + h * 0.075f, topLeft.x + w * 0.765f, topLeft.y + h * 0.925f)
    val red = suit == Suit.HEARTS || suit == Suit.DIAMONDS
    val shape = RoundRect(panel, CornerRadius(w * 0.045f))
    val panelPath = Path().apply { addRoundRect(shape) }

    // Panel ground: deep burgundy for red suits, deep indigo for black, with a soft inner glow.
    drawRoundRect(
        brush = Brush.verticalGradient(
            listOf(if (red) PanelBurgundy else PanelIndigo, if (red) PanelBurgundyDeep else PanelIndigoDeep),
            startY = panel.top, endY = panel.bottom
        ),
        topLeft = panel.topLeft, size = panel.size, cornerRadius = CornerRadius(w * 0.045f)
    )

    val halfHeight = panel.height / 2f
    val bounds = Rect(panel.left, panel.top, panel.right, panel.top + halfHeight)
    val center = Offset(topLeft.x + w / 2f, topLeft.y + h / 2f)
    val robe = robeFor(role, red)
    clipPath(panelPath) {
        drawBust(role, bounds, robe, red)
        rotate(180f, pivot = center) { drawBust(role, bounds, robe, red) }
    }

    // Gold rule between the two halves, with a small suit medallion on it.
    val midY = center.y
    drawLine(Gold.copy(alpha = 0.85f), Offset(panel.left, midY), Offset(panel.right, midY), strokeWidth = w * 0.012f)
    val medallion = w * 0.095f
    drawCircle(Ivory, medallion, center)
    drawCircle(Gold, medallion, center, style = Stroke(w * 0.016f))
    drawCircle(GoldDark, medallion * 0.82f, center, style = Stroke(w * 0.006f))
    drawSuitPip(suit, center, medallion * 1.05f, suitInk)

    // Frame.
    drawRoundRect(Gold, panel.topLeft, panel.size, CornerRadius(w * 0.045f), style = Stroke(w * 0.022f))
    val inner = w * 0.03f
    drawRoundRect(
        GoldDark.copy(alpha = 0.8f),
        Offset(panel.left + inner, panel.top + inner),
        Size(panel.width - inner * 2, panel.height - inner * 2),
        CornerRadius(w * 0.025f), style = Stroke(w * 0.007f)
    )
}

private fun robeFor(role: Role, redSuit: Boolean): Color = when (role) {
    Role.KING -> if (redSuit) Color(0xFF1B6B4D) else Color(0xFF9B1F30)
    Role.QUEEN -> if (redSuit) Color(0xFFC8872A) else Color(0xFF7C2A5E)
    Role.JACK -> if (redSuit) Color(0xFF2B55A3) else Color(0xFF1F7A56)
}

private fun path(block: Path.() -> Unit) = Path().apply(block)

/** One bust painted into [bounds] (a 100 × 100 portrait-unit box mapped onto it). */
private fun DrawScope.drawBust(role: Role, bounds: Rect, robe: Color, redSuit: Boolean) {
    // One uniform scale that fills the height; the sides of the bust may be trimmed by the panel.
    val scale = bounds.height / 100f
    withTransform({
        translate(bounds.center.x - 50f * scale, bounds.top)
        scale(scale, scale, pivot = Offset.Zero)
    }) {
        // Halo: the glow of kingship behind the head.
        drawCircle(
            brush = Brush.radialGradient(listOf(Gold.copy(alpha = 0.55f), Color.Transparent), center = Offset(50f, 38f), radius = 36f),
            radius = 36f, center = Offset(50f, 38f)
        )
        drawCircle(Gold.copy(alpha = 0.85f), 29f, Offset(50f, 38f), style = Stroke(1.1f))

        if (role == Role.QUEEN) drawVeilBack(robe)
        if (role == Role.KING) drawTalwar()
        if (role == Role.JACK) drawSpear()

        drawShoulders(role, robe)
        drawNeckAndEars(role)
        drawFace(role, redSuit)
        when (role) {
            Role.KING -> drawKingTurban(robe)
            Role.QUEEN -> drawQueenCrown(robe)
            Role.JACK -> drawJackTurban(robe)
        }
        if (role == Role.QUEEN) drawLotus()
    }
}

// ---- Body ---------------------------------------------------------------------------------------------

private fun DrawScope.drawShoulders(role: Role, robe: Color) {
    val body = path {
        moveTo(0f, 100f)
        cubicTo(2f, 80f, 22f, 70f, 38f, 66f)
        lineTo(62f, 66f)
        cubicTo(78f, 70f, 98f, 80f, 100f, 100f)
        close()
    }
    drawPath(body, Brush.verticalGradient(listOf(robe.lighten(0.18f), robe, robe.darken(0.35f)), startY = 66f, endY = 100f))
    // Gold trim along the shoulders and an under-garment of ivory silk.
    drawPath(path { moveTo(6f, 96f); quadraticTo(12f, 76f, 38f, 67.5f) }, Gold, style = Stroke(1.5f, cap = StrokeCap.Round))
    drawPath(path { moveTo(94f, 96f); quadraticTo(88f, 76f, 62f, 67.5f) }, Gold, style = Stroke(1.5f, cap = StrokeCap.Round))
    drawPath(path { moveTo(39f, 66.5f); lineTo(50f, 86f); lineTo(61f, 66.5f); close() }, Ivory)
    drawPath(path { moveTo(38f, 66f); lineTo(50f, 88f); lineTo(62f, 66f) }, Gold, style = Stroke(1.8f, cap = StrokeCap.Round))

    // Woven brocade: a few gold flowers scattered over the sleeves.
    listOf(Offset(17f, 90f), Offset(83f, 90f), Offset(27f, 80f), Offset(73f, 80f), Offset(11f, 98f), Offset(89f, 98f)).forEach {
        drawCircle(Gold.copy(alpha = 0.55f), 1.7f, it)
        drawCircle(robe.darken(0.4f), 0.7f, it)
    }

    // Pearl strands, longer for the King, and a central gem.
    val strands = if (role == Role.KING) listOf(78f, 90f) else listOf(76f, 86f)
    strands.forEach { dip ->
        for (i in 0..10) {
            val t = i / 10f
            val x = 38f + 24f * t
            val y = 67f + (dip - 67f) * 4f * t * (1f - t) + 0f
            drawCircle(Ivory, 1.35f, Offset(x, y))
            drawCircle(IvoryShade, 1.35f, Offset(x, y), style = Stroke(0.35f))
        }
    }
    val gem = Offset(50f, 86f)
    drawCircle(Gold, 3.8f, gem)
    drawCircle(if (role == Role.QUEEN) Emerald else Ruby, 2.6f, gem)
    drawCircle(Color.White.copy(alpha = 0.55f), 0.7f, Offset(49.2f, 85.2f))
}

private fun DrawScope.drawNeckAndEars(role: Role) {
    drawPath(path { moveTo(43f, 54f); lineTo(43f, 67f); quadraticTo(50f, 72f, 57f, 67f); lineTo(57f, 54f); close() }, SkinShade)
    drawPath(path { moveTo(43f, 54f); lineTo(43f, 64f); quadraticTo(50f, 68f, 57f, 64f); lineTo(57f, 54f); close() }, SkinMid.copy(alpha = 0.55f))
    // Ears.
    drawOval(SkinMid, Offset(31.8f, 40.5f), Size(5.4f, 9f))
    drawOval(SkinMid, Offset(62.8f, 40.5f), Size(5.4f, 9f))
    // Earrings: pearl drops (a larger jhumka bell for the Queen).
    listOf(34.5f, 65.5f).forEach { x ->
        drawCircle(Gold, 1.5f, Offset(x, 50.5f))
        if (role == Role.QUEEN) {
            drawPath(path { moveTo(x - 2.6f, 52f); lineTo(x + 2.6f, 52f); lineTo(x + 1.2f, 57f); lineTo(x - 1.2f, 57f); close() }, Gold)
            drawCircle(Ivory, 1.1f, Offset(x, 58.6f))
        } else {
            drawCircle(Ivory, 1.5f, Offset(x, 53.5f))
            drawCircle(IvoryShade, 1.5f, Offset(x, 53.5f), style = Stroke(0.35f))
        }
    }
}

// ---- Face ----------------------------------------------------------------------------------------------

private fun DrawScope.drawFace(role: Role, redSuit: Boolean) {
    val face = Offset(50f, 43f)
    val faceRect = Rect(face.x - 15.5f, face.y - 19f, face.x + 15.5f, face.y + 19f)
    drawOval(
        brush = Brush.radialGradient(listOf(SkinLight, SkinMid), center = Offset(48f, 40f), radius = 24f),
        topLeft = faceRect.topLeft, size = faceRect.size
    )

    // Hair at the temples (Queen's is parted, with the tikka drawn over later).
    if (role != Role.KING) {
        drawPath(
            path {
                moveTo(34.2f, 40f); cubicTo(33f, 26f, 44f, 22f, 50f, 22.5f); cubicTo(56f, 22f, 67f, 26f, 65.8f, 40f)
                cubicTo(63f, 33f, 57f, 29f, 50f, 29.5f); cubicTo(43f, 29f, 37f, 33f, 34.2f, 40f); close()
            },
            Hair
        )
    }

    // Cheeks.
    if (role != Role.KING) {
        drawCircle(Ruby.copy(alpha = 0.12f), 4.4f, Offset(40.5f, 48f))
        drawCircle(Ruby.copy(alpha = 0.12f), 4.4f, Offset(59.5f, 48f))
    }

    // Eyes: kohl-lined almonds, a little narrowed for a calm regal gaze.
    listOf(43.4f, 56.6f).forEachIndexed { index, x ->
        val outer = if (index == 0) -4f else 4f
        drawPath(
            path { moveTo(x + outer, 41f); quadraticTo(x, 37.6f, x - outer, 40.6f); quadraticTo(x, 43.6f, x + outer, 41f); close() },
            Ivory
        )
        drawCircle(Hair, 1.9f, Offset(x, 40.8f))
        drawCircle(Color.White.copy(alpha = 0.8f), 0.55f, Offset(x - 0.5f, 40.2f))
        drawPath(
            path { moveTo(x + outer * 1.12f, 41.1f); quadraticTo(x, 37.2f, x - outer * 1.12f, 40.6f) },
            Hair, style = Stroke(1.05f, cap = StrokeCap.Round)
        )
        val browWidth = when (role) { Role.KING -> 2.0f; Role.QUEEN -> 0.95f; Role.JACK -> 1.4f }
        drawPath(
            path { moveTo(x + outer * 1.2f, 36.4f); quadraticTo(x, if (role == Role.QUEEN) 33f else 34.2f, x - outer * 1.2f, 36.8f) },
            Hair, style = Stroke(browWidth, cap = StrokeCap.Round)
        )
    }

    // Nose and mouth.
    drawPath(path { moveTo(50.2f, 41.5f); lineTo(48.7f, 47.6f); quadraticTo(50f, 49.4f, 52.3f, 47.6f) }, SkinShade, style = Stroke(0.95f, cap = StrokeCap.Round))
    if (role == Role.QUEEN) {
        drawPath(
            path { moveTo(45.6f, 53.6f); quadraticTo(48f, 52.2f, 50f, 53.2f); quadraticTo(52f, 52.2f, 54.4f, 53.6f); quadraticTo(50f, 57.4f, 45.6f, 53.6f); close() },
            Lip
        )
        // Nath: a gold nose-ring with a pearl.
        drawCircle(Gold, 2.8f, Offset(53.4f, 49.2f), style = Stroke(0.75f))
        drawCircle(Ivory, 0.9f, Offset(53.4f, 52f))
    } else {
        drawPath(path { moveTo(45.8f, 54f); quadraticTo(50f, 56f, 54.2f, 54f) }, Lip, style = Stroke(1.3f, cap = StrokeCap.Round))
    }

    if (role == Role.KING) {
        // Full beard, framing the mouth, with a few silver hairs; and an upswept moustache.
        drawPath(
            path {
                moveTo(34.6f, 42f); cubicTo(33f, 66f, 67f, 66f, 65.4f, 42f)
                cubicTo(62.5f, 53f, 58f, 57f, 50f, 57.4f); cubicTo(42f, 57f, 37.5f, 53f, 34.6f, 42f); close()
            },
            Hair
        )
        listOf(-7f, -3.5f, 0f, 3.5f, 7f).forEach {
            drawLine(Ivory.copy(alpha = 0.28f), Offset(50f + it, 59f), Offset(50f + it * 0.8f, 64f), strokeWidth = 0.55f)
        }
        val moustache = path {
            moveTo(50f, 51.6f); cubicTo(46f, 49.4f, 41.2f, 50f, 38.2f, 53.4f); cubicTo(42f, 52.4f, 46.4f, 53.4f, 50f, 54.2f)
            cubicTo(53.6f, 53.4f, 58f, 52.4f, 61.8f, 53.4f); cubicTo(58.8f, 50f, 54f, 49.4f, 50f, 51.6f); close()
        }
        drawPath(moustache, Hair)
    } else if (role == Role.JACK) {
        // A young prince: the first fine line of a moustache.
        drawPath(path { moveTo(44.4f, 51.6f); quadraticTo(50f, 50.4f, 55.6f, 51.6f) }, Hair, style = Stroke(0.7f, cap = StrokeCap.Round))
    }
}

// ---- Headgear ------------------------------------------------------------------------------------------

private fun DrawScope.drawKingTurban(robe: Color) {
    val dome = path {
        moveTo(30.5f, 38f); cubicTo(24f, 17f, 39f, 1f, 50f, 1f); cubicTo(61f, 1f, 76f, 17f, 69.5f, 38f)
        cubicTo(62f, 31.5f, 38f, 31.5f, 30.5f, 38f); close()
    }
    drawPath(dome, Brush.verticalGradient(listOf(Ivory, IvoryShade), startY = 1f, endY = 38f))
    clipPath(dome) {
        // Cloth folds in the colour of the court.
        drawPath(path { moveTo(28f, 33f); cubicTo(36f, 14f, 54f, 6f, 72f, 14f) }, robe, style = Stroke(3.6f, cap = StrokeCap.Round))
        drawPath(path { moveTo(28f, 40f); cubicTo(38f, 22f, 58f, 15f, 74f, 25f) }, Gold, style = Stroke(3f, cap = StrokeCap.Round))
        drawPath(path { moveTo(30f, 26f); cubicTo(38f, 9f, 52f, 2f, 66f, 6f) }, Gold.copy(alpha = 0.8f), style = Stroke(1.6f, cap = StrokeCap.Round))
        drawPath(path { moveTo(26f, 46f); cubicTo(40f, 31f, 60f, 27f, 76f, 36f) }, robe.darken(0.25f), style = Stroke(2.2f, cap = StrokeCap.Round))
    }
    drawPath(path { moveTo(30.5f, 38f); cubicTo(38f, 32.5f, 62f, 32.5f, 69.5f, 38f) }, GoldDark, style = Stroke(1.8f, cap = StrokeCap.Round))
    drawPath(dome, GoldDark.copy(alpha = 0.55f), style = Stroke(0.6f))
    // Sarpech: a gold jewel pin with a ruby, and an aigrette plume rising from it.
    val plume = Color(0xFFFFF4D9)
    listOf(-16f, -8f, 0f, 8f, 16f).forEach { spread ->
        drawPath(
            path { moveTo(50f, 20f); quadraticTo(50f + spread * 0.7f, 8f, 50f + spread * 1.35f, -2f) },
            plume.copy(alpha = if (spread == 0f) 1f else 0.78f), style = Stroke(1.15f, cap = StrokeCap.Round)
        )
        drawCircle(Gold, 1.05f, Offset(50f + spread * 1.35f, -2f))
    }
    val pin = path { moveTo(50f, 17f); cubicTo(57f, 23f, 56f, 32f, 50f, 33f); cubicTo(44f, 32f, 43f, 23f, 50f, 17f); close() }
    drawPath(pin, Gold)
    drawPath(pin, GoldDark, style = Stroke(0.6f))
    drawCircle(Ruby, 3.1f, Offset(50f, 26f))
    drawCircle(Color.White.copy(alpha = 0.6f), 0.8f, Offset(49f, 25f))
}

private fun DrawScope.drawJackTurban(robe: Color) {
    val dome = path {
        moveTo(32.5f, 37f); cubicTo(29f, 21f, 40f, 9f, 50f, 9f); cubicTo(60f, 9f, 71f, 21f, 67.5f, 37f)
        cubicTo(61f, 31.5f, 39f, 31.5f, 32.5f, 37f); close()
    }
    drawPath(dome, Brush.verticalGradient(listOf(Ivory, IvoryShade), startY = 9f, endY = 37f))
    clipPath(dome) {
        drawPath(path { moveTo(28f, 34f); cubicTo(37f, 17f, 54f, 12f, 72f, 20f) }, robe, style = Stroke(3.8f, cap = StrokeCap.Round))
        drawPath(path { moveTo(28f, 42f); cubicTo(38f, 25f, 58f, 20f, 74f, 29f) }, Gold, style = Stroke(2.6f, cap = StrokeCap.Round))
    }
    drawPath(path { moveTo(32.5f, 37f); cubicTo(39f, 32f, 61f, 32f, 67.5f, 37f) }, GoldDark, style = Stroke(1.6f, cap = StrokeCap.Round))
    drawPath(dome, GoldDark.copy(alpha = 0.55f), style = Stroke(0.6f))
    // Peacock feather, swept back from a small gold brooch.
    drawPath(path { moveTo(55f, 20f); quadraticTo(68f, 14f, 78f, 3f) }, GoldDark, style = Stroke(0.9f, cap = StrokeCap.Round))
    withTransform({ rotate(-35f, pivot = Offset(77f, 6f)) }) {
        drawOval(Emerald, Offset(73f, -3f), Size(8f, 13f))
        drawOval(Gold, Offset(74.6f, 0f), Size(4.8f, 7.5f))
        drawOval(Sapphire, Offset(75.7f, 1.8f), Size(2.6f, 4f))
    }
    val brooch = Offset(50f, 22f)
    drawCircle(Gold, 3.6f, brooch)
    drawCircle(Emerald, 2.3f, brooch)
}

private fun DrawScope.drawVeilBack(robe: Color) {
    val veil = path {
        moveTo(50f, 6f); cubicTo(20f, 6f, 14f, 44f, 18f, 76f); lineTo(82f, 76f); cubicTo(86f, 44f, 80f, 6f, 50f, 6f); close()
    }
    drawPath(veil, Brush.verticalGradient(listOf(Ivory.copy(alpha = 0.92f), robe.lighten(0.2f).copy(alpha = 0.85f)), startY = 6f, endY = 76f))
    drawPath(veil, Gold, style = Stroke(1.2f))
    // A border of tiny gold motifs along the edge of the veil.
    for (i in 0..8) {
        val t = i / 8f
        drawCircle(Gold, 0.9f, Offset(18.6f + t * 2f, 36f + t * 38f))
        drawCircle(Gold, 0.9f, Offset(81.4f - t * 2f, 36f + t * 38f))
    }
}

private fun DrawScope.drawQueenCrown(robe: Color) {
    // Veil drawn over the hair at the sides of the face.
    drawPath(
        path { moveTo(33.5f, 30f); cubicTo(26f, 40f, 27f, 58f, 24f, 72f); lineTo(30f, 72f); cubicTo(31f, 58f, 31f, 44f, 36f, 36f); close() },
        Ivory.copy(alpha = 0.55f)
    )
    drawPath(
        path { moveTo(66.5f, 30f); cubicTo(74f, 40f, 73f, 58f, 76f, 72f); lineTo(70f, 72f); cubicTo(69f, 58f, 69f, 44f, 64f, 36f); close() },
        Ivory.copy(alpha = 0.55f)
    )
    // The mukut: a gold band topped with lotus-petal points tipped with pearls.
    val band = path {
        moveTo(33.5f, 30f); quadraticTo(50f, 22.5f, 66.5f, 30f); lineTo(65.8f, 25f); quadraticTo(50f, 17.5f, 34.2f, 25f); close()
    }
    for (k in -3..3) {
        val x = 50f + k * 5.6f
        val baseY = 21f + (k * k) * 0.55f
        val tipY = 7f + kotlin.math.abs(k) * 3.4f
        val petal = path {
            moveTo(x - 3.1f, baseY); quadraticTo(x - 3f, tipY + 4f, x, tipY); quadraticTo(x + 3f, tipY + 4f, x + 3.1f, baseY); close()
        }
        drawPath(petal, Gold)
        drawPath(petal, GoldDark, style = Stroke(0.5f))
        drawCircle(Ivory, 1.15f, Offset(x, tipY - 0.6f))
    }
    drawPath(band, Gold)
    drawPath(band, GoldDark, style = Stroke(0.6f))
    drawCircle(Ruby, 2.3f, Offset(50f, 22.2f))
    drawCircle(Emerald, 1.4f, Offset(42.4f, 23.4f))
    drawCircle(Emerald, 1.4f, Offset(57.6f, 23.4f))
    // Maang tikka: a chain down the parting to a pendant on the forehead.
    drawLine(Ruby, Offset(50f, 27.5f), Offset(50f, 30f), strokeWidth = 0.9f)
    drawLine(Gold, Offset(50f, 29f), Offset(50f, 35.6f), strokeWidth = 0.8f)
    drawCircle(Gold, 2.4f, Offset(50f, 37.2f))
    drawCircle(Ruby, 1.5f, Offset(50f, 37.2f))
}

// ---- What each of them holds ---------------------------------------------------------------------------

private fun DrawScope.drawTalwar() {
    // A curved talwar rising behind the right shoulder.
    val blade = path { moveTo(88f, 96f); quadraticTo(98f, 68f, 90f, 44f) }
    drawPath(blade, Color.Black.copy(alpha = 0.35f), style = Stroke(3.6f, cap = StrokeCap.Round))
    drawPath(blade, Steel, style = Stroke(2.6f, cap = StrokeCap.Round))
    drawPath(path { moveTo(88.6f, 95f); quadraticTo(97.4f, 68f, 89.6f, 45.4f) }, Color.White.copy(alpha = 0.7f), style = Stroke(0.7f, cap = StrokeCap.Round))
    drawLine(Gold, Offset(82f, 93f), Offset(94f, 90f), strokeWidth = 2.2f, cap = StrokeCap.Round)
    drawCircle(Ruby, 1.5f, Offset(88f, 91.6f))
}

private fun DrawScope.drawSpear() {
    drawLine(GoldDark, Offset(14f, 100f), Offset(14f, 22f), strokeWidth = 1.7f, cap = StrokeCap.Round)
    drawLine(Gold, Offset(14f, 100f), Offset(14f, 22f), strokeWidth = 0.7f)
    val head = path { moveTo(14f, 4f); cubicTo(20.5f, 10f, 20.5f, 17f, 14f, 22f); cubicTo(7.5f, 17f, 7.5f, 10f, 14f, 4f); close() }
    drawPath(head, Steel)
    drawPath(head, GoldDark, style = Stroke(0.5f))
    drawLine(Ruby, Offset(14f, 23f), Offset(14f, 31f), strokeWidth = 3.2f, cap = StrokeCap.Round)
    drawLine(Gold, Offset(10.5f, 23.5f), Offset(17.5f, 23.5f), strokeWidth = 1.2f, cap = StrokeCap.Round)
}

private fun DrawScope.drawLotus() {
    // A lotus held at the right, stem running down out of the panel.
    drawPath(path { moveTo(84f, 100f); quadraticTo(86f, 88f, 82f, 76f) }, Emerald, style = Stroke(1.5f, cap = StrokeCap.Round))
    val c = Offset(82f, 72f)
    listOf(-50f, 50f, -25f, 25f, 0f).forEach { angle ->
        withTransform({ rotate(angle, pivot = Offset(c.x, c.y + 6f)) }) {
            val petal = path { moveTo(c.x, c.y + 6f); cubicTo(c.x - 4.6f, c.y + 1f, c.x - 2.6f, c.y - 5f, c.x, c.y - 7f); cubicTo(c.x + 2.6f, c.y - 5f, c.x + 4.6f, c.y + 1f, c.x, c.y + 6f); close() }
            drawPath(petal, Color(0xFFEBA9BC))
            drawPath(petal, Ivory, style = Stroke(0.5f))
        }
    }
    drawCircle(Gold, 1.6f, Offset(c.x, c.y + 3f))
}

// ---- Colour helpers --------------------------------------------------------------------------------------

private fun Color.lighten(by: Float) = Color(red + (1f - red) * by, green + (1f - green) * by, blue + (1f - blue) * by, alpha)
private fun Color.darken(by: Float) = Color(red * (1f - by), green * (1f - by), blue * (1f - by), alpha)
