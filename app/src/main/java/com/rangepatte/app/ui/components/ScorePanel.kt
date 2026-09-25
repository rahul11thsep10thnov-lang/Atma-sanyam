package com.rangepatte.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.theme.BrassLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.Radii
import com.rangepatte.app.ui.theme.WoodBrown

/**
 * Compact score/points plaque for a table — brass-bordered wood, matching the player nameplates.
 * Each score also renders as tally-mark bundles of five (four strokes crossed by a fifth) below
 * the number — the oldest, most universal counting notation — for the "ancient ledger" feel the
 * design brief asks for, capped at 25 decorative marks so a running score never turns into clutter;
 * the exact number is always shown too. Non-monetary points/stars only, never currency.
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
            Column(modifier = Modifier.padding(vertical = 3.dp)) {
                Row {
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
                if (score > 0) {
                    TallyMarks(
                        count = score,
                        color = GoldenGlow,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun TallyMarks(count: Int, color: Color, modifier: Modifier = Modifier) {
    val shown = count.coerceIn(0, 25)
    val fullBundles = shown / 5
    val remainder = shown % 5
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
        repeat(fullBundles) { TallyBundle(strokes = 5, color = color) }
        if (remainder > 0) {
            TallyBundle(strokes = remainder, color = color)
        }
    }
}

@Composable
private fun TallyBundle(strokes: Int, color: Color) {
    Canvas(modifier = Modifier.size(width = 14.dp, height = 16.dp)) {
        val strokeCount = strokes.coerceIn(1, 5)
        val strokeWidth = 1.4.dp.toPx()
        val gap = size.width / 4f
        for (i in 0 until minOf(strokeCount, 4)) {
            val x = i * gap + gap / 2f
            drawLine(color = color, start = Offset(x, 0f), end = Offset(x, size.height), strokeWidth = strokeWidth)
        }
        if (strokeCount == 5) {
            drawLine(color = color, start = Offset(0f, size.height), end = Offset(size.width, 0f), strokeWidth = strokeWidth)
        }
    }
}
