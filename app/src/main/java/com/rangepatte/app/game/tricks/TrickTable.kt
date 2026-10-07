package com.rangepatte.app.game.tricks

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.rangepatte.app.domain.model.PlayingCard
import com.rangepatte.app.game.common.CardView
import com.rangepatte.app.game.common.FannedHand
import com.rangepatte.app.ui.thumbnails.CARD_ASPECT
import com.rangepatte.app.game.common.SeatPlaque
import com.rangepatte.app.game.common.StatusLine

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
    mySeat: Int,
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

        BoxWithConstraints(modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 4.dp, vertical = 4.dp)) {
            // Seats are absolute (0..3); each phone draws itself at the bottom and the others clockwise-by-play-order.
            fun at(position: Int) = (mySeat + position) % 4
            SeatPlaque(
                name = seats[at(2)].name, tag = seats[at(2)].tag, detail = seats[at(2)].detail ?: "${seats[at(2)].cardsLeft}",
                isTurn = turn == at(2), modifier = Modifier.align(Alignment.TopCenter).padding(top = 4.dp)
            )
            SeatPlaque(
                name = seats[at(3)].name, tag = seats[at(3)].tag, detail = seats[at(3)].detail ?: "${seats[at(3)].cardsLeft}",
                isTurn = turn == at(3), modifier = Modifier.align(Alignment.CenterStart).padding(start = 2.dp)
            )
            SeatPlaque(
                name = seats[at(1)].name, tag = seats[at(1)].tag, detail = seats[at(1)].detail ?: "${seats[at(1)].cardsLeft}",
                isTurn = turn == at(1), modifier = Modifier.align(Alignment.CenterEnd).padding(end = 2.dp)
            )
            SeatPlaque(
                name = seats[at(0)].name, tag = seats[at(0)].tag, detail = seats[at(0)].detail ?: "${seats[at(0)].cardsLeft}",
                isTurn = turn == at(0), modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 4.dp)
            )

            // The trick in the middle: each card sits on the side of the seat that played it. The cards are
            // as large as the middle of the table allows, never so large that they crowd the nameplates.
            val trickCard = minOf(84.dp, maxWidth * 0.2f, (maxHeight - 130.dp) / (CARD_ASPECT * 1.75f)).coerceAtLeast(40.dp)
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(width = trickCard * 2.8f, height = trickCard * CARD_ASPECT * 1.75f)
            ) {
                plays.forEach { play ->
                    val align = when ((play.seat - mySeat + 4) % 4) {
                        0 -> Alignment.BottomCenter
                        1 -> Alignment.CenterEnd
                        2 -> Alignment.TopCenter
                        else -> Alignment.CenterStart
                    }
                    CardView(
                        card = play.card,
                        selected = winnerSeat == play.seat,
                        modifier = Modifier.align(align).width(trickCard)
                    )
                }
            }
        }

        // Your hand: as large as will fit, in one fanned row or two. Cards you can play stand up; the rest
        // sit lower and dimmed.
        FannedHand(items = myHand, maxCardWidth = 92.dp, headroom = 12.dp, modifier = Modifier.padding(vertical = 4.dp)) { card, _, positioned ->
            val canPlay = card.id in playable
            CardView(
                card = card,
                dimmed = playable.isNotEmpty() && !canPlay,
                inlineIndex = true,
                modifier = positioned.offset(y = if (canPlay) 0.dp else 12.dp),
                onClick = if (canPlay) ({ onPlay(card) }) else null
            )
        }
    }
}
