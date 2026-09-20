package com.atmasanyam.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = AtmaNavy,
    secondary = AtmaGold,
    background = AtmaBackground,
    surface = AtmaSurface,
    onPrimary = AtmaSurface,
    onBackground = AtmaTextPrimary,
    onSurface = AtmaTextPrimary,
    error = AtmaDanger,
)

private val DarkColors = darkColorScheme(
    primary = AtmaGold,
    secondary = AtmaNavyLight,
    background = AtmaDarkBackground,
    surface = AtmaDarkSurface,
    onPrimary = AtmaNavy,
    onBackground = AtmaSurface,
    onSurface = AtmaSurface,
    error = AtmaDanger,
)

@Composable
fun AtmaSanyamTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    MaterialTheme(colorScheme = colorScheme, typography = AtmaTypography, content = content)
}
