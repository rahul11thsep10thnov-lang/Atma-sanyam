package com.rangepatte.app.game.tricks

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.game.common.CardView
import com.rangepatte.app.game.common.SeatPlaque
import com.rangepatte.app.game.common.StatusLine
import com.rangepatte.app.ui.components.WoodenTable

/** What to print on one seat's nameplate. [tag] is a small line above the name, [detail] below it. */
data class SeatView(val name: String, val cardsLeft: Int, val tag: String? = null, val detail: String? = null)

/**
 * The shared four-seat table for trick-taking games: you at the bottom, then the right, top and left
 * seats in play order, the cards of the current trick in the middle (the winner's card glows when the
 * trick is complete), and your hand underneath. Cards you may play are bright; the rest are dimmed.
 *
 * [info] lines are shown above the table (trump, bids, scores). [playable] holds the ids of the
 * cards that can be played right now (empty when it is not your turn).
 */
@Composable
fun TrickTable(
    seats: List<SeatView>,
    turn: Int?,
    plays: List<TrickPlay>,
    winnerSeat: Int?,
    myHand: List<PlayingCard>,
    playable: Set<String>,
    onPlay: (PlayingCard) -> Unit,
    info: List<String>,
    modifier: Modifier = Modifier,
    highlightFirstInfo: Boolean = false
) {
    Column(modifier = modifier.fillMaxSize()) {
        info.forEachIndexed { i, line -> StatusLine(text = line, highlight = highlightFirstInfo && i == 0, compact = true) }

        WoodenTable(modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp)) {
            SeatPlaque(
                name = seats[2].name, tag = seats[2].tag, detail = seats[2].detail ?: "${seats[2].cardsLeft}",
                isTurn = turn == 2, modifier = Modifier.align(Alignment.TopCenter).padding(top = 8.dp)
            )
            SeatPlaque(
                name = seats[3].name, tag = seats[3].tag, detail = seats[3].detail ?: "${seats[3].cardsLeft}",
                isTurn = turn == 3, modifier = Modifier.align(Alignment.CenterStart).padding(start = 6.dp)
            )
            SeatPlaque(
                name = seats[1].name, tag = seats[1].tag, detail = seats[1].detail ?: "${seats[1].cardsLeft}",
                isTurn = turn == 1, modifier = Modifier.align(Alignment.CenterEnd).padding(end = 6.dp)
            )
            SeatPlaque(
                name = seats[0].name, tag = seats[0].tag, detail = seats[0].detail ?: "${seats[0].cardsLeft}",
                isTurn = turn == 0, modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 8.dp)
            )

            // The trick in the middle: each card sits on the side of the seat that played it.
            Box(modifier = Modifier.align(Alignment.Center).size(width = 190.dp, height = 170.dp)) {
                plays.forEach { play ->
                    val align = when (play.seat) {
                        0 -> Alignment.BottomCenter
                        1 -> Alignment.CenterEnd
                        2 -> Alignment.TopCenter
                        else -> Alignment.CenterStart
                    }
                    CardView(
                        card = play.card,
                        selected = winnerSeat == play.seat,
                        modifier = Modifier.align(align).width(52.dp)
                    )
                }
            }
        }

        // Your hand, fanned left to right; scrolls sideways if it does not fit.
        BoxWithConstraints(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
            val cardWidth = 58.dp
            val lift = 12.dp
            val count = myHand.size
            val fitStep = if (count > 1) (maxWidth - cardWidth - 16.dp) / (count - 1) else cardWidth
            val step = minOf(cardWidth * 0.7f, maxOf(fitStep, 22.dp))
            val total = if (count == 0) 0.dp else cardWidth + step * (count - 1)
            Row(
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())
            ) {
                Box(modifier = Modifier.width(total).height(cardWidth * 1.42f + lift)) {
                    myHand.forEachIndexed { i, card ->
                        val canPlay = card.id in playable
                        CardView(
                            card = card,
                            dimmed = playable.isNotEmpty() && !canPlay,
                            modifier = Modifier
                                .width(cardWidth)
                                .offset(x = step * i, y = if (canPlay) 0.dp else lift),
                            onClick = if (canPlay) ({ onPlay(card) }) else null
                        )
                    }
                }
            }
        }
    }
}
