package com.rangepatte.app.ui.splash

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import com.rangepatte.app.R
import kotlinx.coroutines.delay

/** How long the opening picture stays up, in milliseconds, before it fades into the first page. */
const val SPLASH_MS = 2_200L

/**
 * The opening screen: the Taash Ganjifa picture, full screen, shown once as the app starts and then
 * faded away to reveal the first page ([content]) already laid out underneath it. [visible] is held by
 * the caller so a turn of the phone does not show it again.
 */
@Composable
fun SplashHost(visible: Boolean, onFinished: () -> Unit, content: @Composable () -> Unit) {
    Box(modifier = Modifier.fillMaxSize()) {
        content()
        AnimatedVisibility(visible = visible, exit = fadeOut(tween(450))) {
            Box(modifier = Modifier.fillMaxSize().background(Color(0xFFD9A55C))) {
                Image(
                    painter = painterResource(R.drawable.splash_taash),
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }
    LaunchedEffect(visible) {
        if (visible) { delay(SPLASH_MS); onFinished() }
    }
}
