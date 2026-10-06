package com.rangepatte.app.game.dehlapakad

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.game.common.ConnectionLostDialog
import com.rangepatte.app.game.common.GameFrame
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.game.common.undoControl
import com.rangepatte.app.game.tricks.SeatView
import com.rangepatte.app.game.tricks.TrickAction
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.TrickTable
import com.rangepatte.app.game.tricks.TrumpPickerDialog
import com.rangepatte.app.game.tricks.suitLabel
import com.rangepatte.app.game.tricks.trickSeatNames
import com.rangepatte.app.net.GameSession

/**
 * Dehla Pakad: capture the four tens. Won tricks pile up on the table and are only taken when the same
 * player wins two tricks in a row. There is no trump until the first player who cannot follow suit names it.
 */
@Composable
fun DehlaPakadScreen(
    game: GameInfo,
    session: GameSession<DpState, TrickAction>,
    onBackClick: () -> Unit
) {
    val state = session.state
    val me = session.mySeat
    val myTeam = TrickEngine.teamOf(me)
    val seatNames = trickSeatNames(session.seatNames, me, partners = true)
    val round = state.round
    val trickDone = TrickEngine.isTrickComplete(round)
    val needsCall = DehlaPakadEngine.needsTrumpCall(state)
    val myTurn = state.phase == DpPhase.PLAYING && !trickDone && round.turn == me && !needsCall

    GameFrame(game = game, onBackClick = onBackClick, undo = session.undoControl()) {
        TrickTable(
            seats = List(4) { SeatView(seatNames[it], round.hands[it].size) },
            mySeat = me,
            turn = if (state.phase == DpPhase.PLAYING && !trickDone) round.turn else null,
            plays = round.plays,
            winnerSeat = if (trickDone) TrickEngine.currentWinner(round, DehlaPakadEngine.rules) else null,
            myHand = round.hands[me],
            playable = if (myTurn) TrickEngine.legal(round).map { it.id }.toSet() else emptySet(),
            onPlay = { session.submit(TrickAction.Play(it.id)) },
            info = buildList {
                if (myTurn) add(stringResource(R.string.game_your_turn))
                else if (state.phase == DpPhase.PLAYING && !trickDone) add(stringResource(R.string.turn_indicator_format, seatNames[round.turn]))
                add(
                    round.trumpSuit?.let { stringResource(R.string.trick_trump_format, suitLabel(it)) }
                        ?: stringResource(R.string.dp_trump_not_called)
                )
                add(stringResource(R.string.dp_tens_format, state.teamTens[myTeam], state.teamTens[1 - myTeam]))
                add(stringResource(R.string.dp_pile_format, state.pile.size, state.handsWon[myTeam], state.handsWon[1 - myTeam]))
            },
            highlightFirstInfo = myTurn
        )
    }

    // You are the first player who cannot follow suit: name the trump.
    if (state.phase == DpPhase.PLAYING && needsCall && round.turn == me && !trickDone) {
        TrumpPickerDialog(cards = round.hands[me], onPick = { session.submit(TrickAction.Trump(it)) })
    }

    state.result?.let { result ->
        if (state.phase != DpPhase.PLAYING) {
            val won = result.winnerTeam == myTeam
            val matchOver = state.phase == DpPhase.MATCH_OVER
            GameResultDialog(
                title = when {
                    matchOver && won -> stringResource(R.string.trick_match_won)
                    matchOver -> stringResource(R.string.trick_match_lost)
                    won -> stringResource(R.string.trick_team_won_round)
                    else -> stringResource(R.string.trick_team_lost_round)
                },
                lines = buildList {
                    if (result.kot) add(stringResource(R.string.dp_kot))
                    add(stringResource(R.string.dp_tens_format, result.tens[myTeam], result.tens[1 - myTeam]))
                    add(stringResource(R.string.dp_hands_format, state.handsWon[myTeam], state.handsWon[1 - myTeam]))
                },
                primaryText = if (!session.isHost) null
                else if (matchOver) stringResource(R.string.game_new_match) else stringResource(R.string.game_next_round),
                onPrimary = { session.submit(TrickAction.Next) },
                secondaryText = stringResource(R.string.game_back_to_khel),
                onSecondary = onBackClick
            )
        }
    }

    if (session.connectionLost) ConnectionLostDialog(onBackClick)
}
