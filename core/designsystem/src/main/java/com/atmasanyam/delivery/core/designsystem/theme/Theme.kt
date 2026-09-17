package com.atmasanyam.delivery.core.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = TealPrimary,
    onPrimary = Color.White,
    primaryContainer = TealPrimaryContainer,
    secondary = AmberSecondary,
    error = ErrorRed,
    background = SurfaceLight,
    surface = SurfaceLight,
    onBackground = OnSurfaceLight,
    onSurface = OnSurfaceLight,
)

private val DarkColors = darkColorScheme(
    primary = TealPrimaryDark,
    onPrimary = OnSurfaceDark,
    primaryContainer = TealPrimary,
    secondary = AmberSecondaryDark,
    error = ErrorRed,
    background = SurfaceDark,
    surface = SurfaceDark,
    onBackground = OnSurfaceDark,
    onSurface = OnSurfaceDark,
)

@Composable
fun AtmaSanyamTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    MaterialTheme(
        colorScheme = colorScheme,
        typography = AtmaSanyamTypography,
        content = content,
    )
}
