package com.rangepatte.app.ui.board

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.domain.board.BoardGameInfo
import com.rangepatte.app.domain.ludo.LudoEvent
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoSetup
import com.rangepatte.app.domain.ludo.LudoState
import com.rangepatte.app.game.common.GameFrameChrome
import com.rangepatte.app.game.common.GameResultDialog
import com.rangepatte.app.game.common.SeatPlaque
import com.rangepatte.app.game.common.StatusLine
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.ParchmentText

/**
 * The Ludo table (stage 3, Design 10): the approved board in the shared game frame, the players'
 * nameplates above it, the die and the Roll button below it. Dice and token animations are stage 4;
 * for now the die shows its face and a movable token glows.
 */
@Composable
fun LudoScreen(game: BoardGameInfo, setup: LudoSetup, onBackClick: () -> Unit) {
    val youName = stringResource(R.string.player_you)
    val session = remember { LudoSession(setup, youName, listOf("Ravi", "Meera", "Gopal")) }
    DisposableEffect(session) { session.start(); onDispose { session.close() } }
    val state = session.state
    val pulse by rememberInfiniteTransition(label = "ludoPulse").animateFloat(0f, 1f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "pulse")

    GameFrameChrome(
        title = stringResource(game.nameRes),
        rules = { onDismiss ->
            GameResultDialog(
                title = stringResource(R.string.action_rules),
                lines = listOf(R.string.ludo_rules_1, R.string.ludo_rules_2, R.string.ludo_rules_3, R.string.ludo_rules_4, R.string.ludo_rules_5).map { stringResource(it) },
                primaryText = stringResource(R.string.spectate_ok), onPrimary = onDismiss
            )
        },
        onBackClick = onBackClick
    ) {
        LudoTable(state = state, isMyTurn = session.isMyTurn, shownDice = session.shownDice, pulse = pulse, onRoll = session::roll, onMove = session::move)
    }

    if (state.phase == LudoPhase.OVER) {
        val ordinals = listOf(R.string.ludo_place_1, R.string.ludo_place_2, R.string.ludo_place_3, R.string.ludo_place_4).map { stringResource(it) }
        GameResultDialog(
            title = if (state.places.firstOrNull() == session.mySeat) stringResource(R.string.game_you_won) else stringResource(R.string.ludo_match_over),
            lines = state.places.mapIndexed { i, p -> "${ordinals[i]} · ${state.players[p].name}" },
            primaryText = stringResource(R.string.game_back_to_khel),
            onPrimary = onBackClick
        )
    }
}

/** The board with its nameplates and die; stateless so the harness can draw any position. */
@Composable
fun LudoTable(state: LudoState, isMyTurn: Boolean, shownDice: Int?, pulse: Float, onRoll: () -> Unit, onMove: (Int) -> Unit) {
    val youName = stringResource(R.string.player_you)
    // Nameplates: two per row, in seat order; each shows tokens home and glows on its turn.
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth().padding(top = 6.dp, bottom = 4.dp)) {
        state.players.forEachIndexed { i, p ->
            SeatPlaque(
                name = if (i == 0) youName else p.name,
                tag = p.color.suit,
                detail = "${p.finished}/4",
                isTurn = state.turn == i && state.phase != LudoPhase.OVER,
                dimmed = i in state.places,
                compact = true,
                modifier = Modifier.weight(1f)
            )
        }
    }
    val event = state.lastEvent
    val status = when {
        state.phase == LudoPhase.OVER -> ""
        isMyTurn && state.phase == LudoPhase.MOVE -> stringResource(R.string.ludo_pick_token)
        isMyTurn -> stringResource(R.string.game_your_turn)
        event is LudoEvent.Rolled && event.noMove -> stringResource(R.string.ludo_no_move_format, state.players[event.player].name, event.value)
        event is LudoEvent.Moved && event.captured.isNotEmpty() -> stringResource(R.string.ludo_capture_format, state.players[event.player].name)
        event is LudoEvent.Forfeit -> stringResource(R.string.ludo_forfeit_format, state.players[event.player].name)
        else -> stringResource(R.string.turn_indicator_format, state.current.name)
    }
    StatusLine(text = status, highlight = isMyTurn, compact = true)

    LudoBoardView(state = state, highlight = if (isMyTurn) state.movable else emptyList(), onTokenTap = onMove, pulse = pulse, modifier = Modifier.padding(horizontal = 2.dp))

    // The die and the Roll button sit below the board, never on it.
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp, Alignment.CenterHorizontally), modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Die(value = shownDice, highlight = isMyTurn && state.phase == LudoPhase.ROLL)
        RoyalButton(text = stringResource(R.string.ludo_roll), onClick = onRoll, enabled = isMyTurn && state.phase == LudoPhase.ROLL, style = RoyalButtonStyle.CRIMSON)
    }
    Spacer(modifier = Modifier.height(4.dp))
}

/** An ivory die with a gold edge showing [value] (blank before the first roll). */
@Composable
fun Die(value: Int?, highlight: Boolean, modifier: Modifier = Modifier) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .size(52.dp)
            .background(Brush.verticalGradient(listOf(Color.White, Color(0xFFF3E7CB))), RoundedCornerShape(10.dp))
            .border(2.dp, if (highlight) GoldBevelLight else GoldBevelDark, RoundedCornerShape(10.dp))
    ) {
        val faces = listOf("", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅")
        if (value != null) Text(faces[value], fontSize = 40.sp, color = Color(0xFF24160C), fontWeight = FontWeight.Bold)
        else Text("?", style = MaterialTheme.typography.titleLarge, color = GoldBevelDark)
    }
}
