package com.rangepatte.app.game.twentynine

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
import com.rangepatte.app.game.tricks.TrickRound
import com.rangepatte.app.game.tricks.TrickTable
import com.rangepatte.app.game.tricks.TrumpPickerDialog
import com.rangepatte.app.game.tricks.suitLabel
import com.rangepatte.app.game.tricks.trickSeatNames
import com.rangepatte.app.net.GameSession

/**
 * Twenty Nine: bid on your first four cards, the top bidder picks a hidden trump, then play eight tricks.
 * Jacks are worth 3, nines 2, aces and tens 1 — 28 points in all. You and your partner (opposite)
 * must score at least your bid when you win it. Trump stays hidden until someone cannot follow suit.
 */
@Composable
fun TwentyNineScreen(
    game: GameInfo,
    session: GameSession<T9State, TrickAction>,
    onBackClick: () -> Unit
) {
    val state = session.state
    val me = session.mySeat
    val myTeam = TrickEngine.teamOf(me)
    val seatNames = trickSeatNames(session.seatNames, me, partners = true)
    val round: TrickRound? = state.round
    val trickDone = round != null && TrickEngine.isTrickComplete(round)
    val myTurn = state.phase == T9Phase.PLAYING && round != null && !trickDone && round.turn == me

    val bidTexts = List(4) { seat ->
        when (state.bids[seat]) {
            T9State.NOT_BID -> null
            0 -> stringResource(R.string.bid_pass)
            else -> stringResource(R.string.bid_amount_format, state.bids[seat])
        }
    }

    GameFrame(game = game, onBackClick = onBackClick, undo = session.undoControl()) {
        val hand = round?.hands?.get(me) ?: state.firstHands[me]
        val trumpKnown = state.trump != null && (state.highBidder == me || round?.trumpActive == true)
        TrickTable(
            seats = List(4) { seat ->
                SeatView(
                    name = seatNames[seat],
                    cardsLeft = round?.hands?.get(seat)?.size ?: 4,
                    tag = if (state.phase == T9Phase.BIDDING) bidTexts[seat] else if (seat == state.highBidder) stringResource(R.string.bid_amount_format, state.highBid) else null
                )
            },
            mySeat = me,
            turn = when (state.phase) {
                T9Phase.BIDDING -> state.bidTurn
                T9Phase.PLAYING -> round?.turn?.takeIf { !trickDone }
                else -> null
            },
            plays = round?.plays ?: emptyList(),
            winnerSeat = if (round != null && trickDone) TrickEngine.currentWinner(round, TwentyNineEngine.rules) else null,
            myHand = hand,
            playable = if (myTurn) TrickEngine.legal(round!!).map { it.id }.toSet() else emptySet(),
            onPlay = { session.submit(TrickAction.Play(it.id)) },
            info = buildList {
                if (myTurn || (state.phase == T9Phase.BIDDING && state.bidTurn == me)) add(stringResource(R.string.game_your_turn))
                else if (state.phase == T9Phase.PLAYING && round != null && !trickDone) add(stringResource(R.string.turn_indicator_format, seatNames[round.turn]))
                else if (state.phase == T9Phase.BIDDING) add(stringResource(R.string.turn_indicator_format, seatNames[state.bidTurn]))
                if (state.phase == T9Phase.PLAYING) {
                    add(stringResource(R.string.t9_bid_line_format, seatNames[state.highBidder], state.highBid))
                    add(if (trumpKnown) stringResource(R.string.trick_trump_format, suitLabel(state.trump!!)) else stringResource(R.string.trick_trump_hidden))
                    add(stringResource(R.string.t9_points_format, state.teamPoints[myTeam], state.teamPoints[1 - myTeam]))
                }
                add(stringResource(R.string.t9_game_points_format, state.gameScore[myTeam], state.gameScore[1 - myTeam]))
            },
            highlightFirstInfo = myTurn
        )
    }

    if (state.phase == T9Phase.BIDDING && state.bidTurn == me) {
        BidDialog(
            title = stringResource(R.string.bid_title),
            hand = state.firstHands[me],
            min = TwentyNineEngine.minBid(state),
            max = TwentyNineEngine.MAX_BID,
            info = listOf(
                if (state.highBid == 0) stringResource(R.string.bid_none_yet)
                else stringResource(R.string.bid_highest_format, state.highBid, seatNames[state.highBidder])
            ),
            canPass = true,
            onBid = { session.submit(TrickAction.Bid(it)) },
            onPass = { session.submit(TrickAction.Bid(0)) }
        )
    }
    if (state.phase == T9Phase.TRUMP_CHOICE && state.highBidder == me) {
        TrumpPickerDialog(cards = state.firstHands[me], onPick = { session.submit(TrickAction.Trump(it)) })
    }

    state.result?.let { result ->
        if (state.phase == T9Phase.ROUND_OVER || state.phase == T9Phase.MATCH_OVER) {
            val bidderIsUs = state.bidderTeam == myTeam
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
                    stringResource(R.string.t9_game_points_format, state.gameScore[myTeam], state.gameScore[1 - myTeam])
                ),
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
