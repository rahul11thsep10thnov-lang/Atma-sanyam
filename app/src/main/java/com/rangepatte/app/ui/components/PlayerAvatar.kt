package com.rangepatte.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.theme.BrassLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.Radii
import com.rangepatte.app.ui.theme.WoodBrown

/**
 * A seated player's nameplate — a small antique wooden/brass plaque rather than a modern avatar
 * bubble, per the village-courtyard redesign. Glows gold-bordered when it's their turn.
 */
@Composable
fun PlayerAvatar(
    name: String,
    modifier: Modifier = Modifier,
    isCurrentTurn: Boolean = false,
    isAI: Boolean = false
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = modifier) {
        Box(
            modifier = Modifier
                .widthIn(min = 56.dp)
                .background(WoodBrown, RoundedCornerShape(Radii.Panel))
                .border(
                    width = if (isCurrentTurn) 2.dp else 1.dp,
                    color = if (isCurrentTurn) GoldenGlow else BrassLight,
                    shape = RoundedCornerShape(Radii.Panel)
                )
                .padding(horizontal = 10.dp, vertical = 6.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = name.take(1).uppercase(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = BrassLight
            )
        }
        Text(
            text = if (isAI) "$name (AI)" else name,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onBackground,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}
