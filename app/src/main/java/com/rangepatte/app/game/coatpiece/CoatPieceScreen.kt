package com.rangepatte.app.game.coatpiece

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
 * Coat Piece, you and your partner (opposite) against the other pair. The trump caller sees five cards
 * and names trump; then play all 13 tricks following suit. A team that wins 7 or more tricks scores a
 * court; first to three courts wins. Played alone against the computer or with other people.
 */
@Composable
fun CoatPieceScreen(
    game: GameInfo,
    session: GameSession<CpState, TrickAction>,
    onBackClick: () -> Unit
) {
    val state = session.state
    val me = session.mySeat
    val myTeam = TrickEngine.teamOf(me)
    val seatNames = trickSeatNames(session.seatNames, me, partners = true)
    val round = state.round
    val trickDone = TrickEngine.isTrickComplete(round)
    val myTurn = state.phase == CpPhase.PLAYING && !trickDone && round.turn == me

    GameFrame(game = game, onBackClick = onBackClick, undo = session.undoControl()) {
        val tricks = TrickEngine.tricksWonByTeam(round)
        val hand = if (state.phase == CpPhase.TRUMP_CALL) round.hands[me].take(5) else round.hands[me]
        TrickTable(
            seats = List(4) { seat ->
                SeatView(seatNames[seat], round.hands[seat].size, tag = if (seat == state.caller) stringResource(R.string.cp_trump_caller) else null)
            },
            mySeat = me,
            turn = if (state.phase == CpPhase.PLAYING && !trickDone) round.turn else null,
            plays = round.plays,
            winnerSeat = if (trickDone) TrickEngine.currentWinner(round, CoatPieceEngine.rules) else null,
            myHand = hand,
            playable = if (myTurn) TrickEngine.legal(round).map { it.id }.toSet() else emptySet(),
            onPlay = { session.submit(TrickAction.Play(it.id)) },
            info = buildList {
                add(
                    if (myTurn) stringResource(R.string.game_your_turn)
                    else if (state.phase == CpPhase.PLAYING && !trickDone) stringResource(R.string.turn_indicator_format, seatNames[round.turn])
                    else ""
                )
                round.trumpSuit?.let { add(stringResource(R.string.trick_trump_format, suitLabel(it))) }
                add(stringResource(R.string.trick_tricks_format, tricks[myTeam], tricks[1 - myTeam]))
                add(stringResource(R.string.cp_courts_format, state.courts[myTeam], state.courts[1 - myTeam]))
            }.filter { it.isNotEmpty() },
            highlightFirstInfo = myTurn
        )
    }

    if (state.phase == CpPhase.TRUMP_CALL && state.caller == me) {
        TrumpPickerDialog(cards = state.callerFirstFive, onPick = { session.submit(TrickAction.Trump(it)) })
    }

    if (state.phase == CpPhase.ROUND_OVER || state.phase == CpPhase.MATCH_OVER) {
        val won = state.roundWinnerTeam == myTeam
        val matchOver = state.phase == CpPhase.MATCH_OVER
        GameResultDialog(
            title = when {
                matchOver && won -> stringResource(R.string.trick_match_won)
                matchOver -> stringResource(R.string.trick_match_lost)
                won -> stringResource(R.string.trick_team_won_round)
                else -> stringResource(R.string.trick_team_lost_round)
            },
            lines = listOf(
                stringResource(R.string.trick_tricks_format, state.tricksByTeam[myTeam], state.tricksByTeam[1 - myTeam]),
                stringResource(R.string.cp_courts_format, state.courts[myTeam], state.courts[1 - myTeam])
            ),
            primaryText = if (!session.isHost) null
            else if (matchOver) stringResource(R.string.game_new_match) else stringResource(R.string.game_next_round),
            onPrimary = { session.submit(TrickAction.Next) },
            secondaryText = stringResource(R.string.game_back_to_khel),
            onSecondary = onBackClick
        )
    }

    if (session.connectionLost) ConnectionLostDialog(onBackClick)
}
