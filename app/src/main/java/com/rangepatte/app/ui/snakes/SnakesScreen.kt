package com.rangepatte.app.ui.snakes

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.audio.GameAudio
import com.rangepatte.app.audio.Sfx
import com.rangepatte.app.domain.snakes.Outcome
import com.rangepatte.app.domain.snakes.SnakesPhase
import com.rangepatte.app.domain.snakes.SnakesState
import com.rangepatte.app.game.common.StatusLine
import com.rangepatte.app.game.common.TalkButton
import com.rangepatte.app.game.common.TalkControl
import com.rangepatte.app.game.common.TalkTray
import com.rangepatte.app.ui.board.Die
import com.rangepatte.app.ui.board.DieFrame
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle

/**
 * The Moksha Patam table (stage 3, Royal court): the status line, the players' plaques in a row,
 * the board, and the die with the Roll button (and the talk button with other people) below it.
 * Stateless: everything it shows comes from the state and the motion frames.
 */
@Composable
fun SnakesTable(
    state: SnakesState, isMyTurn: Boolean, shownDice: Int?, pulse: Float, onRoll: () -> Unit,
    motion: SnakesFrame = SnakesFrame(), die: DieFrame = DieFrame(shownDice, 0f, false, 0f), mySeat: Int = 0,
    away: Map<Int, Long> = emptyMap(), botSeats: Set<Int> = emptySet(), now: Long = 0L, talk: TalkControl? = null
) {
    val youName = stringResource(R.string.player_you)
    Spacer(modifier = Modifier.height(6.dp))
    val t = state.last
    fun nameOf(seat: Int) = if (seat == mySeat) youName else state.players[seat].name
    val status = when {
        state.phase == SnakesPhase.OVER -> ""
        isMyTurn -> stringResource(R.string.game_your_turn)
        t == null -> stringResource(R.string.turn_indicator_format, nameOf(state.turn))
        t.outcome == Outcome.NO_ENTRY -> stringResource(R.string.snakes_no_entry_format, nameOf(t.player))
        t.outcome == Outcome.STAYED -> stringResource(R.string.snakes_stay_format, nameOf(t.player), t.from)
        t.captured.isNotEmpty() -> stringResource(R.string.snakes_capture_format, nameOf(t.player), nameOf(t.captured.first()))
        t.climbed -> stringResource(R.string.snakes_ladder_format, nameOf(t.player), t.to)
        t.slid -> stringResource(R.string.snakes_snake_format, nameOf(t.player), t.to)
        t.outcome == Outcome.BOUNCED -> stringResource(R.string.snakes_bounce_format, nameOf(t.player), t.to)
        else -> stringResource(R.string.turn_indicator_format, nameOf(state.turn))
    }
    val awayNote = away.keys.firstOrNull()?.let { seat -> stringResource(R.string.ludo_status_away_format, state.players.getOrNull(seat)?.name.orEmpty()) }
    StatusLine(text = if (awayNote != null && status.isNotEmpty()) "$status · $awayNote" else awayNote ?: status, highlight = isMyTurn, compact = true)

    SnakesPlaqueRow(state = state, youName = youName, mySeat = mySeat, away = away, botSeats = botSeats, now = now, messages = talk?.messages.orEmpty(), modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp))
    SnakesBoardView(state = state, pulse = pulse, motion = motion, modifier = Modifier.padding(horizontal = 2.dp))

    var showTalk by remember { mutableStateOf(false) }
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp, Alignment.CenterHorizontally), modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Die(value = die.face ?: shownDice, highlight = isMyTurn && state.phase == SnakesPhase.ROLL, rotation = die.rotation, sixFlash = die.sixFlash)
        RoyalButton(text = stringResource(R.string.ludo_roll), onClick = { GameAudio.play(Sfx.UI_TAP); onRoll() }, enabled = isMyTurn && state.phase == SnakesPhase.ROLL, style = RoyalButtonStyle.CRIMSON)
        if (talk != null) TalkButton(onClick = { GameAudio.play(if (showTalk) Sfx.UI_CLOSE else Sfx.UI_OPEN); showTalk = !showTalk })
    }
    if (talk != null && showTalk) {
        TalkTray(talk, onClose = { GameAudio.play(Sfx.UI_CLOSE); showTalk = false }, modifier = Modifier.padding(horizontal = 4.dp))
    }
    Spacer(modifier = Modifier.height(4.dp))
}
