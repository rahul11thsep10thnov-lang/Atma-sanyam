package com.rangepatte.app.ui.board

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
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import com.rangepatte.app.game.common.TalkTray
import com.rangepatte.app.game.common.TalkControl
import com.rangepatte.app.game.common.TalkButton
import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.audio.GameAudio
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.domain.board.BoardGameInfo
import com.rangepatte.app.domain.ludo.LudoEvent
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoState
import com.rangepatte.app.game.common.StatusLine
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.ParchmentText

/** The board with its nameplates and die; stateless so the harness can draw any position. */
@Composable
fun LudoTable(state: LudoState, isMyTurn: Boolean, shownDice: Int?, pulse: Float, onRoll: () -> Unit, onMove: (Int) -> Unit, motion: MotionFrame = MotionFrame(), die: DieFrame = DieFrame(shownDice, 0f, false, 0f), mySeat: Int = 0, away: Map<Int, Long> = emptyMap(), botSeats: Set<Int> = emptySet(), now: Long = 0L, talk: TalkControl? = null) {
    val youName = stringResource(R.string.player_you)
    Spacer(modifier = Modifier.height(6.dp))
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
    // Stage 8: while someone is away the line also says that the computer is playing for them.
    val awayNote = away.keys.firstOrNull()?.let { seat -> stringResource(R.string.ludo_status_away_format, state.players.getOrNull(seat)?.name.orEmpty()) }
    StatusLine(text = if (awayNote != null && status.isNotEmpty()) "$status · $awayNote" else awayNote ?: status, highlight = isMyTurn, compact = true)

    // The board, with each player's plaque laid over their own yard (stage 5).
    Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 2.dp)) {
        LudoBoardView(state = state, highlight = if (isMyTurn) state.movable else emptyList(), onTokenTap = onMove, pulse = pulse, motion = motion)
        LudoYardPlaques(state = state, youName = youName, mySeat = mySeat, away = away, botSeats = botSeats, now = now, messages = talk?.messages.orEmpty())
    }

    // The die and the Roll button sit below the board, never on it; with other people, the talk button joins them (stage 9).
    var showTalk by remember { mutableStateOf(false) }
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp, Alignment.CenterHorizontally), modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Die(value = die.face ?: shownDice, highlight = isMyTurn && state.phase == LudoPhase.ROLL, rotation = die.rotation, sixFlash = die.sixFlash)
        RoyalButton(text = stringResource(R.string.ludo_roll), onClick = { GameAudio.play(Sfx.UI_TAP); onRoll() }, enabled = isMyTurn && state.phase == LudoPhase.ROLL, style = RoyalButtonStyle.CRIMSON)
        if (talk != null) TalkButton(onClick = { GameAudio.play(if (showTalk) Sfx.UI_CLOSE else Sfx.UI_OPEN); showTalk = !showTalk })
    }
    if (talk != null && showTalk) {
        TalkTray(talk, onClose = { GameAudio.play(Sfx.UI_CLOSE); showTalk = false }, modifier = Modifier.padding(horizontal = 4.dp))
    }
    Spacer(modifier = Modifier.height(4.dp))
}

/** An ivory die with a gold edge showing [value] (blank before the first roll). */
@Composable
fun Die(value: Int?, highlight: Boolean, modifier: Modifier = Modifier, rotation: Float = 0f, sixFlash: Float = 0f) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .size(52.dp)
            .graphicsLayer { rotationZ = rotation; scaleX = 1f + 0.1f * sixFlash; scaleY = 1f + 0.1f * sixFlash }
            .background(Brush.verticalGradient(listOf(Color.White, Color(0xFFF3E7CB))), RoundedCornerShape(10.dp))
            .border(2.dp, if (sixFlash > 0f) Color(0xFFF5C542) else if (highlight) GoldBevelLight else GoldBevelDark, RoundedCornerShape(10.dp))
    ) {
        val faces = listOf("", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅")
        if (value != null) Text(faces[value], fontSize = 40.sp, color = Color(0xFF24160C), fontWeight = FontWeight.Bold)
        else Text("?", style = MaterialTheme.typography.titleLarge, color = GoldBevelDark)
    }
}
