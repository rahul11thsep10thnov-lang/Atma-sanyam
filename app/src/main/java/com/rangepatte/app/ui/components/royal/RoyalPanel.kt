package com.rangepatte.app.ui.components.royal

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.PanelWoodMid
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.RoyalTitleStyle
import kotlin.math.sin

private val PanelShape = RoundedCornerShape(6.dp)

/**
 * The app's main container: dark carved wood with faint grain, a double bevelled-gold frame and
 * small gold caps at each corner, and an optional centred small-caps title with a fading gold rule
 * beneath it — the look of a classic strategy-game menu panel, drawn entirely in code.
 * Content inside defaults to parchment-coloured text.
 */
@Composable
fun RoyalPanel(
    modifier: Modifier = Modifier,
    title: String? = null,
    contentPadding: PaddingValues = PaddingValues(horizontal = 16.dp, vertical = 14.dp),
    content: @Composable ColumnScope.() -> Unit
) {
    Column(
        modifier = modifier
            .shadow(elevation = 10.dp, shape = PanelShape)
            .background(Brush.verticalGradient(listOf(PanelWoodMid, PanelWoodDark)), PanelShape)
            .drawBehind { drawCarvedFrame() }
            .padding(contentPadding)
    ) {
        CompositionLocalProvider(LocalContentColor provides ParchmentText) {
            if (title != null) {
                Text(
                    text = title.uppercase(),
                    style = RoyalTitleStyle,
                    color = GoldBevelLight,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                GoldRule(modifier = Modifier.padding(top = 6.dp, bottom = 12.dp))
            }
            content()
        }
    }
}

/** A thin horizontal gold line that fades out at both ends, as used under panel titles. */
@Composable
fun GoldRule(modifier: Modifier = Modifier, alpha: Float = 1f) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(
                Brush.horizontalGradient(
                    listOf(
                        Color.Transparent,
                        GoldBevelDark.copy(alpha = alpha),
                        GoldBevelLight.copy(alpha = alpha),
                        GoldBevelDark.copy(alpha = alpha),
                        Color.Transparent
                    )
                )
            )
    )
}

private fun DrawScope.drawCarvedFrame() {
    // Faint horizontal wood grain — deterministic so it never shimmers between frames.
    val grainStep = 5.dp.toPx()
    var y = grainStep
    var i = 0
    while (y < size.height) {
        val alpha = 0.05f + 0.04f * sin(i * 1.7f)
        drawLine(
            color = Color.Black.copy(alpha = alpha.coerceAtLeast(0f)),
            start = Offset(0f, y),
            end = Offset(size.width, y + 2.dp.toPx() * sin(i * 0.9f)),
            strokeWidth = 1.dp.toPx()
        )
        y += grainStep
        i++
    }

    // Outer heavy bevel, then a thin bright inner rule.
    val outer = 1.5.dp.toPx()
    drawRoundRect(
        color = GoldBevelDark,
        topLeft = Offset(outer, outer),
        size = Size(size.width - outer * 2, size.height - outer * 2),
        cornerRadius = CornerRadius(5.dp.toPx()),
        style = Stroke(width = 3.dp.toPx())
    )
    val inner = 5.dp.toPx()
    drawRoundRect(
        color = GoldBevelLight.copy(alpha = 0.7f),
        topLeft = Offset(inner, inner),
        size = Size(size.width - inner * 2, size.height - inner * 2),
        cornerRadius = CornerRadius(3.dp.toPx()),
        style = Stroke(width = 1.dp.toPx())
    )

    // Gold corner caps.
    val capRadius = 4.5.dp.toPx()
    val capInset = 2.5.dp.toPx()
    listOf(
        Offset(capInset, capInset),
        Offset(size.width - capInset, capInset),
        Offset(capInset, size.height - capInset),
        Offset(size.width - capInset, size.height - capInset)
    ).forEach { corner ->
        drawCircle(color = GoldBevelLight, radius = capRadius, center = corner)
        drawCircle(color = GoldBevelDark, radius = capRadius, center = corner, style = Stroke(width = 1.dp.toPx()))
    }
}
