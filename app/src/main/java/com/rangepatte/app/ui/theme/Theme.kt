package com.rangepatte.app.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * One fixed "royal court" scheme — dark carved wood with parchment text and bevelled-gold accents,
 * in the manner of classic strategy-game menus. It deliberately ignores the system light/dark
 * setting: the heritage look is the app's identity, not a user-selectable theme.
 */
private val RoyalCourtColors: ColorScheme = darkColorScheme(
    primary = GoldBevelLight,
    onPrimary = DeepBrown,
    primaryContainer = ButtonCrimsonBottom,
    onPrimaryContainer = ParchmentText,
    secondary = RoyalRed,
    onSecondary = ParchmentText,
    tertiary = GoldBevelLight,
    onTertiary = DeepBrown,
    background = RoyalBackground,
    onBackground = ParchmentText,
    surface = PanelWoodMid,
    onSurface = ParchmentText,
    surfaceVariant = PanelWoodLight,
    onSurfaceVariant = ParchmentTextDim,
    outline = GoldBevelDark,
    scrim = Color.Black
)

@Composable
fun RangEPatteTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = RoyalCourtColors,
        typography = RangEPatteTypography,
        shapes = RangEPatteShapes,
        content = content
    )
}
