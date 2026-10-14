package com.atmasanyam.delivery.core.designsystem.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * The whole app sits on one pastel background image (drawn once at the root, see MainActivity),
 * so [background] is transparent and cards are translucent white - screens just show through.
 * That artwork is light-only, hence there is deliberately no dark colour scheme.
 */
private val LightColors = lightColorScheme(
    primary = TealPrimary,
    onPrimary = Color.White,
    primaryContainer = TealPrimaryContainer,
    secondary = AmberSecondary,
    secondaryContainer = TealPrimaryContainer,
    onSecondaryContainer = Color(0xFF00332D),
    error = ErrorRed,
    background = Color.Transparent,
    surface = SurfaceLight,
    onBackground = OnSurfaceLight,
    onSurface = OnSurfaceLight,
    surfaceVariant = Color(0xE6FFFFFF),
    surfaceContainer = Color(0xFFFFF8F4),
    surfaceContainerHigh = Color(0xFFFFF4EE),
    surfaceContainerHighest = Color(0xE6FFFFFF),
)

@Composable
fun AtmaSanyamTheme(
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = AtmaSanyamTypography,
        content = content,
    )
}
