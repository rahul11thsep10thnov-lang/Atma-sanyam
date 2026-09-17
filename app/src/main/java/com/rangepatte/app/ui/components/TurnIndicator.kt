package com.rangepatte.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/** Small pill showing whose turn it is — kept understated rather than a flashy banner. */
@Composable
fun TurnIndicator(playerName: String, modifier: Modifier = Modifier) {
    Text(
        text = "$playerName’s turn",
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onTertiary,
        modifier = modifier
            .background(MaterialTheme.colorScheme.tertiary, RoundedCornerShape(50))
            .padding(horizontal = 14.dp, vertical = 6.dp)
    )
}
