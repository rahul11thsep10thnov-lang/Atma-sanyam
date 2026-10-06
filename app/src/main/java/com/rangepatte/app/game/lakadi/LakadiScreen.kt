package com.rangepatte.app.game.lakadi

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.game.common.ConnectionLostDialog
import com.rangepatte.app.game.common.GameFrame
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.game.common.undoControl
import com.rangepatte.app.game.tricks.BidDialog
import com.rangepatte.app.game.tricks.SeatView
import com.rangepatte.app.game.tricks.TrickAction
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.TrickTable
import com.rangepatte.app.game.tricks.trickSeatNames
import com.rangepatte.app.net.GameSession

/**
 * Lakadi: four players, each for themselves, spades always trump, five hands. Bid how many tricks you
 * will win, then win exactly that many (or a few more — each extra trick adds only 0.1). Falling short loses your bid.
 */
@Composable
fun LakadiScreen(
    game: GameInfo,
    session: GameSession<LkState, TrickAction>,
    onBackClick: () -> Unit
) {
    val state = session.state
    val me = session.mySeat
    val seatNames = trickSeatNames(session.seatNames, me, partners = false)
    val round = state.round
    val trickDone = TrickEngine.isTrickComplete(round)
    val myTurn = state.phase == LkPhase.PLAYING && !trickDone && round.turn == me

    GameFrame(game = game, onBackClick = onBackClick, undo = session.undoControl()) {
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
            mySeat = me,
            turn = when (state.phase) {
                LkPhase.BIDDING -> state.bidTurn
                LkPhase.PLAYING -> if (trickDone) null else round.turn
                else -> null
            },
            plays = round.plays,
            winnerSeat = if (trickDone) TrickEngine.currentWinner(round, LakadiEngine.rules) else null,
            myHand = round.hands[me],
            playable = if (myTurn) TrickEngine.legal(round).map { it.id }.toSet() else emptySet(),
            onPlay = { session.submit(TrickAction.Play(it.id)) },
            info = buildList {
                if (myTurn || (state.phase == LkPhase.BIDDING && state.bidTurn == me)) add(stringResource(R.string.game_your_turn))
                else if (state.phase == LkPhase.PLAYING && !trickDone) add(stringResource(R.string.turn_indicator_format, seatNames[round.turn]))
                else if (state.phase == LkPhase.BIDDING) add(stringResource(R.string.turn_indicator_format, seatNames[state.bidTurn]))
                add(stringResource(R.string.lk_hand_format, state.handNumber, LakadiEngine.HANDS_PER_GAME))
            },
            highlightFirstInfo = myTurn
        )
    }

    if (state.phase == LkPhase.BIDDING && state.bidTurn == me) {
        BidDialog(
            title = stringResource(R.string.bid_tricks_title),
            hand = round.hands[me],
            min = 1,
            max = LakadiEngine.MAX_BID,
            info = listOf(stringResource(R.string.lk_hand_format, state.handNumber, LakadiEngine.HANDS_PER_GAME)),
            canPass = false,
            onBid = { session.submit(TrickAction.Bid(it)) },
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
                winners == listOf(me) -> stringResource(R.string.game_you_won)
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
            primaryText = if (!session.isHost) null
            else if (gameOver) stringResource(R.string.game_new_game) else stringResource(R.string.game_next_round),
            onPrimary = { session.submit(TrickAction.Next) },
            secondaryText = stringResource(R.string.game_back_to_khel),
            onSecondary = onBackClick
        )
    }

    if (session.connectionLost) ConnectionLostDialog(onBackClick)
}
