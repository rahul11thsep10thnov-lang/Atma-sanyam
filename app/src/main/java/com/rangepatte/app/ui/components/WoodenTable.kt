package com.rangepatte.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

enum class TableStyle {
    WOOD,
    HERITAGE_GREEN,
    PARCHMENT
}

private fun TableStyle.brush(): Brush = when (this) {
    TableStyle.WOOD -> Brush.radialGradient(listOf(Color(0xFF7A5A3E), Color(0xFF4A3626)))
    TableStyle.HERITAGE_GREEN -> Brush.radialGradient(listOf(Color(0xFF4B5D42), Color(0xFF2E3A27)))
    TableStyle.PARCHMENT -> Brush.radialGradient(listOf(Color(0xFFF3E9D7), Color(0xFFE0CFA8)))
}

private fun TableStyle.borderColor(): Color = when (this) {
    TableStyle.WOOD -> Color(0xFF2E2119)
    TableStyle.HERITAGE_GREEN -> Color(0xFF1F2A1A)
    TableStyle.PARCHMENT -> Color(0xFFB4822E)
}

/** The playing surface itself — a polished-wood or felt panel that hosts a table's card content. */
@Composable
fun WoodenTable(
    modifier: Modifier = Modifier,
    style: TableStyle = TableStyle.WOOD,
    content: @Composable BoxScope.() -> Unit = {}
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(style.brush())
            .border(2.dp, style.borderColor(), RoundedCornerShape(20.dp))
            .fillMaxSize(),
        content = content
    )
}
