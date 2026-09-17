package com.rangepatte.app.ui.cards

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.theme.PlayingCardCornerRadius
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * An original geometric-floral card back — inspired by lotus/paisley motifs, not a reproduction of
 * any existing manufacturer's design. Drawn procedurally so no external art asset is required.
 */
@Composable
internal fun CardBack(palette: CardPalette, modifier: Modifier = Modifier) {
    Canvas(
        modifier = modifier
            .fillMaxSize()
            .background(palette.backBase, RoundedCornerShape(PlayingCardCornerRadius))
            .border(1.dp, palette.backOrnament, RoundedCornerShape(PlayingCardCornerRadius))
    ) {
        val center = Offset(size.width / 2f, size.height / 2f)
        val outerRadius = min(size.width, size.height) * 0.32f
        val innerRadius = outerRadius * 0.45f
        val petalCount = 8

        // Diamond lattice border, inset from the card edge.
        val inset = 6.dp.toPx()
        drawRect(
            color = palette.backOrnament.copy(alpha = 0.55f),
            topLeft = Offset(inset, inset),
            size = Size(size.width - inset * 2, size.height - inset * 2),
            style = Stroke(width = 1.dp.toPx())
        )

        // Central lotus-like rosette made of overlapping petals.
        for (i in 0 until petalCount) {
            val angle = (2 * Math.PI / petalCount) * i
            val petalTip = Offset(
                x = center.x + (outerRadius * cos(angle)).toFloat(),
                y = center.y + (outerRadius * sin(angle)).toFloat()
            )
            drawLine(
                color = palette.backOrnament,
                start = center,
                end = petalTip,
                strokeWidth = 1.5.dp.toPx()
            )
            drawCircle(
                color = palette.backOrnament,
                radius = innerRadius * 0.28f,
                center = Offset(
                    x = center.x + ((outerRadius * 0.7f) * cos(angle)).toFloat(),
                    y = center.y + ((outerRadius * 0.7f) * sin(angle)).toFloat()
                )
            )
        }

        drawCircle(
            color = palette.backOrnament,
            radius = innerRadius,
            center = center,
            style = Stroke(width = 1.5.dp.toPx())
        )
        drawCircle(
            color = palette.backOrnament.copy(alpha = 0.85f),
            radius = innerRadius * 0.35f,
            center = center
        )
    }
}
