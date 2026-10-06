package com.rangepatte.app.game.twentynine

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
import com.rangepatte.app.game.tricks.TrickRound
import com.rangepatte.app.game.tricks.TrickTable
import com.rangepatte.app.game.tricks.TrumpPickerDialog
import com.rangepatte.app.game.tricks.suitLabel
import com.rangepatte.app.game.tricks.trickSeatNames
import kotlinx.coroutines.delay

/**
 * Twenty Nine: bid on your first four cards, the top bidder picks a hidden trump, then play eight tricks.
 * Jacks are worth 3, nines 2, aces and tens 1 — 28 points in all. You and your partner (opposite)
 * must score at least your bid when you win it. Trump stays hidden until someone cannot follow suit.
 */
@Composable
fun TwentyNineScreen(
    game: GameInfo,
    playMode: PlayMode,
    difficulty: AiDifficulty,
    onBackClick: () -> Unit
) {
    val seatNames = trickSeatNames(partners = true)
    var state by remember { mutableStateOf(TwentyNineEngine.newMatch()) }
    val undo = remember { UndoHistory<T9State>() }
    val round: TrickRound? = state.round
    val myTurn = state.phase == T9Phase.PLAYING && round != null && !TrickEngine.isTrickComplete(round) && round.turn == 0

    LaunchedEffect(state) {
        when (state.phase) {
            T9Phase.BIDDING -> if (state.bidTurn != 0) {
                delay(1000)
                state = TwentyNineEngine.bid(state, TwentyNineAi.bid(state, difficulty)) ?: state
            }
            T9Phase.TRUMP_CHOICE -> if (state.highBidder != 0) {
                delay(1000)
                state = TwentyNineEngine.chooseTrump(state, TwentyNineAi.chooseTrump(state)) ?: state
            }
            T9Phase.PLAYING -> {
                val r = state.round!!
                when {
                    TrickEngine.isTrickComplete(r) -> {
                        delay(1300)
                        state = TwentyNineEngine.resolveTrick(state)
                    }
                    r.turn != 0 -> {
                        delay(800)
                        state = TwentyNineEngine.play(state, TwentyNineAi.chooseCard(state, difficulty)) ?: state
                    }
                }
            }
            else -> Unit
        }
    }

    val bidTexts = List(4) { seat ->
        when (state.bids[seat]) {
            T9State.NOT_BID -> null
            0 -> stringResource(R.string.bid_pass)
            else -> stringResource(R.string.bid_amount_format, state.bids[seat])
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
        val hand = round?.hands?.get(0) ?: state.firstHands[0]
        val trumpKnown = state.trump != null && (state.highBidder == 0 || round?.trumpActive == true)
        TrickTable(
            seats = List(4) { seat ->
                SeatView(
                    name = seatNames[seat],
                    cardsLeft = round?.hands?.get(seat)?.size ?: 4,
                    tag = if (state.phase == T9Phase.BIDDING) bidTexts[seat] else if (seat == state.highBidder) stringResource(R.string.bid_amount_format, state.highBid) else null
                )
            },
            turn = when (state.phase) {
                T9Phase.BIDDING -> state.bidTurn
                T9Phase.PLAYING -> round?.turn?.takeIf { !TrickEngine.isTrickComplete(round) }
                else -> null
            },
            plays = round?.plays ?: emptyList(),
            winnerSeat = if (round != null && TrickEngine.isTrickComplete(round)) TrickEngine.currentWinner(round, TwentyNineEngine.rules) else null,
            myHand = hand,
            playable = if (myTurn) TrickEngine.legal(round!!).map { it.id }.toSet() else emptySet(),
            onPlay = { card ->
                TwentyNineEngine.play(state, card)?.let {
                    undo.record(state)
                    state = it
                }
            },
            info = buildList {
                if (myTurn) add(stringResource(R.string.game_your_turn))
                else if (state.phase == T9Phase.PLAYING && round != null && !TrickEngine.isTrickComplete(round)) add(stringResource(R.string.turn_indicator_format, seatNames[round.turn]))
                else if (state.phase == T9Phase.BIDDING) add(if (state.bidTurn == 0) stringResource(R.string.game_your_turn) else stringResource(R.string.turn_indicator_format, seatNames[state.bidTurn]))
                if (state.phase == T9Phase.PLAYING) {
                    add(stringResource(R.string.t9_bid_line_format, seatNames[state.highBidder], state.highBid))
                    add(if (trumpKnown) stringResource(R.string.trick_trump_format, suitLabel(state.trump!!)) else stringResource(R.string.trick_trump_hidden))
                    add(stringResource(R.string.t9_points_format, state.teamPoints[0], state.teamPoints[1]))
                }
                add(stringResource(R.string.t9_game_points_format, state.gameScore[0], state.gameScore[1]))
            },
            highlightFirstInfo = myTurn
        )
    }

    if (state.phase == T9Phase.BIDDING && state.bidTurn == 0) {
        BidDialog(
            title = stringResource(R.string.bid_title),
            hand = state.firstHands[0],
            min = TwentyNineEngine.minBid(state),
            max = TwentyNineEngine.MAX_BID,
            info = listOf(
                if (state.highBid == 0) stringResource(R.string.bid_none_yet)
                else stringResource(R.string.bid_highest_format, state.highBid, seatNames[state.highBidder])
            ),
            canPass = true,
            onBid = { state = TwentyNineEngine.bid(state, it) ?: state },
            onPass = { state = TwentyNineEngine.bid(state, 0) ?: state }
        )
    }
    if (state.phase == T9Phase.TRUMP_CHOICE && state.highBidder == 0) {
        TrumpPickerDialog(cards = state.firstHands[0], onPick = { state = TwentyNineEngine.chooseTrump(state, it) ?: state })
    }

    state.result?.let { result ->
        if (state.phase == T9Phase.ROUND_OVER || state.phase == T9Phase.MATCH_OVER) {
            val bidderIsUs = state.bidderTeam == 0
            val weWon = bidderIsUs == result.made
            val matchOver = state.phase == T9Phase.MATCH_OVER
            val teamName = if (bidderIsUs) stringResource(R.string.team_yours) else stringResource(R.string.team_theirs)
            GameResultDialog(
                title = when {
                    matchOver && weWon -> stringResource(R.string.trick_match_won)
                    matchOver -> stringResource(R.string.trick_match_lost)
                    weWon -> stringResource(R.string.trick_team_won_round)
                    else -> stringResource(R.string.trick_team_lost_round)
                },
                lines = listOf(
                    if (result.made) stringResource(R.string.t9_result_made_format, teamName, result.bid, result.bidderTeamPoints)
                    else stringResource(R.string.t9_result_failed_format, teamName, result.bid, result.bidderTeamPoints),
                    stringResource(R.string.t9_game_points_format, state.gameScore[0], state.gameScore[1])
                ),
                primaryText = if (matchOver) stringResource(R.string.game_new_match) else stringResource(R.string.game_next_round),
                onPrimary = {
                    state = if (matchOver) TwentyNineEngine.newMatch() else TwentyNineEngine.nextRound(state)
                    undo.reset()
                },
                secondaryText = stringResource(R.string.game_back_to_khel),
                onSecondary = onBackClick
            )
        }
    }
}
