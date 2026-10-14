package com.atmasanyam.delivery.splash

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import com.atmasanyam.delivery.R
import kotlinx.coroutines.delay

/** How long the splash stays up before the home page opens. */
private const val SPLASH_DURATION_MS = 4_000L

private const val SPLASH_IMAGE_ASPECT = 941f / 1672f

// Colours sampled from the top and bottom edges of the artwork (water on the left, sand on the right),
// used to fill the bands above/below it on phones taller than the artwork's 9:16 shape.
private val TopWater = Color(0xFF115F6A)
private val TopSand = Color(0xFFAE905D)
private val BottomWater = Color(0xFF0D5053)
private val BottomSand = Color(0xFFAD8647)

/**
 * Full-screen launch artwork shown for [SPLASH_DURATION_MS], then [onFinished] opens the home page.
 *
 * The artwork carries the "LOKRATH" wordmark almost edge to edge, so it is scaled to the full screen
 * *width* (never cropped sideways) and any extra height is filled with matching water/sand colours.
 */
@Composable
fun SplashScreen(
    onFinished: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val currentOnFinished by rememberUpdatedState(onFinished)
    LaunchedEffect(Unit) {
        delay(SPLASH_DURATION_MS)
        currentOnFinished()
    }

    BoxWithConstraints(modifier = modifier.fillMaxSize().background(TopWater)) {
        val artwork = painterResource(R.drawable.splash_lokrath)
        val description = stringResource(R.string.app_name)
        if (maxWidth / maxHeight <= SPLASH_IMAGE_ASPECT) {
            Column(modifier = Modifier.fillMaxSize()) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .background(Brush.horizontalGradient(0f to TopWater, 0.68f to TopWater, 0.73f to TopSand, 1f to TopSand)),
                )
                Image(
                    painter = artwork,
                    contentDescription = description,
                    modifier = Modifier.fillMaxWidth(),
                    contentScale = ContentScale.FillWidth,
                )
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .background(
                            Brush.horizontalGradient(0f to BottomWater, 0.45f to BottomWater, 0.51f to BottomSand, 1f to BottomSand),
                        ),
                )
            }
        } else {
            // Wider than the artwork (tablet / landscape): fill the screen instead.
            Image(
                painter = artwork,
                contentDescription = description,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        }
    }
}
