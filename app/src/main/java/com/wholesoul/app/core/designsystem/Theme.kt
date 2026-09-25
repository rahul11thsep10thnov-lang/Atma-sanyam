package com.wholesoul.app.core.designsystem

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = WholesoulColors.PrimaryDark,
    onPrimary = WholesoulColors.OnPrimary,
    primaryContainer = WholesoulColors.Primary,
    onPrimaryContainer = WholesoulColors.OnPrimary,
    secondary = WholesoulColors.Leaf,
    onSecondary = Color.White,
    secondaryContainer = WholesoulColors.LeafLight,
    onSecondaryContainer = WholesoulColors.LeafDark,
    tertiary = WholesoulColors.Soil,
    background = WholesoulColors.Background,
    onBackground = WholesoulColors.TextPrimary,
    surface = WholesoulColors.Background,
    onSurface = WholesoulColors.TextPrimary,
    surfaceVariant = WholesoulColors.SurfaceAlt,
    onSurfaceVariant = WholesoulColors.TextSecondary,
    outline = WholesoulColors.Divider,
    error = WholesoulColors.Error,
    scrim = WholesoulColors.Scrim,
)

private val DarkColors = darkColorScheme(
    primary = WholesoulColors.Primary,
    onPrimary = WholesoulColors.OnPrimary,
    primaryContainer = WholesoulColors.PrimaryDark,
    onPrimaryContainer = WholesoulColors.OnPrimary,
    secondary = WholesoulColors.Leaf,
    onSecondary = Color.White,
    background = WholesoulColors.DarkBackground,
    onBackground = WholesoulColors.DarkTextPrimary,
    surface = WholesoulColors.DarkSurface,
    onSurface = WholesoulColors.DarkTextPrimary,
    surfaceVariant = WholesoulColors.DarkSurface,
    onSurfaceVariant = WholesoulColors.DarkTextSecondary,
    outline = WholesoulColors.DarkDivider,
    error = WholesoulColors.Error,
)

@Composable
fun WholesoulTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    MaterialTheme(
        colorScheme = colorScheme,
        typography = WholesoulTypography,
        shapes = WholesoulShapes,
        content = content,
    )
}
