package com.rangepatte.app.game.rummy

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.game.common.CardSlot
import com.rangepatte.app.game.common.CardView
import com.rangepatte.app.game.common.ConnectionLostDialog
import com.rangepatte.app.game.common.GameFrame
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.game.common.GroupedHand
import com.rangepatte.app.game.common.LocalTableArea
import com.rangepatte.app.game.common.SeatPlaque
import com.rangepatte.app.game.common.StatusLine
import com.rangepatte.app.game.common.undoControl
import com.rangepatte.app.net.GameSession
import com.rangepatte.app.ui.components.TurnIndicator
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.ParchmentTextDim
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** The hand split into melds (shown grouped) and loose cards, as found by the meld solver. */
private class Arranged(val melds: List<List<RCard>>, val loose: List<RCard>)

/** Natural cards low to high first, then Jokers / wild cards — easier to read than the order they were dealt. */
private fun orderedMeld(cards: List<RCard>, wild: Rank): List<RCard> =
    cards.sortedWith(compareBy({ it.isPrintedJoker || it.rank == wild }, { it.suit?.ordinal ?: 0 }, { it.rank?.value ?: 0 }))

private fun sortedLoose(cards: List<RCard>): List<RCard> =
    cards.sortedWith(compareBy({ it.isPrintedJoker }, { it.suit?.ordinal ?: 0 }, { it.rank?.value ?: 0 }))

/**
 * 13-card rummy, against the computer or other people. Draw from the deck or the discard pile, then
 * discard; your hand is arranged for you into sequences and sets (shown grouped). When every card is in
 * a meld — with a pure sequence and at least two sequences — pick the card to finish with and press Declare.
 */
@Composable
fun RummyScreen(
    game: GameInfo,
    session: GameSession<RummyState, RummyAction>,
    onBackClick: () -> Unit
) {
    val state = session.state
    val me = session.mySeat
    val youName = stringResource(R.string.player_you)
    var selectedId by remember { mutableStateOf<Int?>(null) }
    val myTurn = state.phase != RummyPhase.FINISHED && state.turn == me
    val seatCount = state.players.size

    fun act(action: RummyAction) {
        session.submit(action)
        selectedId = null
    }

    val myHand = state.players[me].hand
    val arranged by produceState<Arranged?>(null, myHand, state.wildRank) {
        value = withContext(Dispatchers.Default) {
            val solution = MeldSession(myHand, state.wildRank).arrange()
            Arranged(
                melds = solution.melds.map { group -> orderedMeld(group.map { myHand[it] }, state.wildRank) },
                loose = sortedLoose(solution.leftover.map { myHand[it] })
            )
        }
    }

    GameFrame(game = game, onBackClick = onBackClick, undo = session.undoControl()) {
        // Opponents.
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 10.dp, vertical = 6.dp)
        ) {
            (1 until seatCount).map { (me + it) % seatCount }.forEach { seat ->
                val player = state.players[seat]
                SeatPlaque(
                    name = player.name,
                    detail = stringResource(R.string.rummy_cards_format, player.hand.size),
                    isTurn = state.turn == seat && state.phase != RummyPhase.FINISHED
                )
            }
        }

        // Deck, discard pile and the wild joker.
        val pileWidth = minOf(84.dp, LocalTableArea.current.width * 0.2f, LocalTableArea.current.height * 0.17f)
        Row(
            horizontalArrangement = Arrangement.spacedBy(18.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth().padding(top = 6.dp)
        ) {
            Pile(label = stringResource(R.string.rummy_pile_deck)) {
                CardView(
                    card = null,
                    faceDown = true,
                    modifier = Modifier.width(pileWidth),
                    onClick = if (myTurn && state.phase == RummyPhase.DRAW) ({ act(RummyAction.DrawStock) }) else null
                )
            }
            Pile(label = stringResource(R.string.rummy_pile_discard)) {
                val top = state.discard.lastOrNull()
                if (top == null) {
                    CardSlot(modifier = Modifier.width(pileWidth))
                } else {
                    CardView(
                        card = if (top.isPrintedJoker) null else top.toPlayingCard(),
                        isJoker = top.isPrintedJoker,
                        modifier = Modifier.width(pileWidth),
                        onClick = if (myTurn && state.phase == RummyPhase.DRAW) ({ act(RummyAction.DrawDiscard) }) else null
                    )
                }
            }
            Text(
                text = stringResource(R.string.rummy_wild_format, state.wildRank.label),
                style = MaterialTheme.typography.titleMedium,
                color = GoldBevelLight,
                textAlign = TextAlign.Center,
                modifier = Modifier.width(pileWidth * 1.8f)
            )
        }

        if (myTurn) {
            Box(modifier = Modifier.fillMaxWidth().padding(top = 6.dp), contentAlignment = Alignment.Center) {
                TurnIndicator(text = stringResource(R.string.game_your_turn))
            }
        }
        StatusLine(
            text = when {
                state.phase == RummyPhase.FINISHED -> ""
                !myTurn -> stringResource(R.string.turn_indicator_format, state.current.name)
                state.phase == RummyPhase.DRAW -> stringResource(R.string.rummy_draw_hint)
                else -> stringResource(R.string.rummy_discard_hint)
            },
            highlight = myTurn,
            modifier = Modifier.padding(top = 8.dp)
        )

        Spacer(modifier = Modifier.weight(1f))

        // Declare / discard buttons appear once a card is picked in the discard phase.
        if (myTurn && state.phase == RummyPhase.DISCARD) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally),
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
            ) {
                RoyalButton(
                    text = stringResource(R.string.rummy_discard),
                    enabled = selectedId != null,
                    onClick = { selectedId?.let { act(RummyAction.Discard(it)) } },
                    style = RoyalButtonStyle.STEEL
                )
                RoyalButton(
                    text = stringResource(R.string.rummy_declare),
                    enabled = selectedId != null,
                    onClick = { selectedId?.let { act(RummyAction.Declare(it)) } }
                )
            }
        }

        // Your hand, grouped into melds with the loose cards together: as large as the table allows, in one
        // row or two. The card you pick rises.
        val shown = arranged ?: Arranged(emptyList(), sortedLoose(myHand))
        // Loose cards are single-card groups that continue each other's run, so they can wrap to a second row anywhere.
        val groups = shown.melds + shown.loose.map { listOf(it) }
        val tight = groups.indices.map { it > shown.melds.size }
        GroupedHand(groups = groups, tight = tight, maxCardWidth = 84.dp, modifier = Modifier.padding(bottom = 4.dp)) { card, _, positioned ->
            CardView(
                card = if (card.isPrintedJoker) null else card.toPlayingCard(),
                isJoker = card.isPrintedJoker,
                inlineIndex = true,
                selected = card.id == selectedId,
                modifier = positioned,
                onClick = if (myTurn && state.phase == RummyPhase.DISCARD) {
                    { selectedId = if (selectedId == card.id) null else card.id }
                } else null
            )
        }
    }

    state.result?.let { result ->
        fun nameOf(seat: Int) = if (seat == me) youName else state.players[seat].name
        val winnerName = result.winner?.let(::nameOf)
        GameResultDialog(
            title = when {
                result.winner == me -> stringResource(R.string.game_you_won)
                result.validDeclaration -> stringResource(R.string.rummy_declared_format, winnerName ?: "")
                else -> stringResource(R.string.rummy_wrong_declare_format, nameOf(result.declarer))
            },
            lines = state.players.indices.map { i -> stringResource(R.string.rummy_points_format, nameOf(i), result.points[i]) },
            primaryText = if (session.isHost) stringResource(R.string.game_new_game) else null,
            onPrimary = {
                selectedId = null
                session.submit(RummyAction.Next)
            },
            secondaryText = stringResource(R.string.game_back_to_khel),
            onSecondary = onBackClick
        )
    }

    if (session.connectionLost) ConnectionLostDialog(onBackClick)
}

@Composable
private fun Pile(label: String, content: @Composable () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        content()
        Text(text = label, style = MaterialTheme.typography.labelMedium, color = ParchmentTextDim, modifier = Modifier.padding(top = 2.dp))
    }
}
