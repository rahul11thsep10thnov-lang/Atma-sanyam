package com.rangepatte.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.matchParentSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.theme.CharpaiBrown
import com.rangepatte.app.ui.theme.JuteBeige
import com.rangepatte.app.ui.theme.Radii
import com.rangepatte.app.ui.theme.WoodBrown
import kotlin.math.sin

enum class TableStyle {
    CHARPAI,
    WOOD,
    HERITAGE_GREEN,
    PARCHMENT
}

private fun TableStyle.brush(): Brush = when (this) {
    TableStyle.CHARPAI -> Brush.radialGradient(listOf(Color(0xFFC7A876), CharpaiBrown))
    TableStyle.WOOD -> Brush.radialGradient(listOf(Color(0xFF7A5A3E), Color(0xFF4A3626)))
    TableStyle.HERITAGE_GREEN -> Brush.radialGradient(listOf(Color(0xFF4B5D42), Color(0xFF2E3A27)))
    TableStyle.PARCHMENT -> Brush.radialGradient(listOf(Color(0xFFF3E9D7), Color(0xFFE0CFA8)))
}

private fun TableStyle.borderColor(): Color = when (this) {
    TableStyle.CHARPAI -> WoodBrown
    TableStyle.WOOD -> Color(0xFF2E2119)
    TableStyle.HERITAGE_GREEN -> Color(0xFF1F2A1A)
    TableStyle.PARCHMENT -> Color(0xFFB4822E)
}

/**
 * The playing surface itself. [TableStyle.CHARPAI] (the default) renders a traditional Indian
 * woven jute charpai — thick wooden frame, hand-woven rope lattice, warm aged wood grain — the
 * central visual anchor of the game table per the village-courtyard redesign. The other styles
 * are kept as alternate "Table style" options in Settings.
 */
@Composable
fun WoodenTable(
    modifier: Modifier = Modifier,
    style: TableStyle = TableStyle.CHARPAI,
    content: @Composable BoxScope.() -> Unit = {}
) {
    Box(
        modifier = modifier
            .shadow(elevation = 6.dp, shape = RoundedCornerShape(Radii.Charpai))
            .clip(RoundedCornerShape(Radii.Charpai))
            .background(style.brush())
            .border(3.dp, style.borderColor(), RoundedCornerShape(Radii.Charpai))
            .fillMaxSize()
    ) {
        if (style == TableStyle.CHARPAI) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .border(8.dp, WoodBrown, RoundedCornerShape(Radii.Charpai))
            )
            RopeWeave(modifier = Modifier.matchParentSize())
        }
        content()
    }
}

/** Procedural hand-woven jute rope lattice — diagonal crossing cords with a slightly irregular,
 * handmade feel (per-strand alpha jitter) rather than a perfectly uniform machine pattern. */
@Composable
private fun RopeWeave(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val spacing = 13.dp.toPx()
        val strokeWidth = 2.4.dp.toPx()
        val inset = 12.dp.toPx()
        val left = inset
        val top = inset
        val right = size.width - inset
        val bottom = size.height - inset
        if (right <= left || bottom <= top) return@Canvas

        var index = 0
        var x = left - (bottom - top)
        while (x < right) {
            val alpha = 0.55f + 0.2f * sin(index * 2.4f)
            drawLine(
                color = JuteBeige.copy(alpha = alpha.coerceIn(0.35f, 0.8f)),
                start = Offset((x).coerceIn(left, right), top),
                end = Offset((x + (bottom - top)).coerceIn(left, right), bottom),
                strokeWidth = strokeWidth
            )
            x += spacing
            index++
        }

        index = 0
        x = left - (bottom - top)
        while (x < right) {
            val alpha = 0.5f + 0.2f * sin(index * 1.7f + 1.1f)
            drawLine(
                color = JuteBeige.copy(alpha = alpha.coerceIn(0.3f, 0.75f)),
                start = Offset((right - (x - left)).coerceIn(left, right), top),
                end = Offset((right - (x - left) - (bottom - top)).coerceIn(left, right), bottom),
                strokeWidth = strokeWidth
            )
            x += spacing
            index++
        }
    }
}
