package com.rangepatte.app.ui.components.royal

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.theme.ButtonCrimsonBottom
import com.rangepatte.app.ui.theme.ButtonCrimsonTop
import com.rangepatte.app.ui.theme.ButtonSteelBottom
import com.rangepatte.app.ui.theme.ButtonSteelTop
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.RoyalLabelStyle

/** [CRIMSON] for the primary/confirm action on a panel, [STEEL] for secondary actions. */
enum class RoyalButtonStyle { CRIMSON, STEEL }

private val ButtonShape = RoundedCornerShape(3.dp)

/**
 * Rectangular plaque button — crimson or steel gradient, gold rule border, a thin top highlight,
 * small-caps label. Pressing flips the gradient (darker) and scales down slightly.
 */
@Composable
fun RoyalButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    style: RoyalButtonStyle = RoyalButtonStyle.CRIMSON,
    enabled: Boolean = true
) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(targetValue = if (pressed) 0.96f else 1f, label = "royalButtonScale")
    val (top, bottom) = when (style) {
        RoyalButtonStyle.CRIMSON -> ButtonCrimsonTop to ButtonCrimsonBottom
        RoyalButtonStyle.STEEL -> ButtonSteelTop to ButtonSteelBottom
    }

    Box(
        modifier = modifier
            .scale(scale)
            .alpha(if (enabled) 1f else 0.45f)
            .defaultMinSize(minHeight = 44.dp)
            .clip(ButtonShape)
            .background(Brush.verticalGradient(if (pressed) listOf(bottom, top) else listOf(top, bottom)))
            .border(1.2.dp, Brush.linearGradient(listOf(GoldBevelLight, GoldBevelDark, GoldBevelLight)), ButtonShape)
            .drawBehind {
                val inset = 2.dp.toPx()
                drawLine(
                    color = Color.White.copy(alpha = 0.16f),
                    start = Offset(inset * 2, inset),
                    end = Offset(size.width - inset * 2, inset),
                    strokeWidth = 1.dp.toPx()
                )
                drawRect(
                    color = GoldBevelLight.copy(alpha = 0.35f),
                    topLeft = Offset(inset, inset),
                    size = Size(size.width - inset * 2, size.height - inset * 2),
                    style = Stroke(width = 0.75.dp.toPx())
                )
            }
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                role = Role.Button,
                onClick = onClick
            )
            .padding(horizontal = 18.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text.uppercase(),
            style = RoyalLabelStyle,
            color = ParchmentText,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}
