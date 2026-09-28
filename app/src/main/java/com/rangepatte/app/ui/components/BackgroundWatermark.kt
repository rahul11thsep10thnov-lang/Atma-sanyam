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
 * Paints a heritage scene, blurred and dimmed, behind [content], with a dark scrim on top so the
 * carved-wood panels in front read clearly — a dusky backdrop in the manner of a classic strategy
 * game's menu screens. Used by every screen so the "backdrop, never a distraction" rule lives in
 * exactly one place.
 */
@Composable
fun WatermarkBackground(
    backgroundType: BackgroundType,
    modifier: Modifier = Modifier,
    watermarkAlpha: Float = 0.55f,
    scrimColor: Color = Color.Black,
    scrimAlpha: Float = 0.4f,
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
