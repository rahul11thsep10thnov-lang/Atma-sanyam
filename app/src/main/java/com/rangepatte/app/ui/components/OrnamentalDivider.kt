package com.rangepatte.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.theme.RoyalGold

/**
 * A short gold flourish rule — two lines running out from a small central diamond — used under
 * titles and section headers instead of a plain Material [androidx.compose.material3.Divider].
 * Kept deliberately restrained (a single motif, not a repeating border) per the "elegant grandeur,
 * not an over-decorated festival poster" design direction.
 */
@Composable
fun OrnamentalDivider(
    modifier: Modifier = Modifier,
    color: Color = RoyalGold
) {
    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(14.dp)
    ) {
        val centerY = size.height / 2f
        val centerX = size.width / 2f
        val gap = 10.dp.toPx()
        val strokeWidth = 1.dp.toPx()

        drawLine(
            color = color.copy(alpha = 0.7f),
            start = Offset(0f, centerY),
            end = Offset(centerX - gap, centerY),
            strokeWidth = strokeWidth
        )
        drawLine(
            color = color.copy(alpha = 0.7f),
            start = Offset(centerX + gap, centerY),
            end = Offset(size.width, centerY),
            strokeWidth = strokeWidth
        )

        val d = 5.dp.toPx()
        drawLine(color = color, start = Offset(centerX - d, centerY), end = Offset(centerX, centerY - d), strokeWidth = strokeWidth)
        drawLine(color = color, start = Offset(centerX, centerY - d), end = Offset(centerX + d, centerY), strokeWidth = strokeWidth)
        drawLine(color = color, start = Offset(centerX + d, centerY), end = Offset(centerX, centerY + d), strokeWidth = strokeWidth)
        drawLine(color = color, start = Offset(centerX, centerY + d), end = Offset(centerX - d, centerY), strokeWidth = strokeWidth)
        drawCircle(color = color, radius = 1.5.dp.toPx(), center = Offset(centerX, centerY), style = Stroke(width = strokeWidth))
    }
}
