package com.rangepatte.app.ui.components.royal

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.OrbTeal
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.PanelWoodLight
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.RoyalLabelStyle
import com.rangepatte.app.ui.theme.RoyalTitleStyle
import com.rangepatte.app.ui.theme.SlotFrameBlue

/** A small gold-framed wooden label plaque, like a column header over a group of choices. */
@Composable
fun RoyalPlaque(text: String, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(2.dp)
    Box(
        modifier = modifier
            .background(Brush.verticalGradient(listOf(PanelWoodLight, PanelWoodDark)), shape)
            .border(1.dp, GoldBevelDark, shape)
            .padding(horizontal = 14.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text = text.uppercase(), style = RoyalLabelStyle, color = GoldBevelLight, textAlign = TextAlign.Center)
    }
}

/** A centred sub-heading inside a panel, like "DISPLAY" / "DETAIL" in an options screen. */
@Composable
fun RoyalSectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text.uppercase(),
        style = RoyalTitleStyle.copy(fontSize = 16.sp),
        color = ParchmentText,
        textAlign = TextAlign.Center,
        modifier = modifier
            .fillMaxWidth()
            .padding(top = 14.dp, bottom = 4.dp)
    )
}

/**
 * One options-screen row: small-caps label on the left, a control ([trailing]) on the right, and a
 * faint gold rule underneath. Semantics are merged so a screen reader announces label and control
 * together.
 */
@Composable
fun RoyalOptionRow(
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: (() -> Unit)? = null,
    trailing: @Composable RowScope.() -> Unit = {}
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .alpha(if (enabled) 1f else 0.45f)
            .semantics(mergeDescendants = true) {}
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .let { if (onClick != null && enabled) it.clickable(role = Role.Button, onClick = onClick) else it }
                .padding(vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label.uppercase(),
                style = RoyalLabelStyle.copy(fontSize = 12.sp),
                color = ParchmentText,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier
                    .weight(1f)
                    .padding(end = 12.dp)
            )
            trailing()
        }
        GoldRule(alpha = 0.55f)
    }
}

/** A round radio-style toggle — gold ring, lit teal orb when on — used in place of a switch. */
@Composable
fun RoyalOrbToggle(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    val litAlpha by animateFloatAsState(targetValue = if (checked) 1f else 0f, label = "orbLit")
    Canvas(
        modifier = modifier
            .minimumInteractiveComponentSize()
            .size(28.dp)
            .toggleable(value = checked, enabled = enabled, role = Role.Switch, onValueChange = onCheckedChange)
    ) {
        val center = this.center
        val ring = 10.dp.toPx()
        drawCircle(color = PanelWoodDark, radius = ring, center = center)
        drawCircle(color = GoldBevelDark, radius = ring, center = center, style = Stroke(width = 2.dp.toPx()))
        drawCircle(color = GoldBevelLight.copy(alpha = 0.5f), radius = ring - 2.dp.toPx(), center = center, style = Stroke(width = 0.75.dp.toPx()))
        if (litAlpha > 0f) {
            drawCircle(color = OrbTeal.copy(alpha = litAlpha), radius = 5.5.dp.toPx(), center = center)
            drawCircle(color = Color.White.copy(alpha = 0.55f * litAlpha), radius = 1.8.dp.toPx(), center = center.copy(x = center.x - 1.5.dp.toPx(), y = center.y - 1.5.dp.toPx()))
        }
    }
}

/** A thin gold slider, as used for volume levels in an options screen. */
@Composable
fun RoyalSlider(
    value: Float,
    onValueChange: (Float) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    Slider(
        value = value,
        onValueChange = onValueChange,
        enabled = enabled,
        modifier = modifier,
        colors = SliderDefaults.colors(
            thumbColor = GoldBevelLight,
            activeTrackColor = GoldBevelLight,
            inactiveTrackColor = GoldBevelDark.copy(alpha = 0.45f),
            disabledThumbColor = GoldBevelDark,
            disabledActiveTrackColor = GoldBevelDark,
            disabledInactiveTrackColor = GoldBevelDark.copy(alpha = 0.25f)
        )
    )
}

/**
 * A square command slot — a steel-blue frame around dark wood, glowing gold when selected — for
 * picking one option from a small set (play mode, player count). [content] is typically an icon
 * or a number.
 */
@Composable
fun RoyalSlot(
    selected: Boolean,
    onClick: () -> Unit,
    contentDescription: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    size: Dp = 52.dp,
    content: @Composable BoxScope.() -> Unit
) {
    val shape = RoundedCornerShape(3.dp)
    Box(
        modifier = modifier
            .size(size)
            .alpha(if (enabled) 1f else 0.4f)
            .clickable(enabled = enabled, role = Role.RadioButton, onClick = onClick)
            .semantics { this.contentDescription = contentDescription }
            .background(Brush.verticalGradient(listOf(PanelWoodLight, PanelWoodDark)), shape)
            .border(2.dp, if (selected) GoldenGlow else SlotFrameBlue, shape)
            .padding(3.dp)
            .border(1.dp, GoldBevelDark.copy(alpha = 0.7f), shape),
        contentAlignment = Alignment.Center,
        content = content
    )
}
