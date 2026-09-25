package com.wholesoul.app.core.designsystem

import androidx.compose.ui.graphics.Color

/**
 * WHOLESOUL brand palette.
 *
 * Primary is the requested warm apricot (#FFD8B1) — distinct from Blinkit's yellow —
 * paired with a fresh leaf green (sourcing/freshness) and deep soil brown (earthiness,
 * Indian market texture). Kept centralized here so no screen hardcodes a raw color.
 */
object WholesoulColors {
    // Brand
    val Primary = Color(0xFFFFD8B1)
    val PrimaryDark = Color(0xFFF0B685)
    val PrimaryLight = Color(0xFFFFEBD9)
    val OnPrimary = Color(0xFF3A2A1A)

    val Leaf = Color(0xFF3A7D44)
    val LeafDark = Color(0xFF2A5E33)
    val LeafLight = Color(0xFFE3F1E5)

    val Soil = Color(0xFF4A3728)
    val Cream = Color(0xFFFFF8F0)

    // Semantic
    val Success = Color(0xFF2E7D32)
    val Warning = Color(0xFFB8860B)
    val Error = Color(0xFFC62828)
    val Discount = Color(0xFFD1472C)
    val Rating = Color(0xFF1E8E3E)

    // Neutrals
    val TextPrimary = Color(0xFF1C1B1A)
    val TextSecondary = Color(0xFF6F6660)
    val TextTertiary = Color(0xFFA39A93)
    val Divider = Color(0xFFEDE6DE)
    val SurfaceAlt = Color(0xFFFAF6F1)
    val Background = Color(0xFFFFFFFF)
    val Scrim = Color(0x99000000)

    // Dark theme
    val DarkBackground = Color(0xFF15130F)
    val DarkSurface = Color(0xFF201D18)
    val DarkTextPrimary = Color(0xFFF3EFE9)
    val DarkTextSecondary = Color(0xFFBBB1A6)
    val DarkDivider = Color(0xFF352F27)
}
