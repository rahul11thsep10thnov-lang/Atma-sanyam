package com.rangepatte.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonColors
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.theme.BrassLight
import com.rangepatte.app.ui.theme.Radii

/**
 * A brass-and-maroon plaque button — carved-wood corners, gold rule border, a slight press-down
 * scale on tap. Never a flashy gradient CTA.
 */
@Composable
fun ClassicalButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    colors: ButtonColors = ButtonDefaults.buttonColors(
        containerColor = MaterialTheme.colorScheme.primary,
        contentColor = MaterialTheme.colorScheme.onPrimary
    )
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(targetValue = if (isPressed) 0.96f else 1f, label = "buttonPressScale")

    Button(
        onClick = onClick,
        modifier = modifier
            .height(44.dp)
            .scale(scale),
        enabled = enabled,
        shape = RoundedCornerShape(Radii.Button),
        colors = colors,
        border = BorderStroke(1.25.dp, BrassLight),
        contentPadding = PaddingValues(horizontal = 20.dp),
        interactionSource = interactionSource
    ) {
        Text(text = text, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
fun ClassicalOutlinedButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(targetValue = if (isPressed) 0.96f else 1f, label = "outlinedButtonPressScale")

    OutlinedButton(
        onClick = onClick,
        modifier = modifier
            .height(44.dp)
            .scale(scale),
        enabled = enabled,
        shape = RoundedCornerShape(Radii.Button),
        border = BorderStroke(1.25.dp, BrassLight),
        interactionSource = interactionSource
    ) {
        Text(text = text, style = MaterialTheme.typography.titleMedium)
    }
}
