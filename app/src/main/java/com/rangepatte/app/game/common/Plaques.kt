package com.rangepatte.app.game.common

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.PanelWoodLight
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim

/**
 * A seated player's nameplate: dark wood with a gold rule, brighter and thicker-bordered on their
 * turn. [detail] is a short second line (cards left, points, bid …); [tag] a small label above it.
 */
@Composable
fun SeatPlaque(
    name: String,
    modifier: Modifier = Modifier,
    detail: String? = null,
    tag: String? = null,
    isTurn: Boolean = false,
    dimmed: Boolean = false
) {
    val shape = RoundedCornerShape(4.dp)
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
            .widthIn(min = 72.dp, max = 180.dp)
            .background(Brush.verticalGradient(listOf(PanelWoodLight, PanelWoodDark)), shape)
            .border(if (isTurn) 2.dp else 1.dp, if (isTurn) GoldenGlow else GoldBevelDark, shape)
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        if (tag != null) {
            Text(
                text = tag,
                style = MaterialTheme.typography.labelSmall,
                color = ParchmentTextDim,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Text(
            text = name,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = if (dimmed) ParchmentTextDim else if (isTurn) GoldenGlow else ParchmentText,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        if (detail != null) {
            Text(
                text = detail,
                style = MaterialTheme.typography.labelMedium,
                color = GoldBevelLight,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

/** First names the computer players go by — the same everywhere, in every language. */
val AI_NAMES = listOf("Ravi", "Meera", "Gopal", "Asha", "Kiran")
