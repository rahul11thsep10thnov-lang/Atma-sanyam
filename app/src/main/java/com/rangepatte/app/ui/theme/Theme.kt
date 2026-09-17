package com.rangepatte.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors: ColorScheme = lightColorScheme(
    primary = HeritageBurgundy,
    onPrimary = IvoryBackground,
    secondary = MutedGreen,
    onSecondary = IvoryBackground,
    tertiary = AntiqueGold,
    onTertiary = DeepBrown,
    background = IvoryBackground,
    onBackground = TextPrimaryLight,
    surface = ParchmentSurface,
    onSurface = TextPrimaryLight,
    surfaceVariant = ParchmentSurfaceDim,
    onSurfaceVariant = TextSecondaryLight,
    outline = WarmBrown
)

private val DarkColors: ColorScheme = darkColorScheme(
    primary = AntiqueGold,
    onPrimary = DeepBrown,
    secondary = MutedGreenDark,
    onSecondary = TextPrimaryDark,
    tertiary = HeritageBurgundy,
    onTertiary = TextPrimaryDark,
    background = DarkBackground,
    onBackground = TextPrimaryDark,
    surface = DarkSurface,
    onSurface = TextPrimaryDark,
    surfaceVariant = DarkSurfaceDim,
    onSurfaceVariant = TextSecondaryDark,
    outline = TextSecondaryDark
)

@Composable
fun RangEPatteTheme(
    useDarkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (useDarkTheme) DarkColors else LightColors

    MaterialTheme(
        colorScheme = colorScheme,
        typography = RangEPatteTypography,
        shapes = RangEPatteShapes,
        content = content
    )
}
