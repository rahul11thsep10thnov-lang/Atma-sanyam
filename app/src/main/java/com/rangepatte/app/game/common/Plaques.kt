package com.rangepatte.app.game.common

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.rangepatte.app.ui.components.royal.antiquePlaque
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
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
    dimmed: Boolean = false,
    compact: Boolean = false
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
            .widthIn(min = 76.dp, max = 180.dp)
            .antiquePlaque(active = isTurn)
            .padding(horizontal = 12.dp, vertical = if (compact) 4.dp else 6.dp)
    ) {
        if (tag != null && !compact) {
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
        val second = if (compact) listOfNotNull(tag, detail).joinToString(" · ").ifEmpty { null } else detail
        if (second != null) {
            Text(
                text = second,
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
