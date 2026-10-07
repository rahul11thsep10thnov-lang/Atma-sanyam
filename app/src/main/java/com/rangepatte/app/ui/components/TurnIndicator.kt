package com.rangepatte.app.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.theme.GoldenGlow

private val BadgeText = Color(0xFF2A1A0A)

/**
 * "Your turn" and similar: an antique-gold pill like a small royal table marker. [text] is already
 * localized. A very slow glow breathes around it — the only animation, and it redraws just this pill.
 */
@Composable
fun TurnIndicator(text: String, modifier: Modifier = Modifier) {
    val pulse by rememberInfiniteTransition(label = "turnBadge").animateFloat(
        initialValue = 0.25f,
        targetValue = 0.6f,
        animationSpec = infiniteRepeatable(tween(1600), RepeatMode.Reverse),
        label = "turnBadgeGlow"
    )
    val shape = RoundedCornerShape(50)
    Text(
        text = text,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.Bold,
        color = BadgeText,
        textAlign = TextAlign.Center,
        modifier = modifier
            .shadow(5.dp, shape, clip = false)
            .drawBehind {
                val radius = size.height / 2f
                for (i in 3 downTo 1) {
                    val grow = 2.dp.toPx() * i
                    drawRoundRect(
                        GoldenGlow.copy(alpha = pulse * 0.28f),
                        Offset(-grow, -grow), Size(size.width + grow * 2, size.height + grow * 2),
                        CornerRadius(radius + grow)
                    )
                }
                drawRoundRect(
                    Brush.verticalGradient(listOf(Color(0xFFF6DB86), Color(0xFFD6A744), Color(0xFFB68529))),
                    cornerRadius = CornerRadius(radius)
                )
                drawRoundRect(
                    Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.35f), Color.Transparent), endY = size.height * 0.5f),
                    cornerRadius = CornerRadius(radius)
                )
                drawRoundRect(Color(0xFF7A5518), cornerRadius = CornerRadius(radius), style = Stroke(1.2.dp.toPx()))
                val inset = 2.5.dp.toPx()
                drawRoundRect(
                    Color(0xFF7A5518).copy(alpha = 0.45f),
                    Offset(inset, inset), Size(size.width - inset * 2, size.height - inset * 2),
                    CornerRadius(radius - inset), style = Stroke(0.6.dp.toPx())
                )
            }
            .padding(horizontal = 18.dp, vertical = 5.dp)
    )
}
