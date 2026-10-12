package com.rangepatte.app.ui.thumbnails

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import kotlin.math.min

/**
 * The Ludo portrait for its Entertainment tile (stage 1, Design 1): the four-colour cross board on
 * waxed wood, painted in the same ivory-and-gold hand as the card thumbnails, with two tokens on
 * the track and an ivory die in the corner showing a six.
 */
@Composable
fun LudoThumbnail(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.fillMaxSize()) { drawLudoPortrait() }
}

private val Red = Color(0xFFB8352B)
private val Green = Color(0xFF2E7A4F)
private val Blue = Color(0xFF2F4F8A)
private val Yellow = Color(0xFFD9A62A)
private val Ivory = Color(0xFFF3E7CB)
private val Gold = Color(0xFFC9A24B)
private val Ink = Color(0xFF24160C)

private fun DrawScope.drawLudoPortrait() {
    val s = min(size.width, size.height)
    val boardSize = s * 0.78f
    val left = (size.width - boardSize) / 2f
    val top = (size.height - boardSize) / 2f + s * 0.02f
    val cell = boardSize / 15f

    // Board: ivory with a gold rim, slightly tilted like a card on a table.
    rotate(-4f, pivot = Offset(size.width / 2f, size.height / 2f)) {
        drawRoundRect(Color.Black.copy(alpha = 0.35f), Offset(left + s * 0.02f, top + s * 0.03f), Size(boardSize, boardSize), CornerRadius(cell))
        drawRoundRect(Ivory, Offset(left, top), Size(boardSize, boardSize), CornerRadius(cell))
        drawRoundRect(Gold, Offset(left, top), Size(boardSize, boardSize), CornerRadius(cell), style = Stroke(width = s * 0.012f))

        // Four home yards (6×6 cells each), each with an ivory inner square.
        val yard = cell * 6f
        val yards = listOf(Offset(left, top) to Red, Offset(left + cell * 9f, top) to Green, Offset(left, top + cell * 9f) to Blue, Offset(left + cell * 9f, top + cell * 9f) to Yellow)
        yards.forEach { (o, c) ->
            drawRoundRect(c, o, Size(yard, yard), CornerRadius(cell * 0.6f))
            drawRoundRect(Ivory, Offset(o.x + cell * 1.2f, o.y + cell * 1.2f), Size(yard - cell * 2.4f, yard - cell * 2.4f), CornerRadius(cell * 0.5f))
            // The four token nests in each yard.
            for (i in 0..1) for (j in 0..1) {
                drawCircle(c.copy(alpha = 0.55f), radius = cell * 0.55f, center = Offset(o.x + cell * (2.2f + i * 1.6f), o.y + cell * (2.2f + j * 1.6f)))
            }
        }

        // Track grid lines on the arms of the cross.
        val line = Ink.copy(alpha = 0.18f)
        for (i in 0..15) {
            val x = left + cell * i
            val y = top + cell * i
            if (i in 6..9) {
                drawLine(line, Offset(x, top), Offset(x, top + boardSize), strokeWidth = 1f * density)
                drawLine(line, Offset(left, y), Offset(left + boardSize, y), strokeWidth = 1f * density)
            } else {
                drawLine(line, Offset(x, top + cell * 6f), Offset(x, top + cell * 9f), strokeWidth = 1f * density)
                drawLine(line, Offset(left + cell * 6f, y), Offset(left + cell * 9f, y), strokeWidth = 1f * density)
            }
        }
        // Home columns in each colour, leading to the centre.
        drawRect(Red.copy(alpha = 0.85f), Offset(left + cell * 1f, top + cell * 7f), Size(cell * 5f, cell))
        drawRect(Green.copy(alpha = 0.85f), Offset(left + cell * 7f, top + cell * 1f), Size(cell, cell * 5f))
        drawRect(Yellow.copy(alpha = 0.85f), Offset(left + cell * 9f, top + cell * 7f), Size(cell * 5f, cell))
        drawRect(Blue.copy(alpha = 0.85f), Offset(left + cell * 7f, top + cell * 9f), Size(cell, cell * 5f))
        // Centre: four triangles meeting.
        val c = Offset(left + cell * 7.5f, top + cell * 7.5f)
        val h = cell * 1.5f
        fun tri(a: Offset, b: Offset, color: Color) {
            drawPath(androidx.compose.ui.graphics.Path().apply { moveTo(c.x, c.y); lineTo(a.x, a.y); lineTo(b.x, b.y); close() }, color)
        }
        tri(Offset(c.x - h, c.y - h), Offset(c.x - h, c.y + h), Red)
        tri(Offset(c.x - h, c.y - h), Offset(c.x + h, c.y - h), Green)
        tri(Offset(c.x + h, c.y - h), Offset(c.x + h, c.y + h), Yellow)
        tri(Offset(c.x - h, c.y + h), Offset(c.x + h, c.y + h), Blue)
        // Safe-square stars on the four start squares.
        val star = Ink.copy(alpha = 0.35f)
        listOf(Offset(left + cell * 1.5f, top + cell * 6.5f), Offset(left + cell * 8.5f, top + cell * 1.5f), Offset(left + cell * 13.5f, top + cell * 8.5f), Offset(left + cell * 6.5f, top + cell * 13.5f))
            .forEach { drawCircle(star, radius = cell * 0.22f, center = it) }

        // Two tokens on the track: a red one leaving its yard, a blue one further along.
        drawToken(Offset(left + cell * 2.5f, top + cell * 6.5f), cell * 0.62f, Red)
        drawToken(Offset(left + cell * 7.5f, top + cell * 12.5f), cell * 0.62f, Blue)
    }

    // The die, ivory with a gold edge, showing a six, in the lower-right corner.
    val d = s * 0.2f
    val dieTop = Offset(size.width - d - s * 0.05f, size.height - d - s * 0.05f)
    rotate(12f, pivot = Offset(dieTop.x + d / 2f, dieTop.y + d / 2f)) {
        drawRoundRect(Color.Black.copy(alpha = 0.4f), Offset(dieTop.x + d * 0.08f, dieTop.y + d * 0.1f), Size(d, d), CornerRadius(d * 0.2f))
        drawRoundRect(Brush.verticalGradient(listOf(Color.White, Ivory)), dieTop, Size(d, d), CornerRadius(d * 0.2f))
        drawRoundRect(Gold, dieTop, Size(d, d), CornerRadius(d * 0.2f), style = Stroke(width = d * 0.06f))
        val pip = d * 0.09f
        for (i in 0..1) for (j in 0..2) {
            drawCircle(Ink, radius = pip, center = Offset(dieTop.x + d * (0.3f + i * 0.4f), dieTop.y + d * (0.25f + j * 0.25f)))
        }
    }
}

private fun DrawScope.drawToken(center: Offset, radius: Float, color: Color) {
    drawCircle(Color.Black.copy(alpha = 0.35f), radius = radius, center = Offset(center.x + radius * 0.15f, center.y + radius * 0.25f))
    drawCircle(Brush.radialGradient(listOf(color.copy(alpha = 1f), color.copy(alpha = 0.75f)), center = Offset(center.x - radius * 0.3f, center.y - radius * 0.3f), radius = radius * 1.4f), radius = radius, center = center)
    drawCircle(Ivory, radius = radius, center = center, style = Stroke(width = radius * 0.18f))
    drawCircle(Color.White.copy(alpha = 0.6f), radius = radius * 0.28f, center = Offset(center.x - radius * 0.3f, center.y - radius * 0.3f))
}
