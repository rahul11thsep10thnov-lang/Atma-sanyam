package com.rangepatte.app.game.teenpatti

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.game.common.CardView
import com.rangepatte.app.game.common.ConnectionLostDialog
import com.rangepatte.app.game.common.GameFrame
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.game.common.LocalTableArea
import com.rangepatte.app.ui.thumbnails.CARD_ASPECT
import com.rangepatte.app.game.common.SeatPlaque
import com.rangepatte.app.game.common.StatusLine
import com.rangepatte.app.game.common.undoControl
import com.rangepatte.app.net.GameSession
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.ParchmentText

/**
 * Teen Patti / Flush, against the computer or other people, for points only (never money). Everyone puts
 * in a boot; look at your cards ("See") or play blind for half the price. On your turn Call (chaal),
 * Raise, Pack, or — when two players remain and you've seen your cards — ask for a Show.
 */
@Composable
fun TeenPattiScreen(
    game: GameInfo,
    session: GameSession<TpState, TpAction>,
    onBackClick: () -> Unit
) {
    val state = session.state
    val me = state.seats[session.mySeat]
    val mySeat = session.mySeat
    val seatCount = state.seats.size
    val youName = stringResource(R.string.player_you)
    val myTurn = state.phase == TpPhase.BETTING && state.turn == mySeat

    GameFrame(game = game, onBackClick = onBackClick, undo = session.undoControl()) {
        // Pot and stake.
        Row(
            horizontalArrangement = Arrangement.spacedBy(20.dp, Alignment.CenterHorizontally),
            modifier = Modifier.fillMaxWidth().padding(top = 6.dp)
        ) {
            Text(stringResource(R.string.tp_pot_format, state.pot), style = MaterialTheme.typography.titleLarge, color = GoldenGlow)
            Text(stringResource(R.string.tp_stake_format, state.stake), style = MaterialTheme.typography.titleLarge, color = GoldBevelLight)
        }

        // The computer players.
        Column(
            verticalArrangement = Arrangement.spacedBy(6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp)
                .weight(1f)
                .verticalScroll(rememberScrollState())
        ) {
            (1 until seatCount).map { (mySeat + it) % seatCount }.chunked(2).forEach { rowSeats ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    rowSeats.forEach { index ->
                        val seat = state.seats[index]
                        SeatPlaque(
                            name = seat.name,
                            tag = statusOf(seat),
                            detail = stringResource(R.string.tp_chips_format, seat.chips),
                            isTurn = state.phase == TpPhase.BETTING && state.turn == index,
                            dimmed = seat.packed,
                            compact = seatCount > 3
                        )
                    }
                }
            }
            state.lastAction?.let { action ->
                Text(
                    text = describe(action, if (action.seat == mySeat) youName else state.seats[action.seat].name),
                    style = MaterialTheme.typography.bodyLarge,
                    color = ParchmentText,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 6.dp)
                )
            }
        }

        // Your cards.
        StatusLine(
            text = when {
                state.phase == TpPhase.ENDED -> ""
                myTurn -> stringResource(R.string.game_your_turn)
                else -> stringResource(R.string.turn_indicator_format, state.current.name)
            },
            highlight = myTurn
        )
        // Your three cards, as large as the table allows.
        val area = LocalTableArea.current
        val handCard = minOf(112.dp, (area.width - 48.dp) / 3, area.height * 0.2f / CARD_ASPECT)
        Row(
            horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally),
            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)
        ) {
            me.hand.forEach { card ->
                CardView(
                    card = card,
                    faceDown = !me.seen && state.phase == TpPhase.BETTING,
                    dimmed = me.packed,
                    modifier = Modifier.width(handCard)
                )
            }
        }
        SeatPlaque(
            name = youName,
            tag = statusOf(me),
            detail = stringResource(R.string.tp_chips_format, me.chips),
            isTurn = myTurn,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )

        // Your moves.
        Column(
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                RoyalButton(
                    text = stringResource(R.string.tp_see),
                    enabled = myTurn && TeenPattiEngine.canSee(state),
                    onClick = { session.submit(TpAction.SEE) },
                    style = RoyalButtonStyle.STEEL,
                    modifier = Modifier.weight(1f)
                )
                RoyalButton(
                    text = stringResource(R.string.tp_pack),
                    enabled = myTurn,
                    onClick = { session.submit(TpAction.PACK) },
                    style = RoyalButtonStyle.STEEL,
                    modifier = Modifier.weight(1f)
                )
                RoyalButton(
                    text = stringResource(R.string.tp_show),
                    enabled = myTurn && (TeenPattiEngine.canShow(state) || (state.activeCount == 2 && !TeenPattiEngine.canChaal(state))),
                    onClick = { session.submit(TpAction.SHOW) },
                    style = RoyalButtonStyle.STEEL,
                    modifier = Modifier.weight(1f)
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                RoyalButton(
                    text = stringResource(R.string.tp_chaal_format, if (myTurn) TeenPattiEngine.chaalCost(state) else 0),
                    enabled = myTurn && TeenPattiEngine.canChaal(state),
                    onClick = { session.submit(TpAction.CHAAL) },
                    modifier = Modifier.weight(1f)
                )
                RoyalButton(
                    text = stringResource(R.string.tp_raise_format, if (myTurn) TeenPattiEngine.raiseCost(state) else 0),
                    enabled = myTurn && TeenPattiEngine.canRaise(state),
                    onClick = { session.submit(TpAction.RAISE) },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }

    state.result?.let { result ->
        val broke = state.seats[0].chips < TeenPattiEngine.BOOT
        val nameOf = { seat: Int -> if (seat == mySeat) youName else state.seats[seat].name }
        GameResultDialog(
            title = if (result.winner == mySeat) stringResource(R.string.game_you_won) else stringResource(R.string.tp_winner_format, nameOf(result.winner), result.pot),
            lines = buildList {
                if (result.winner == mySeat) add(stringResource(R.string.tp_winner_format, youName, result.pot))
                add(stringResource(R.string.tp_chips_format, me.chips))
                if (broke) add(stringResource(R.string.tp_out_of_points))
            },
            primaryText = if (!session.isHost) null
            else if (broke) stringResource(R.string.game_new_game) else stringResource(R.string.tp_next_hand),
            onPrimary = { session.submit(TpAction.NEXT_HAND) },
            secondaryText = stringResource(R.string.game_back_to_khel),
            onSecondary = onBackClick,
            extra = {
                if (result.showdown) {
                    state.seats.indices.filter { !state.seats[it].packed }.forEach { index ->
                        val seat = state.seats[index]
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
                            modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                        ) {
                            Text(nameOf(index), style = MaterialTheme.typography.labelLarge, color = GoldBevelLight, modifier = Modifier.width(56.dp))
                            seat.hand.forEach { CardView(card = it, modifier = Modifier.width(44.dp)) }
                            Text(handName(TeenPattiRanking.evaluate(seat.hand).category), style = MaterialTheme.typography.labelMedium, color = ParchmentText)
                        }
                    }
                }
            }
        )
    }

    if (session.connectionLost) ConnectionLostDialog(onBackClick)
}

@Composable
private fun statusOf(seat: TpSeat): String = when {
    seat.packed -> stringResource(R.string.tp_packed)
    seat.seen -> stringResource(R.string.tp_seen)
    else -> stringResource(R.string.tp_blind)
}

@Composable
private fun describe(action: TpLastAction, name: String): String = when (action.kind) {
    TpActionKind.SEE -> stringResource(R.string.tp_action_see_format, name)
    TpActionKind.PACK -> stringResource(R.string.tp_action_pack_format, name)
    TpActionKind.SHOW -> stringResource(R.string.tp_action_show_format, name)
    TpActionKind.RAISE -> stringResource(R.string.tp_action_raise_format, name, action.amount)
    TpActionKind.CHAAL -> if (action.wasBlind) stringResource(R.string.tp_action_blind_format, name, action.amount)
    else stringResource(R.string.tp_action_chaal_format, name, action.amount)
}

@Composable
private fun handName(category: HandCategory): String = when (category) {
    HandCategory.TRAIL -> stringResource(R.string.tp_hand_trail)
    HandCategory.PURE_SEQUENCE -> stringResource(R.string.tp_hand_pure_sequence)
    HandCategory.SEQUENCE -> stringResource(R.string.tp_hand_sequence)
    HandCategory.COLOR -> stringResource(R.string.tp_hand_color)
    HandCategory.PAIR -> stringResource(R.string.tp_hand_pair)
    HandCategory.HIGH_CARD -> stringResource(R.string.tp_hand_high_card)
}
