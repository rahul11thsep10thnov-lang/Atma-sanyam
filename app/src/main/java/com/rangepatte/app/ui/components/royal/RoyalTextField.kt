package com.rangepatte.app.ui.components.royal

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim

/** A text field in the royal style: dark wood inset, gold rule border, parchment text. */
@Composable
fun RoyalTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    prefix: String? = null,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    textStyle: TextStyle = MaterialTheme.typography.bodyLarge,
    enabled: Boolean = true,
    isError: Boolean = false
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        prefix = if (prefix != null) {
            { Text(prefix, style = textStyle, color = GoldBevelLight) }
        } else {
            null
        },
        singleLine = true,
        enabled = enabled,
        isError = isError,
        textStyle = textStyle,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        shape = RoundedCornerShape(3.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = ParchmentText,
            unfocusedTextColor = ParchmentText,
            disabledTextColor = ParchmentTextDim,
            focusedContainerColor = PanelWoodDark,
            unfocusedContainerColor = PanelWoodDark,
            disabledContainerColor = PanelWoodDark,
            focusedBorderColor = GoldenGlow,
            unfocusedBorderColor = GoldBevelDark,
            disabledBorderColor = GoldBevelDark.copy(alpha = 0.5f),
            errorBorderColor = Color(0xFFE06A5A),
            focusedLabelColor = GoldBevelLight,
            unfocusedLabelColor = ParchmentTextDim,
            errorLabelColor = Color(0xFFE06A5A),
            cursorColor = GoldenGlow,
            errorContainerColor = PanelWoodDark,
            errorTextColor = ParchmentText
        ),
        modifier = modifier.fillMaxWidth()
    )
}
