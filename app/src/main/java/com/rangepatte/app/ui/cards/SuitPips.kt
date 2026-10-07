package com.rangepatte.app.ui.cards

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.withTransform
import com.rangepatte.app.domain.model.Suit

/** Heart outline in a −1…1 box, tip at the bottom. */
private fun heartPath(): Path = Path().apply {
    moveTo(0f, 1f)
    cubicTo(-0.15f, 0.8f, -1.05f, 0.25f, -1f, -0.35f)
    cubicTo(-0.95f, -0.95f, -0.2f, -1f, 0f, -0.4f)
    cubicTo(0.2f, -1f, 0.95f, -0.95f, 1f, -0.35f)
    cubicTo(1.05f, 0.25f, 0.15f, 0.8f, 0f, 1f)
    close()
}

private fun diamondPath(): Path = Path().apply {
    moveTo(0f, -1.08f)
    quadraticTo(0.22f, -0.28f, 0.74f, 0f)
    quadraticTo(0.22f, 0.28f, 0f, 1.08f)
    quadraticTo(-0.22f, 0.28f, -0.74f, 0f)
    quadraticTo(-0.22f, -0.28f, 0f, -1.08f)
    close()
}

/** Spade: the heart turned over with a flared stem. */
private fun spadePath(): Path = Path().apply {
    moveTo(0f, -1f)
    cubicTo(0.15f, -0.78f, 1.05f, -0.3f, 1f, 0.28f)
    cubicTo(0.95f, 0.78f, 0.25f, 0.82f, 0.08f, 0.38f)
    cubicTo(0.12f, 0.75f, 0.26f, 0.92f, 0.52f, 1f)
    lineTo(-0.52f, 1f)
    cubicTo(-0.26f, 0.92f, -0.12f, 0.75f, -0.08f, 0.38f)
    cubicTo(-0.25f, 0.82f, -0.95f, 0.78f, -1f, 0.28f)
    cubicTo(-1.05f, -0.3f, -0.15f, -0.78f, 0f, -1f)
    close()
}

/** Club: three round leaves on a flared stem. */
private fun clubPath(): Path = Path().apply {
    addOval(androidx.compose.ui.geometry.Rect(-0.42f, -1f, 0.42f, -0.16f))
    addOval(androidx.compose.ui.geometry.Rect(-0.98f, -0.22f, -0.14f, 0.62f))
    addOval(androidx.compose.ui.geometry.Rect(0.14f, -0.22f, 0.98f, 0.62f))
    moveTo(-0.14f, -0.3f)
    lineTo(0.14f, -0.3f)
    lineTo(0.1f, 0.5f)
    lineTo(-0.1f, 0.5f)
    close()
    moveTo(0.08f, 0.4f)
    cubicTo(0.12f, 0.75f, 0.26f, 0.92f, 0.52f, 1f)
    lineTo(-0.52f, 1f)
    cubicTo(-0.26f, 0.92f, -0.12f, 0.75f, -0.08f, 0.4f)
    close()
}

private val heart = heartPath()
private val diamond = diamondPath()
private val spade = spadePath()
private val club = clubPath()

/**
 * Draws one clean, readable suit symbol of the antique deck, centred at [center], [radius] being half
 * its height. A faint lighter wash and a thin darker rim give it the look of a printed, inked pip.
 * Used everywhere a suit appears — corner indices, pips, medallions — so every suit looks the same
 * everywhere.
 */
internal fun DrawScope.drawSuitPip(suit: Suit, center: Offset, radius: Float, color: Color) {
    val path = when (suit) {
        Suit.HEARTS -> heart
        Suit.DIAMONDS -> diamond
        Suit.SPADES -> spade
        Suit.CLUBS -> club
    }
    withTransform({
        translate(center.x, center.y)
        scale(radius, radius, pivot = Offset.Zero)
    }) {
        drawPath(path, color)
        if (radius > 7f) {
            drawPath(
                path,
                Brush.radialGradient(
                    listOf(Color.White.copy(alpha = 0.20f), Color.Transparent),
                    center = Offset(-0.3f, -0.4f), radius = 1.1f
                )
            )
        }
    }
}
