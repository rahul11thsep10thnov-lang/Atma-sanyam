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
import androidx.compose.runtime.LaunchedEffect
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
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.domain.model.PlayMode
import com.rangepatte.app.domain.model.Rank
import com.rangepatte.app.game.common.AI_NAMES
import com.rangepatte.app.game.common.CardSlot
import com.rangepatte.app.game.common.CardView
import com.rangepatte.app.game.common.GameFrame
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.game.common.SeatPlaque
import com.rangepatte.app.game.common.StatusLine
import com.rangepatte.app.game.common.UndoControl
import com.rangepatte.app.game.common.UndoHistory
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.ParchmentTextDim
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/** The hand split into melds (shown grouped) and loose cards, as found by the meld solver. */
private class Arranged(val melds: List<List<RCard>>, val loose: List<RCard>)

/** Natural cards low to high first, then Jokers / wild cards — easier to read than the order they were dealt. */
private fun orderedMeld(cards: List<RCard>, wild: Rank): List<RCard> =
    cards.sortedWith(compareBy({ it.isPrintedJoker || it.rank == wild }, { it.suit?.ordinal ?: 0 }, { it.rank?.value ?: 0 }))

private fun sortedLoose(cards: List<RCard>): List<RCard> =
    cards.sortedWith(compareBy({ it.isPrintedJoker }, { it.suit?.ordinal ?: 0 }, { it.rank?.value ?: 0 }))

/**
 * 13-card rummy against the computer. Draw from the deck or the discard pile, then discard; your hand
 * is arranged for you into sequences and sets (shown grouped). When every card is in a meld — with a
 * pure sequence and at least two sequences — pick the card to finish with and press Declare.
 */
@Composable
fun RummyScreen(
    game: GameInfo,
    playMode: PlayMode,
    playerCount: Int,
    difficulty: AiDifficulty,
    onBackClick: () -> Unit
) {
    val youName = stringResource(R.string.player_you)
    val names = remember(playerCount, youName) { listOf(youName) + AI_NAMES.take(playerCount - 1) }
    var state by remember { mutableStateOf(RummyEngine.newGame(names)) }
    var selectedId by remember { mutableStateOf<Int?>(null) }
    val undo = remember { UndoHistory<RummyState>() }
    val myTurn = state.phase != RummyPhase.FINISHED && state.current.isHuman

    // The computer plays its turn after a short pause, off the main thread (the meld search is heavy-ish).
    LaunchedEffect(state.turn, state.phase) {
        if (state.phase != RummyPhase.FINISHED && !state.current.isHuman) {
            delay(900)
            val snapshot = state
            state = withContext(Dispatchers.Default) { RummyAi.takeTurn(snapshot, difficulty) }
        }
    }

    fun act(next: RummyState?) {
        if (next == null) return
        undo.record(state)
        state = next
        selectedId = null
    }

    val me = state.players[0]
    val arranged by produceState<Arranged?>(null, me.hand, state.wildRank) {
        value = withContext(Dispatchers.Default) {
            val solution = MeldSession(me.hand, state.wildRank).arrange()
            Arranged(
                melds = solution.melds.map { group -> orderedMeld(group.map { me.hand[it] }, state.wildRank) },
                loose = sortedLoose(solution.leftover.map { me.hand[it] })
            )
        }
    }

    GameFrame(
        game = game,
        onBackClick = onBackClick,
        undo = if (playMode.allowsUndo) UndoControl(
            usesLeft = undo.usesLeft,
            enabled = undo.canUndo && myTurn,
            onUndo = { undo.undo()?.let { state = it; selectedId = null } }
        ) else null
    ) {
        // Opponents.
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 10.dp, vertical = 6.dp)
        ) {
            state.players.drop(1).forEachIndexed { i, player ->
                SeatPlaque(
                    name = player.name,
                    detail = stringResource(R.string.rummy_cards_format, player.hand.size),
                    isTurn = state.turn == i + 1 && state.phase != RummyPhase.FINISHED
                )
            }
        }

        // Deck, discard pile and the wild joker.
        Row(
            horizontalArrangement = Arrangement.spacedBy(18.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth().padding(top = 6.dp)
        ) {
            Pile(label = stringResource(R.string.rummy_pile_deck)) {
                CardView(
                    card = null,
                    faceDown = true,
                    modifier = Modifier.width(54.dp),
                    onClick = if (myTurn && state.phase == RummyPhase.DRAW) ({ act(RummyEngine.drawFromStock(state)) }) else null
                )
            }
            Pile(label = stringResource(R.string.rummy_pile_discard)) {
                val top = state.discard.lastOrNull()
                if (top == null) {
                    CardSlot(modifier = Modifier.width(54.dp))
                } else {
                    CardView(
                        card = if (top.isPrintedJoker) null else top.toPlayingCard(),
                        isJoker = top.isPrintedJoker,
                        modifier = Modifier.width(54.dp),
                        onClick = if (myTurn && state.phase == RummyPhase.DRAW) ({ act(RummyEngine.drawFromDiscard(state)) }) else null
                    )
                }
            }
            Text(
                text = stringResource(R.string.rummy_wild_format, state.wildRank.label),
                style = MaterialTheme.typography.titleMedium,
                color = GoldBevelLight,
                textAlign = TextAlign.Center,
                modifier = Modifier.width(96.dp)
            )
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
                    onClick = { selectedId?.let { act(RummyEngine.discard(state, it)) } },
                    style = RoyalButtonStyle.STEEL
                )
                RoyalButton(
                    text = stringResource(R.string.rummy_declare),
                    enabled = selectedId != null,
                    onClick = { selectedId?.let { act(RummyEngine.declare(state, it)) } }
                )
            }
        }

        // Your hand, grouped into melds.
        val shown = arranged ?: Arranged(emptyList(), sortedLoose(me.hand))
        Row(
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.Bottom,
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 10.dp, vertical = 8.dp)
        ) {
            (shown.melds + shown.loose.map { listOf(it) }).forEachIndexed { groupIndex, group ->
                val isMeld = groupIndex < shown.melds.size
                HandGroup(
                    cards = group,
                    cardWidth = 50.dp,
                    step = if (isMeld) 24.dp else 26.dp,
                    selectedId = selectedId,
                    onTap = if (myTurn && state.phase == RummyPhase.DISCARD) {
                        { id -> selectedId = if (selectedId == id) null else id }
                    } else null
                )
            }
        }
    }

    state.result?.let { result ->
        val winnerName = result.winner?.let { state.players[it].name }
        GameResultDialog(
            title = when {
                result.winner == 0 -> stringResource(R.string.game_you_won)
                result.validDeclaration -> stringResource(R.string.rummy_declared_format, winnerName ?: "")
                else -> stringResource(R.string.rummy_wrong_declare_format, state.players[result.declarer].name)
            },
            lines = state.players.mapIndexed { i, p -> stringResource(R.string.rummy_points_format, p.name, result.points[i]) },
            primaryText = stringResource(R.string.game_new_game),
            onPrimary = {
                state = RummyEngine.newGame(names)
                selectedId = null
                undo.reset()
            },
            secondaryText = stringResource(R.string.game_back_to_khel),
            onSecondary = onBackClick
        )
    }
}

@Composable
private fun Pile(label: String, content: @Composable () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        content()
        Text(text = label, style = MaterialTheme.typography.labelMedium, color = ParchmentTextDim, modifier = Modifier.padding(top = 2.dp))
    }
}

/** A run of overlapping cards (a meld, or one loose card); tapping picks a card — the picked one lifts. */
@Composable
private fun HandGroup(
    cards: List<RCard>,
    cardWidth: Dp,
    step: Dp,
    selectedId: Int?,
    onTap: ((Int) -> Unit)?
) {
    val cardHeight = cardWidth * 1.42f
    val lift = 10.dp
    Box(modifier = Modifier.width(cardWidth + step * (cards.size - 1)).height(cardHeight + lift)) {
        cards.forEachIndexed { i, card ->
            val picked = card.id == selectedId
            CardView(
                card = if (card.isPrintedJoker) null else card.toPlayingCard(),
                isJoker = card.isPrintedJoker,
                selected = picked,
                modifier = Modifier
                    .width(cardWidth)
                    .offset(x = step * i, y = if (picked) 0.dp else lift),
                onClick = onTap?.let { tap -> { tap(card.id) } }
            )
        }
    }
}
