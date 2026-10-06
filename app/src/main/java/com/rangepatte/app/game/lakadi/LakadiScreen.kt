package com.rangepatte.app.game.lakadi

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.res.stringResource
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.AiDifficulty
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.domain.model.PlayMode
import com.rangepatte.app.game.common.GameFrame
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.game.common.UndoControl
import com.rangepatte.app.game.common.UndoHistory
import com.rangepatte.app.game.tricks.BidDialog
import com.rangepatte.app.game.tricks.SeatView
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.TrickTable
import com.rangepatte.app.game.tricks.trickSeatNames
import kotlinx.coroutines.delay

/**
 * Lakadi: four players, each for themselves, spades always trump, five hands. Bid how many tricks you
 * will win, then win exactly that many (or a few more — each extra trick adds only 0.1). Falling short loses your bid.
 */
@Composable
fun LakadiScreen(
    game: GameInfo,
    playMode: PlayMode,
    difficulty: AiDifficulty,
    onBackClick: () -> Unit
) {
    val seatNames = trickSeatNames(partners = false)
    var state by remember { mutableStateOf(LakadiEngine.newGame()) }
    val undo = remember { UndoHistory<LkState>() }
    val round = state.round
    val trickDone = TrickEngine.isTrickComplete(round)
    val myTurn = state.phase == LkPhase.PLAYING && !trickDone && round.turn == 0

    LaunchedEffect(state) {
        when (state.phase) {
            LkPhase.BIDDING -> if (state.bidTurn != 0) {
                delay(1000)
                state = LakadiEngine.bid(state, LakadiAi.bid(state, difficulty)) ?: state
            }
            LkPhase.PLAYING -> when {
                TrickEngine.isTrickComplete(state.round) -> {
                    delay(1300)
                    state = LakadiEngine.resolveTrick(state)
                }
                state.round.turn != 0 -> {
                    delay(800)
                    state = LakadiEngine.play(state, LakadiAi.chooseCard(state, difficulty)) ?: state
                }
            }
            else -> Unit
        }
    }

    GameFrame(
        game = game,
        onBackClick = onBackClick,
        undo = if (playMode.allowsUndo) UndoControl(
            usesLeft = undo.usesLeft,
            enabled = undo.canUndo && myTurn,
            onUndo = { undo.undo()?.let { state = it } }
        ) else null
    ) {
        val won = TrickEngine.tricksWonBySeat(round)
        TrickTable(
            seats = List(4) { seat ->
                val bid = state.bids[seat]
                SeatView(
                    name = seatNames[seat],
                    cardsLeft = round.hands[seat].size,
                    tag = if (bid == LkState.NOT_BID) null
                    else if (state.phase == LkPhase.BIDDING) stringResource(R.string.bid_amount_format, bid)
                    else stringResource(R.string.lk_seat_tag_format, bid, won[seat]),
                    detail = stringResource(R.string.lk_score_format, LakadiEngine.format(state.scoresTenths[seat]))
                )
            },
            turn = when (state.phase) {
                LkPhase.BIDDING -> state.bidTurn
                LkPhase.PLAYING -> if (trickDone) null else round.turn
                else -> null
            },
            plays = round.plays,
            winnerSeat = if (trickDone) TrickEngine.currentWinner(round, LakadiEngine.rules) else null,
            myHand = round.hands[0],
            playable = if (myTurn) TrickEngine.legal(round).map { it.id }.toSet() else emptySet(),
            onPlay = { card ->
                LakadiEngine.play(state, card)?.let {
                    undo.record(state)
                    state = it
                }
            },
            info = buildList {
                if (myTurn) add(stringResource(R.string.game_your_turn))
                else if (state.phase == LkPhase.PLAYING && !trickDone) add(stringResource(R.string.turn_indicator_format, seatNames[round.turn]))
                else if (state.phase == LkPhase.BIDDING) add(if (state.bidTurn == 0) stringResource(R.string.game_your_turn) else stringResource(R.string.turn_indicator_format, seatNames[state.bidTurn]))
                add(stringResource(R.string.lk_hand_format, state.handNumber, LakadiEngine.HANDS_PER_GAME))
            },
            highlightFirstInfo = myTurn
        )
    }

    if (state.phase == LkPhase.BIDDING && state.bidTurn == 0) {
        BidDialog(
            title = stringResource(R.string.bid_tricks_title),
            hand = round.hands[0],
            min = 1,
            max = LakadiEngine.MAX_BID,
            info = listOf(stringResource(R.string.lk_hand_format, state.handNumber, LakadiEngine.HANDS_PER_GAME)),
            canPass = false,
            onBid = { state = LakadiEngine.bid(state, it) ?: state },
            onPass = {}
        )
    }

    if (state.phase == LkPhase.HAND_OVER || state.phase == LkPhase.GAME_OVER) {
        val gameOver = state.phase == LkPhase.GAME_OVER
        val best = state.scoresTenths.max()
        val winners = state.scoresTenths.indices.filter { state.scoresTenths[it] == best }
        GameResultDialog(
            title = when {
                !gameOver -> stringResource(R.string.lk_hand_over_format, state.handNumber)
                winners == listOf(0) -> stringResource(R.string.game_you_won)
                else -> stringResource(R.string.lk_wins_format, seatNames[winners.first()])
            },
            lines = state.scoresTenths.indices.map { seat ->
                val delta = state.lastDeltaTenths[seat]
                stringResource(
                    R.string.lk_line_format,
                    seatNames[seat],
                    (if (delta > 0) "+" else "") + LakadiEngine.format(delta),
                    LakadiEngine.format(state.scoresTenths[seat])
                )
            },
            primaryText = if (gameOver) stringResource(R.string.game_new_game) else stringResource(R.string.game_next_round),
            onPrimary = {
                state = if (gameOver) LakadiEngine.newGame() else LakadiEngine.nextHand(state)
                undo.reset()
            },
            secondaryText = stringResource(R.string.game_back_to_khel),
            onSecondary = onBackClick
        )
    }
}
