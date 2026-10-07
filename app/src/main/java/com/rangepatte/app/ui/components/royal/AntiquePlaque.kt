package com.rangepatte.app.ui.components.royal

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow

/**
 * The look of every information plaque on the table — nameplates, scores, status boards: polished
 * dark walnut with a double gold rule and a small brass stud in each corner, like a label screwed to
 * antique furniture. [active] (a player's turn) lights the plaque: warmer wood, a brighter rule and a
 * soft gold glow around it.
 */
fun Modifier.antiquePlaque(
    active: Boolean = false,
    cornerRadius: Dp = 7.dp,
    shape: Shape = RoundedCornerShape(cornerRadius)
): Modifier = this
    .shadow(elevation = if (active) 7.dp else 4.dp, shape = shape, clip = false)
    .drawBehind {
        val corner = CornerRadius(cornerRadius.toPx())
        if (active) {
            for (i in 3 downTo 1) {
                val grow = 2.5.dp.toPx() * i
                drawRoundRect(
                    GoldenGlow.copy(alpha = 0.10f), Offset(-grow, -grow), Size(size.width + grow * 2, size.height + grow * 2),
                    CornerRadius(cornerRadius.toPx() + grow)
                )
            }
        }
        drawRoundRect(
            brush = Brush.verticalGradient(
                if (active) listOf(Color(0xFF6B4423), Color(0xFF3A2210)) else listOf(Color(0xFF4A2D17), Color(0xFF26150A))
            ),
            cornerRadius = corner
        )
        // Light along the top edge, as on a rounded, waxed surface.
        drawRoundRect(
            brush = Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.12f), Color.Transparent), endY = size.height * 0.5f),
            cornerRadius = corner
        )
        drawRoundRect(
            brush = Brush.linearGradient(
                listOf(GoldBevelLight, GoldBevelDark, GoldBevelLight),
                start = Offset.Zero, end = Offset(size.width, size.height)
            ),
            cornerRadius = corner,
            style = Stroke(width = (if (active) 2.2f else 1.5f).dp.toPx())
        )
        val inset = 3.5.dp.toPx()
        drawRoundRect(
            color = GoldBevelDark.copy(alpha = 0.55f),
            topLeft = Offset(inset, inset),
            size = Size(size.width - inset * 2, size.height - inset * 2),
            cornerRadius = CornerRadius((cornerRadius.toPx() - 2.dp.toPx()).coerceAtLeast(1f)),
            style = Stroke(width = 0.7.dp.toPx())
        )
        val stud = 1.2.dp.toPx()
        val at = 6.dp.toPx()
        listOf(
            Offset(at, at), Offset(size.width - at, at), Offset(at, size.height - at), Offset(size.width - at, size.height - at)
        ).forEach { drawCircle(GoldBevelLight.copy(alpha = 0.8f), stud, it) }
    }
