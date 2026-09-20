package com.rangepatte.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.theme.BrassLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.Radii
import com.rangepatte.app.ui.theme.WoodBrown

/**
 * Compact score/points plaque for a table — brass-bordered wood, matching the player nameplates.
 * Non-monetary points/stars only, never currency.
 */
@Composable
fun ScorePanel(
    scoresByPlayerName: List<Pair<String, Int>>,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .background(WoodBrown.copy(alpha = 0.92f), RoundedCornerShape(Radii.Panel))
            .border(1.dp, BrassLight, RoundedCornerShape(Radii.Panel))
            .padding(10.dp)
    ) {
        scoresByPlayerName.forEach { (name, score) ->
            Row(modifier = Modifier.padding(vertical = 2.dp)) {
                Text(
                    text = name,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = score.toString(),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = GoldenGlow,
                    modifier = Modifier.padding(start = 12.dp)
                )
            }
        }
    }
}
