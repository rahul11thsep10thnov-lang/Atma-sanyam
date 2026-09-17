package com.rangepatte.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.background.BackgroundManager
import com.rangepatte.app.ui.background.BackgroundType

/**
 * Paints a heritage scene at very low opacity behind [content], with a translucent scrim on top so
 * text and cards stay fully readable. Used by both the home screen and the game table so the
 * "watermark, never a distraction" rule lives in exactly one place.
 */
@Composable
fun WatermarkBackground(
    backgroundType: BackgroundType,
    modifier: Modifier = Modifier,
    watermarkAlpha: Float = 0.12f,
    scrimColor: Color = Color.White,
    scrimAlpha: Float = 0.55f,
    content: @Composable () -> Unit
) {
    Box(modifier = modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .blur(24.dp)
                .alpha(watermarkAlpha)
                .background(BackgroundManager.brushFor(backgroundType))
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(scrimColor.copy(alpha = scrimAlpha))
        )
        content()
    }
}
