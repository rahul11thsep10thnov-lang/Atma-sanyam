package com.rangepatte.app.game.coatpiece

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
import com.rangepatte.app.game.tricks.SeatView
import com.rangepatte.app.game.tricks.TrickEngine
import com.rangepatte.app.game.tricks.TrickTable
import com.rangepatte.app.game.tricks.TrumpPickerDialog
import com.rangepatte.app.game.tricks.suitLabel
import com.rangepatte.app.game.tricks.trickSeatNames
import kotlinx.coroutines.delay

/**
 * Coat Piece against three computer players, you and your partner (opposite) against the other pair.
 * The trump caller sees five cards and names trump; then play all 13 tricks following suit. A team that
 * wins 7 or more tricks scores a court; first to three courts wins.
 */
@Composable
fun CoatPieceScreen(
    game: GameInfo,
    playMode: PlayMode,
    difficulty: AiDifficulty,
    onBackClick: () -> Unit
) {
    val seatNames = trickSeatNames(partners = true)
    var state by remember { mutableStateOf(CoatPieceEngine.newMatch()) }
    val undo = remember { UndoHistory<CpState>() }
    val round = state.round
    val myTurn = state.phase == CpPhase.PLAYING && !TrickEngine.isTrickComplete(round) && round.turn == 0

    LaunchedEffect(state) {
        when (state.phase) {
            CpPhase.TRUMP_CALL -> if (state.caller != 0) {
                delay(1000)
                state = CoatPieceEngine.callTrump(state, CoatPieceAi.chooseTrump(state))
            }
            CpPhase.PLAYING -> when {
                TrickEngine.isTrickComplete(state.round) -> {
                    delay(1300)
                    state = CoatPieceEngine.resolveTrick(state)
                }
                state.round.turn != 0 -> {
                    delay(800)
                    state = CoatPieceEngine.play(state, CoatPieceAi.chooseCard(state, difficulty)) ?: state
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
        val tricks = TrickEngine.tricksWonByTeam(round)
        val hand = if (state.phase == CpPhase.TRUMP_CALL) round.hands[0].take(5) else round.hands[0]
        TrickTable(
            seats = List(4) { seat ->
                SeatView(seatNames[seat], round.hands[seat].size, tag = if (seat == state.caller) stringResource(R.string.cp_trump_caller) else null)
            },
            turn = if (state.phase == CpPhase.PLAYING) round.turn.takeIf { !TrickEngine.isTrickComplete(round) } else null,
            plays = round.plays,
            winnerSeat = if (TrickEngine.isTrickComplete(round)) TrickEngine.currentWinner(round, CoatPieceEngine.rules) else null,
            myHand = hand,
            playable = if (myTurn) TrickEngine.legal(round).map { it.id }.toSet() else emptySet(),
            onPlay = { card ->
                CoatPieceEngine.play(state, card)?.let {
                    undo.record(state)
                    state = it
                }
            },
            info = buildList {
                add(
                    if (myTurn) stringResource(R.string.game_your_turn)
                    else if (state.phase == CpPhase.PLAYING && !TrickEngine.isTrickComplete(round)) stringResource(R.string.turn_indicator_format, seatNames[round.turn])
                    else ""
                )
                round.trumpSuit?.let { add(stringResource(R.string.trick_trump_format, suitLabel(it))) }
                add(stringResource(R.string.trick_tricks_format, tricks[0], tricks[1]))
                add(stringResource(R.string.cp_courts_format, state.courts[0], state.courts[1]))
            }.filter { it.isNotEmpty() },
            highlightFirstInfo = myTurn
        )
    }

    if (state.phase == CpPhase.TRUMP_CALL && state.caller == 0) {
        TrumpPickerDialog(cards = state.callerFirstFive, onPick = { state = CoatPieceEngine.callTrump(state, it) })
    }

    if (state.phase == CpPhase.ROUND_OVER || state.phase == CpPhase.MATCH_OVER) {
        val won = state.roundWinnerTeam == 0
        val matchOver = state.phase == CpPhase.MATCH_OVER
        GameResultDialog(
            title = when {
                matchOver && won -> stringResource(R.string.trick_match_won)
                matchOver -> stringResource(R.string.trick_match_lost)
                won -> stringResource(R.string.trick_team_won_round)
                else -> stringResource(R.string.trick_team_lost_round)
            },
            lines = listOf(
                stringResource(R.string.trick_tricks_format, state.tricksByTeam[0], state.tricksByTeam[1]),
                stringResource(R.string.cp_courts_format, state.courts[0], state.courts[1])
            ),
            primaryText = if (matchOver) stringResource(R.string.game_new_match) else stringResource(R.string.game_next_round),
            onPrimary = {
                state = if (matchOver) CoatPieceEngine.newMatch() else CoatPieceEngine.nextRound(state)
                undo.reset()
            },
            secondaryText = stringResource(R.string.game_back_to_khel),
            onSecondary = onBackClick
        )
    }
}
