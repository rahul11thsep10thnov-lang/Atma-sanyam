package com.rangepatte.app.game.dehlapakad

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
 * Dehla Pakad: capture the four tens. Won tricks pile up on the table and are only taken when the same
 * player wins two tricks in a row. There is no trump until the first player who cannot follow suit names it.
 */
@Composable
fun DehlaPakadScreen(
    game: GameInfo,
    playMode: PlayMode,
    difficulty: AiDifficulty,
    onBackClick: () -> Unit
) {
    val seatNames = trickSeatNames(partners = true)
    var state by remember { mutableStateOf(DehlaPakadEngine.newMatch()) }
    val undo = remember { UndoHistory<DpState>() }
    val round = state.round
    val trickDone = TrickEngine.isTrickComplete(round)
    val needsCall = DehlaPakadEngine.needsTrumpCall(state)
    val myTurn = state.phase == DpPhase.PLAYING && !trickDone && round.turn == 0 && !needsCall

    LaunchedEffect(state) {
        if (state.phase != DpPhase.PLAYING) return@LaunchedEffect
        val r = state.round
        when {
            TrickEngine.isTrickComplete(r) -> {
                delay(1300)
                state = DehlaPakadEngine.resolveTrick(state)
            }
            r.turn != 0 && DehlaPakadEngine.needsTrumpCall(state) -> {
                delay(800)
                state = DehlaPakadEngine.callTrump(state, DehlaPakadAi.chooseTrump(state))
            }
            r.turn != 0 -> {
                delay(800)
                state = DehlaPakadEngine.play(state, DehlaPakadAi.chooseCard(state, difficulty)) ?: state
            }
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
        TrickTable(
            seats = List(4) { SeatView(seatNames[it], round.hands[it].size) },
            turn = if (state.phase == DpPhase.PLAYING && !trickDone) round.turn else null,
            plays = round.plays,
            winnerSeat = if (trickDone) TrickEngine.currentWinner(round, DehlaPakadEngine.rules) else null,
            myHand = round.hands[0],
            playable = if (myTurn) TrickEngine.legal(round).map { it.id }.toSet() else emptySet(),
            onPlay = { card ->
                DehlaPakadEngine.play(state, card)?.let {
                    undo.record(state)
                    state = it
                }
            },
            info = buildList {
                if (myTurn) add(stringResource(R.string.game_your_turn))
                else if (state.phase == DpPhase.PLAYING && !trickDone) add(stringResource(R.string.turn_indicator_format, seatNames[round.turn]))
                add(
                    round.trumpSuit?.let { stringResource(R.string.trick_trump_format, suitLabel(it)) }
                        ?: stringResource(R.string.dp_trump_not_called)
                )
                add(stringResource(R.string.dp_tens_format, state.teamTens[0], state.teamTens[1]))
                add(stringResource(R.string.dp_pile_format, state.pile.size, state.handsWon[0], state.handsWon[1]))
            },
            highlightFirstInfo = myTurn
        )
    }

    // You are the first player who cannot follow suit: name the trump.
    if (state.phase == DpPhase.PLAYING && needsCall && round.turn == 0 && !trickDone) {
        TrumpPickerDialog(cards = round.hands[0], onPick = { state = DehlaPakadEngine.callTrump(state, it) })
    }

    state.result?.let { result ->
        if (state.phase != DpPhase.PLAYING) {
            val won = result.winnerTeam == 0
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
                    add(stringResource(R.string.dp_tens_format, result.tens[0], result.tens[1]))
                    add(stringResource(R.string.dp_hands_format, state.handsWon[0], state.handsWon[1]))
                },
                primaryText = if (matchOver) stringResource(R.string.game_new_match) else stringResource(R.string.game_next_round),
                onPrimary = {
                    state = if (matchOver) DehlaPakadEngine.newMatch() else DehlaPakadEngine.nextRound(state)
                    undo.reset()
                },
                secondaryText = stringResource(R.string.game_back_to_khel),
                onSecondary = onBackClick
            )
        }
    }
}
