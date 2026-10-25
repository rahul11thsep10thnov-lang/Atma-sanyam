package com.wholesoul.app.presentation.splash

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wholesoul.app.R
import com.wholesoul.app.core.designsystem.WholesoulColors
import com.wholesoul.app.core.designsystem.WholesoulTheme

@Composable
fun SplashRoute(
    onNavigate: (SplashDestination) -> Unit,
    viewModel: SplashViewModel = hiltViewModel(),
) {
    val destination by viewModel.destination.collectAsState()
    LaunchedEffect(destination) {
        destination?.let(onNavigate)
    }
    SplashScreen()
}

@Composable
private fun SplashScreen() {
    var visible by remember { mutableStateOf(false) }
    var taglineVisible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        visible = true
        kotlinx.coroutines.delay(500)
        taglineVisible = true
    }
    val logoScale by animateFloatAsState(
        targetValue = if (visible) 1f else 0.6f,
        animationSpec = tween(durationMillis = 500),
        label = "logoScale",
    )

    Surface(modifier = Modifier.fillMaxSize(), color = WholesoulColors.Primary) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(modifier = Modifier.size(96.dp).clip(CircleShape)) {
                Image(
                    painter = painterResource(id = R.drawable.ic_wholesoul_logo),
                    contentDescription = "WHOLESOUL",
                    modifier = Modifier.fillMaxSize().scale(logoScale),
                )
            }
            Spacer(Modifier.height(20.dp))
            Text(
                text = "WHOLESOUL",
                style = MaterialTheme.typography.displayMedium,
                fontWeight = FontWeight.Bold,
                color = WholesoulColors.OnPrimary,
            )
            Text(
                text = "FAST. FRESH. FRUGAL.",
                style = MaterialTheme.typography.labelLarge,
                color = WholesoulColors.Soil,
                letterSpacing = 2.sp,
            )
            Spacer(Modifier.height(28.dp))
            AnimatedVisibility(visible = taglineVisible, enter = fadeIn(tween(600))) {
                Text(
                    text = "Freshness, delivered.",
                    style = MaterialTheme.typography.titleMedium,
                    color = WholesoulColors.LeafDark,
                )
            }
        }
    }
}

@Preview
@Composable
private fun SplashScreenPreview() {
    WholesoulTheme { SplashScreen() }
}
