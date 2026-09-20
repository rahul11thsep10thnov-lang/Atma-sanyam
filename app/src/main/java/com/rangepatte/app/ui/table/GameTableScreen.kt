package com.rangepatte.app.ui.table

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.matchParentSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.game.Deck
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.CardFan
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.PlayerAvatar
import com.rangepatte.app.ui.components.ScorePanel
import com.rangepatte.app.ui.components.TurnIndicator
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.WoodenTable
import com.rangepatte.app.ui.cards.Hand
import com.rangepatte.app.ui.theme.GoldenGlow
import kotlin.random.Random

/**
 * The generic table shell every game screen is built on: header, wooden playing surface, seated
 * players and the local player's hand. No [com.rangepatte.app.domain.game.CardGameEngine] is wired
 * in yet — the cards shown here are a static shuffled demo hand so the rendering engine (Phase 3)
 * can be seen working end-to-end. Each game's own screen (Phase 7+) replaces this demo content with
 * its engine's live [com.rangepatte.app.domain.game.GameState] while reusing this same layout.
 */
@Composable
fun GameTableScreen(
    game: GameInfo,
    onBackClick: () -> Unit,
    onRulesClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val demoHand = remember(game.id) { Deck.standard().shuffled(Random(game.id.ordinal)).cards.take(5) }
    val demoOpponentHand = remember(game.id) { Deck.standard().shuffled(Random(game.id.ordinal + 100)).cards.take(5) }

    WatermarkBackground(backgroundType = BackgroundType.VILLAGE_CHAUPAL, modifier = modifier) {
        Column(modifier = Modifier.fillMaxSize().padding(12.dp)) {
            GameHeader(
                title = stringResource(game.nameRes),
                onBackClick = onBackClick,
                onSettingsClick = onRulesClick
            )

            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(vertical = 12.dp)
            ) {
                WoodenTable {
                    Column(modifier = Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
                        PlayerAvatar(
                            name = "Table",
                            isAI = true,
                            modifier = Modifier.padding(top = 16.dp)
                        )
                        CardFan(
                            cards = demoOpponentHand,
                            cardWidth = 40.dp,
                            cardHeight = 58.dp,
                            faceUp = false,
                            modifier = Modifier.padding(top = 8.dp)
                        )

                        Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                TurnIndicator(playerName = "You")
                                Text(
                                    text = stringResource(R.string.game_table_coming_soon, stringResource(game.nameRes)),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(top = 12.dp, start = 24.dp, end = 24.dp)
                                )
                            }
                        }
                    }
                }

                // Warm lantern-light vignette — brighter, gold-tinted center, softly darkened
                // edges — so the eye is drawn to the charpai rather than the whole screen reading
                // uniformly bright.
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    GoldenGlow.copy(alpha = 0.12f),
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.16f)
                                )
                            )
                        )
                )

                ScorePanel(
                    scoresByPlayerName = listOf("You" to 0, "Table" to 0),
                    modifier = Modifier.align(Alignment.TopEnd).padding(8.dp)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                Hand(
                    cards = demoHand,
                    cardWidth = 52.dp,
                    cardHeight = 76.dp,
                    faceUp = true,
                    animateDealIn = true
                )
            }
        }
    }
}
