package com.wholesoul.app.core.designsystem.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.wholesoul.app.core.designsystem.WholesoulColors

@Composable
private fun shimmerAlpha(): Float {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val alpha by transition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(700, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "shimmerAlpha",
    )
    return alpha
}

@Composable
fun SkeletonBlock(modifier: Modifier = Modifier) {
    val alpha = shimmerAlpha()
    androidx.compose.foundation.layout.Box(
        modifier = modifier
            .alpha(alpha)
            .clip(RoundedCornerShape(8.dp))
            .background(WholesoulColors.Divider),
    )
}

@Composable
fun ProductCardSkeleton(modifier: Modifier = Modifier) {
    Column(modifier = modifier.padding(4.dp)) {
        SkeletonBlock(Modifier.fillMaxWidth().height(110.dp))
        androidx.compose.foundation.layout.Spacer(Modifier.height(8.dp))
        SkeletonBlock(Modifier.fillMaxWidth().height(14.dp))
        androidx.compose.foundation.layout.Spacer(Modifier.height(6.dp))
        SkeletonBlock(Modifier.fillMaxWidth(0.6f).height(14.dp))
    }
}
