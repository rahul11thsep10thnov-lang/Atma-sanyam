package com.rangepatte.app.ui.components.royal

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim

/*
 * The four states every list and page has (Friends Element 17, approved Design 1): a skeleton of the
 * page's shape with a slow gold shimmer while loading, an empty state written as an invitation with
 * the one button that fixes it, an error plaque with the plain cause and Retry, and a hairline gold
 * band when there is no connection.
 */

/** [count] placeholder rows shaped like a person row. [shimmer] false keeps them still (reduced motion). */
@Composable
fun SkeletonRows(count: Int = 3, shimmer: Boolean = true, loadingLabel: String = "", modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "skeleton")
    val phase by transition.animateFloat(
        initialValue = -1f, targetValue = 2f,
        animationSpec = infiniteRepeatable(tween(1_800, easing = LinearEasing), RepeatMode.Restart), label = "shimmer"
    )
    val brush = if (shimmer) Brush.horizontalGradient(
        0f to Color(0xFF4A301B), (phase + 0.0f).coerceIn(0f, 1f) to Color(0xFF4A301B),
        (phase + 0.15f).coerceIn(0f, 1f) to GoldBevelDark.copy(alpha = 0.8f), (phase + 0.3f).coerceIn(0f, 1f) to Color(0xFF4A301B), 1f to Color(0xFF4A301B)
    ) else Brush.horizontalGradient(listOf(Color(0xFF4A301B), Color(0xFF4A301B)))
    Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = modifier.fillMaxWidth().semantics { contentDescription = loadingLabel; liveRegion = LiveRegionMode.Polite }) {
        repeat(count) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().antiquePlaque(cornerRadius = 8.dp).background(PanelWoodDark, RoundedCornerShape(8.dp)).padding(10.dp)) {
                Box(modifier = Modifier.size(40.dp).clip(CircleShape).background(brush))
                Column(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.weight(1f).padding(start = 10.dp)) {
                    Box(modifier = Modifier.fillMaxWidth(0.55f).height(12.dp).clip(RoundedCornerShape(6.dp)).background(brush))
                    Box(modifier = Modifier.fillMaxWidth(0.35f).height(9.dp).clip(RoundedCornerShape(5.dp)).background(brush))
                }
                Box(modifier = Modifier.width(64.dp).height(24.dp).clip(RoundedCornerShape(5.dp)).background(brush))
            }
        }
    }
}

/** Nothing here yet: an invitation with, at most, the one button that fixes it. */
@Composable
fun EmptyState(icon: String, title: String, body: String?, buttonText: String? = null, onButton: () -> Unit = {}, modifier: Modifier = Modifier) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier.fillMaxWidth().antiquePlaque(cornerRadius = 10.dp).background(PanelWoodDark, RoundedCornerShape(10.dp)).padding(horizontal = 16.dp, vertical = 18.dp)
            .semantics { liveRegion = LiveRegionMode.Polite }
    ) {
        Text(icon, fontSize = 30.sp)
        Text(title, style = MaterialTheme.typography.titleMedium, color = GoldBevelLight, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 6.dp))
        if (body != null) Text(body, style = MaterialTheme.typography.bodyMedium, color = ParchmentTextDim, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp))
        if (buttonText != null) RoyalButton(text = buttonText, onClick = onButton, modifier = Modifier.padding(top = 12.dp))
    }
}

/** Something went wrong: the plain cause and a Retry button. */
@Composable
fun ErrorPlaque(title: String, body: String?, retryText: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier.fillMaxWidth().antiquePlaque(cornerRadius = 10.dp).background(PanelWoodDark, RoundedCornerShape(10.dp))
            .border(1.5.dp, Color(0xFFA8323F), RoundedCornerShape(10.dp)).padding(horizontal = 16.dp, vertical = 16.dp)
            .semantics { liveRegion = LiveRegionMode.Assertive }
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium, color = ParchmentText, textAlign = TextAlign.Center)
        if (body != null) Text(body, style = MaterialTheme.typography.bodyMedium, color = ParchmentTextDim, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp))
        RoyalButton(text = retryText, onClick = onRetry, modifier = Modifier.padding(top = 12.dp))
    }
}

/** No connection: a hairline gold band at the top of the page; what is cached stays usable. */
@Composable
fun OfflineBand(title: String, body: String?, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxWidth()
            .background(Color(0xFF1B110A), RoundedCornerShape(6.dp))
            .border(1.dp, GoldenGlow, RoundedCornerShape(6.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp)
            .semantics { liveRegion = LiveRegionMode.Polite }
    ) {
        Text(title, style = MaterialTheme.typography.labelLarge, color = GoldenGlow)
        if (body != null) Text(body, style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim)
    }
}
