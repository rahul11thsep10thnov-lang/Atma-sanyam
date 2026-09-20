package com.rangepatte.app.ui.background

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * Maps a [BackgroundType] to the brush used to paint it. Isolated so real photographic assets can
 * replace these procedural gradients later without any screen needing to change (see class doc on
 * [BackgroundType]).
 */
object BackgroundManager {
    fun brushFor(type: BackgroundType): Brush = when (type) {
        BackgroundType.VILLAGE_CHAUPAL -> Brush.verticalGradient(
            listOf(Color(0xFF3D2A1E), Color(0xFF6B1421), Color(0xFFB5613C), Color(0xFFE08A2C))
        )
        BackgroundType.GARDEN_BALCONY -> Brush.verticalGradient(
            listOf(Color(0xFF6E8A5C), Color(0xFFCBB99E), Color(0xFFF3E9D7))
        )
        BackgroundType.CLASSICAL_LIVING_ROOM -> Brush.verticalGradient(
            listOf(Color(0xFF3B2A20), Color(0xFF6B4A34), Color(0xFFD9A441))
        )
        BackgroundType.MOUNTAIN_VALLEY -> Brush.verticalGradient(
            listOf(Color(0xFF4B5D7A), Color(0xFF8A9A7C), Color(0xFFF3E9D7))
        )
        BackgroundType.WOODEN_VERANDA -> Brush.verticalGradient(
            listOf(Color(0xFF5A3E2B), Color(0xFF7A5A3E), Color(0xFFE9DCC3))
        )
        BackgroundType.COURTYARD -> Brush.verticalGradient(
            listOf(Color(0xFF7A2632), Color(0xFFB4822E), Color(0xFFF3E9D7))
        )
        BackgroundType.EVENING_BALCONY -> Brush.verticalGradient(
            listOf(Color(0xFF241A14), Color(0xFF4B3A2A), Color(0xFFB4822E))
        )
    }
}
