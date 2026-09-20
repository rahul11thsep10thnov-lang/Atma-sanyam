package com.rangepatte.app.ui.cards

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.domain.model.Suit
import kotlin.math.cos
import kotlin.math.sin

/**
 * Stylized Indian-motif stand-ins for the four suits (lotus / ornamental diamond / paisley leaf /
 * spear-leaf), used as the card's large center emblem. The small conventional ♠♥♦♣ glyph still
 * appears at the corners (see [CardFace]) so the suit is unambiguous at a glance during play —
 * this motif is decoration, never the only way to identify a card.
 */
@Composable
fun SuitMotif(suit: Suit, color: Color, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.fillMaxSize()) {
        val center = Offset(size.width / 2f, size.height / 2f)
        val radius = minOf(size.width, size.height) / 2f
        when (suit) {
            Suit.HEARTS -> drawLotus(center, radius, color)
            Suit.DIAMONDS -> drawOrnamentalDiamond(center, radius, color)
            Suit.CLUBS -> drawPaisleyLeaf(center, radius, color)
            Suit.SPADES -> drawSpearLeaf(center, radius, color)
        }
    }
}

private fun DrawScope.drawLotus(center: Offset, radius: Float, color: Color) {
    val petalCount = 5
    val petalReach = radius * 0.85f
    for (i in 0 until petalCount) {
        val angle = (-Math.PI / 2) + (2 * Math.PI / petalCount) * i
        val tip = Offset(
            x = center.x + (petalReach * cos(angle)).toFloat(),
            y = center.y + (petalReach * sin(angle)).toFloat()
        )
        val leftAngle = angle - 0.35
        val rightAngle = angle + 0.35
        val leftCtrl = Offset(
            x = center.x + (petalReach * 0.55f * cos(leftAngle)).toFloat(),
            y = center.y + (petalReach * 0.55f * sin(leftAngle)).toFloat()
        )
        val rightCtrl = Offset(
            x = center.x + (petalReach * 0.55f * cos(rightAngle)).toFloat(),
            y = center.y + (petalReach * 0.55f * sin(rightAngle)).toFloat()
        )
        val petal = Path().apply {
            moveTo(center.x, center.y)
            quadraticTo(leftCtrl.x, leftCtrl.y, tip.x, tip.y)
            quadraticTo(rightCtrl.x, rightCtrl.y, center.x, center.y)
            close()
        }
        drawPath(petal, color = color.copy(alpha = 0.9f))
    }
    drawCircle(color = color, radius = radius * 0.16f, center = center)
}

private fun DrawScope.drawOrnamentalDiamond(center: Offset, radius: Float, color: Color) {
    val r = radius * 0.85f
    val outer = Path().apply {
        moveTo(center.x, center.y - r)
        lineTo(center.x + r * 0.62f, center.y)
        lineTo(center.x, center.y + r)
        lineTo(center.x - r * 0.62f, center.y)
        close()
    }
    drawPath(outer, color = color)
    val inner = Path().apply {
        moveTo(center.x, center.y - r * 0.5f)
        lineTo(center.x + r * 0.3f, center.y)
        lineTo(center.x, center.y + r * 0.5f)
        lineTo(center.x - r * 0.3f, center.y)
        close()
    }
    drawPath(inner, color = Color.White.copy(alpha = 0.35f))
    val dotRadius = radius * 0.06f
    drawCircle(color = color, radius = dotRadius, center = Offset(center.x, center.y - r))
    drawCircle(color = color, radius = dotRadius, center = Offset(center.x, center.y + r))
    drawCircle(color = color, radius = dotRadius, center = Offset(center.x + r * 0.62f, center.y))
    drawCircle(color = color, radius = dotRadius, center = Offset(center.x - r * 0.62f, center.y))
}

/** A paisley "comma" — a rounded teardrop head with a curled tail, drawn as one closed path. */
private fun DrawScope.drawPaisleyLeaf(center: Offset, radius: Float, color: Color) {
    val r = radius * 0.8f
    val top = Offset(center.x, center.y - r)
    val path = Path().apply {
        moveTo(top.x, top.y)
        cubicTo(
            top.x + r * 0.95f, top.y + r * 0.15f,
            center.x + r * 0.55f, center.y + r * 0.85f,
            center.x - r * 0.05f, center.y + r * 0.95f
        )
        cubicTo(
            center.x - r * 0.85f, center.y + r * 1.05f,
            center.x - r * 1.05f, center.y + r * 0.15f,
            center.x - r * 0.35f, center.y - r * 0.15f
        )
        cubicTo(
            center.x - r * 0.05f, center.y - r * 0.35f,
            top.x - r * 0.35f, top.y + r * 0.15f,
            top.x, top.y
        )
        close()
    }
    drawPath(path, color = color.copy(alpha = 0.9f))
    drawCircle(color = color, radius = radius * 0.08f, center = Offset(center.x - r * 0.15f, center.y - r * 0.35f))
}

/** An elongated, pointed leaf — a royal spear-leaf stand-in for spades — with a small base stem. */
private fun DrawScope.drawSpearLeaf(center: Offset, radius: Float, color: Color) {
    val r = radius * 0.9f
    val topTip = Offset(center.x, center.y - r)
    val bottomTip = Offset(center.x, center.y + r * 0.55f)
    val leaf = Path().apply {
        moveTo(topTip.x, topTip.y)
        cubicTo(
            topTip.x + r * 0.7f, topTip.y + r * 0.6f,
            topTip.x + r * 0.55f, bottomTip.y - r * 0.3f,
            bottomTip.x, bottomTip.y
        )
        cubicTo(
            topTip.x - r * 0.55f, bottomTip.y - r * 0.3f,
            topTip.x - r * 0.7f, topTip.y + r * 0.6f,
            topTip.x, topTip.y
        )
        close()
    }
    drawPath(leaf, color = color.copy(alpha = 0.9f))
    // Center vein.
    drawLine(
        color = Color.White.copy(alpha = 0.25f),
        start = Offset(center.x, topTip.y + r * 0.15f),
        end = bottomTip,
        strokeWidth = radius * 0.05f
    )
    // Stem.
    drawLine(
        color = color,
        start = bottomTip,
        end = Offset(center.x, center.y + r * 0.9f),
        strokeWidth = radius * 0.09f
    )
}

/**
 * Ornamental (not photorealistic) crest for face cards — a simple vector crown/diadem/plume
 * silhouette rather than an illustrated portrait, since no image-generation tool is available in
 * this environment to paint real Mughal-miniature-style character art. See README for how a real
 * illustration could later replace this composable without touching any calling screen.
 */
@Composable
fun FaceCardCrest(rank: Rank, color: Color, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.fillMaxSize()) {
        val center = Offset(size.width / 2f, size.height / 2f)
        val radius = minOf(size.width, size.height) / 2f
        when (rank) {
            Rank.KING -> drawCrown(center, radius, color)
            Rank.QUEEN -> drawDiadem(center, radius, color)
            else -> drawPlume(center, radius, color)
        }
    }
}

private fun DrawScope.drawCrown(center: Offset, radius: Float, color: Color) {
    val w = radius * 1.5f
    val baseY = center.y + radius * 0.45f
    val topY = center.y - radius * 0.6f
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
    drawPath(path, color = color)
    drawCircle(color = color, radius = radius * 0.09f, center = Offset(center.x, topY))
    drawLine(color = color, start = Offset(center.x - w / 2f, baseY), end = Offset(center.x + w / 2f, baseY), strokeWidth = radius * 0.12f)
}

private fun DrawScope.drawDiadem(center: Offset, radius: Float, color: Color) {
    val w = radius * 1.3f
    val baseY = center.y + radius * 0.35f
    val arc = Path().apply {
        moveTo(center.x - w / 2f, baseY)
        quadraticTo(center.x, baseY - radius * 1.1f, center.x + w / 2f, baseY)
    }
    drawPath(arc, color = color, style = Stroke(width = radius * 0.1f))
    drawCircle(color = color, radius = radius * 0.14f, center = Offset(center.x, baseY - radius * 0.75f))
    drawLine(color = color, start = Offset(center.x - w / 2f, baseY), end = Offset(center.x + w / 2f, baseY), strokeWidth = radius * 0.1f)
}

private fun DrawScope.drawPlume(center: Offset, radius: Float, color: Color) {
    val baseY = center.y + radius * 0.5f
    val tip = Offset(center.x, center.y - radius * 0.85f)
    val plume = Path().apply {
        moveTo(center.x, baseY)
        cubicTo(
            center.x + radius * 0.6f, baseY - radius * 0.3f,
            center.x + radius * 0.35f, tip.y + radius * 0.2f,
            tip.x, tip.y
        )
        cubicTo(
            center.x - radius * 0.35f, tip.y + radius * 0.2f,
            center.x - radius * 0.6f, baseY - radius * 0.3f,
            center.x, baseY
        )
        close()
    }
    drawPath(plume, color = color.copy(alpha = 0.9f))
    drawLine(color = color, start = Offset(center.x - radius * 0.45f, baseY), end = Offset(center.x + radius * 0.45f, baseY), strokeWidth = radius * 0.08f)
}

/** Small quarter-mandala flourish drawn at each inner corner of the card frame. */
internal fun DrawScope.drawCornerFlourish(corner: Offset, scale: Float, color: Color, mirrorX: Boolean, mirrorY: Boolean) {
    val dx = if (mirrorX) -1f else 1f
    val dy = if (mirrorY) -1f else 1f
    drawCircle(color = color.copy(alpha = 0.55f), radius = scale * 0.18f, center = corner)
    val path = Path().apply {
        moveTo(corner.x, corner.y)
        quadraticTo(corner.x + dx * scale * 0.6f, corner.y, corner.x + dx * scale, corner.y + dy * scale * 0.15f)
    }
    drawPath(path, color = color.copy(alpha = 0.45f), style = Stroke(width = scale * 0.08f))
    val path2 = Path().apply {
        moveTo(corner.x, corner.y)
        quadraticTo(corner.x, corner.y + dy * scale * 0.6f, corner.x + dx * scale * 0.15f, corner.y + dy * scale)
    }
    drawPath(path2, color = color.copy(alpha = 0.45f), style = Stroke(width = scale * 0.08f))
}
