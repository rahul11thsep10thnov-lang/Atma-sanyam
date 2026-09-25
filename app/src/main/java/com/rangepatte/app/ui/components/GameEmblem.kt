package com.rangepatte.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import com.rangepatte.app.domain.model.GameId
import kotlin.math.cos
import kotlin.math.sin

/**
 * A small original vector emblem per game — a fanned hand, a crown, a partnership ring, and so on
 * — used on [GameTile] instead of a generic suit glyph. These are simple procedural shapes, not
 * illustrated artwork (no image-generation tool is available in this environment); see README for
 * how a real illustrated badge could later replace one of these `draw*Emblem` bodies.
 */
@Composable
fun GameEmblem(gameId: GameId, color: Color, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.fillMaxSize()) {
        val center = Offset(size.width / 2f, size.height / 2f)
        val radius = minOf(size.width, size.height) / 2f
        when (gameId) {
            GameId.TEEN_PATTI -> drawCardFanEmblem(center, radius, color, sameSuit = false)
            GameId.FLUSH -> drawCardFanEmblem(center, radius, color, sameSuit = true)
            GameId.RUMMY -> drawSequenceEmblem(center, radius, color)
            GameId.COAT_PIECE -> drawCrownEmblem(center, radius, color)
            GameId.TWENTY_NINE -> drawPartnershipEmblem(center, radius, color)
            GameId.DEHLA_PAKAD -> drawTenEmblem(center, radius, color)
            GameId.LAKADI -> drawSpadeEmblem(center, radius, color)
            GameId.SOLITAIRE -> drawFoundationEmblem(center, radius, color)
            GameId.SPIDER_SOLITAIRE -> drawSpiderEmblem(center, radius, color)
        }
    }
}

private fun DrawScope.drawCardFanEmblem(center: Offset, radius: Float, color: Color, sameSuit: Boolean) {
    val cardW = radius * 0.7f
    val cardH = radius * 1.1f
    val pivot = Offset(center.x, center.y + cardH * 0.4f)
    listOf(-18f, 0f, 18f).forEach { angle ->
        rotate(degrees = angle, pivot = pivot) {
            drawRoundRect(
                color = color.copy(alpha = 0.85f),
                topLeft = Offset(center.x - cardW / 2f, center.y - cardH / 2f),
                size = Size(cardW, cardH),
                cornerRadius = CornerRadius(radius * 0.08f),
                style = Stroke(width = radius * 0.06f)
            )
        }
    }
    if (sameSuit) {
        drawCircle(color = color, radius = radius * 0.12f, center = center)
    }
}

private fun DrawScope.drawSequenceEmblem(center: Offset, radius: Float, color: Color) {
    val cardW = radius * 0.55f
    val cardH = radius * 0.85f
    val step = radius * 0.35f
    for (i in -1..1) {
        drawRoundRect(
            color = color.copy(alpha = 0.85f),
            topLeft = Offset(center.x - cardW / 2f + i * step, center.y - cardH / 2f - i * step * 0.5f),
            size = Size(cardW, cardH),
            cornerRadius = CornerRadius(radius * 0.08f),
            style = Stroke(width = radius * 0.06f)
        )
    }
}

private fun DrawScope.drawCrownEmblem(center: Offset, radius: Float, color: Color) {
    val w = radius * 1.4f
    val baseY = center.y + radius * 0.45f
    val topY = center.y - radius * 0.55f
    val path = Path().apply {
        moveTo(center.x - w / 2f, baseY)
        lineTo(center.x - w / 2f, center.y)
        lineTo(center.x - w / 4f, topY)
        lineTo(center.x, center.y - radius * 0.1f)
        lineTo(center.x + w / 4f, topY)
        lineTo(center.x + w / 2f, center.y)
        lineTo(center.x + w / 2f, baseY)
        close()
    }
    drawPath(path, color = color.copy(alpha = 0.85f))
    drawLine(
        color = color,
        start = Offset(center.x - w / 2f, baseY),
        end = Offset(center.x + w / 2f, baseY),
        strokeWidth = radius * 0.1f
    )
}

private fun DrawScope.drawPartnershipEmblem(center: Offset, radius: Float, color: Color) {
    val r = radius * 0.45f
    val offset = radius * 0.28f
    drawCircle(color = color, radius = r, center = Offset(center.x - offset, center.y), style = Stroke(width = radius * 0.08f))
    drawCircle(color = color, radius = r, center = Offset(center.x + offset, center.y), style = Stroke(width = radius * 0.08f))
}

private fun DrawScope.drawTenEmblem(center: Offset, radius: Float, color: Color) {
    val cardW = radius * 0.9f
    val cardH = radius * 1.3f
    drawRoundRect(
        color = color,
        topLeft = Offset(center.x - cardW / 2f, center.y - cardH / 2f),
        size = Size(cardW, cardH),
        cornerRadius = CornerRadius(radius * 0.1f),
        style = Stroke(width = radius * 0.07f)
    )
    val dotR = radius * 0.09f
    val dx = cardW * 0.22f
    val dy = cardH * 0.22f
    for (sx in intArrayOf(-1, 1)) {
        for (sy in intArrayOf(-1, 1)) {
            drawCircle(color = color, radius = dotR, center = Offset(center.x + sx * dx, center.y + sy * dy))
        }
    }
}

private fun DrawScope.drawSpadeEmblem(center: Offset, radius: Float, color: Color) {
    val r = radius * 0.8f
    val path = Path().apply {
        moveTo(center.x, center.y - r)
        cubicTo(
            center.x + r * 0.9f, center.y - r * 0.1f,
            center.x + r * 0.5f, center.y + r * 0.5f,
            center.x, center.y + r * 0.3f
        )
        cubicTo(
            center.x - r * 0.5f, center.y + r * 0.5f,
            center.x - r * 0.9f, center.y - r * 0.1f,
            center.x, center.y - r
        )
        close()
    }
    drawPath(path, color = color.copy(alpha = 0.85f))
    drawLine(
        color = color,
        start = Offset(center.x, center.y + r * 0.3f),
        end = Offset(center.x, center.y + r * 0.8f),
        strokeWidth = radius * 0.09f
    )
}

private fun DrawScope.drawFoundationEmblem(center: Offset, radius: Float, color: Color) {
    val pileW = radius * 0.35f
    val pileH = radius * 0.5f
    val gap = radius * 0.12f
    val totalW = pileW * 4 + gap * 3
    val startX = center.x - totalW / 2f
    for (i in 0 until 4) {
        drawRoundRect(
            color = color.copy(alpha = 0.85f),
            topLeft = Offset(startX + i * (pileW + gap), center.y - pileH / 2f),
            size = Size(pileW, pileH),
            cornerRadius = CornerRadius(radius * 0.06f),
            style = Stroke(width = radius * 0.05f)
        )
    }
}

private fun DrawScope.drawSpiderEmblem(center: Offset, radius: Float, color: Color) {
    drawCircle(color = color, radius = radius * 0.22f, center = center)
    val legCount = 8
    for (i in 0 until legCount) {
        val angle = (2 * Math.PI / legCount) * i
        val end = Offset(
            x = center.x + (radius * 0.85f * cos(angle)).toFloat(),
            y = center.y + (radius * 0.85f * sin(angle)).toFloat()
        )
        drawLine(color = color, start = center, end = end, strokeWidth = radius * 0.06f)
    }
}
