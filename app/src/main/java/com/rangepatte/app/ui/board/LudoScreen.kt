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
import com.rangepatte.app.game.common.LocalUndoButton
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

/**
 * The Ludo table: the status line, then the board with a plaque at each corner and the die between the
 * bottom two ([BoardTableLayout]). The picture is turned so this phone's own yard is at the bottom-left
 * ([ludoQuarterTurns]); the player whose turn it is glows on their plaque and their yard. Stateless, so
 * the harness can draw any position.
 */
@Composable
fun LudoTable(state: LudoState, isMyTurn: Boolean, shownDice: Int?, pulse: Float, onRoll: () -> Unit, onMove: (Int) -> Unit, motion: MotionFrame = MotionFrame(), die: DieFrame = DieFrame(shownDice, 0f, false, 0f), mySeat: Int = 0, away: Map<Int, Long> = emptyMap(), botSeats: Set<Int> = emptySet(), now: Long = 0L, talk: TalkControl? = null) {
    val youName = stringResource(R.string.player_you)
    val computer = stringResource(R.string.ludo_plaque_computer)
    val places = listOf(R.string.ludo_place_1, R.string.ludo_place_2, R.string.ludo_place_3, R.string.ludo_place_4).map { stringResource(it) }
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
    StatusLine(text = if (awayNote != null && status.isNotEmpty()) "$status · $awayNote" else awayNote ?: status, highlight = isMyTurn, compact = true, singleLine = true)

    val viewColor = state.players.getOrNull(mySeat)?.color ?: state.players.first().color
    val turns = ludoQuarterTurns(viewColor)
    val latest = talk?.messages.orEmpty().groupBy { it.seat }.mapValues { it.value.last() }
    val corners = MutableList<CornerPlayer?>(4) { null }
    state.players.forEachIndexed { i, p ->
        val awayLeft = away[i]?.let { ((it - now) / 1000).toInt().coerceAtLeast(0) }
        val takenOver = awayLeft == null && i in botSeats && !p.isBot
        val place = state.places.indexOf(i).takeIf { it >= 0 }?.let { places[it] }
        corners[ludoScreenCorner(p.color, turns)] = CornerPlayer(
            name = if (takenOver) computer else if (i == mySeat) youName else p.name,
            avatarId = p.avatarId, isBot = p.isBot || takenOver, tint = LudoPalette.of(p.color), suit = p.color.suit,
            filled = if (place == null) p.finished else null, detail = place,
            isTurn = state.turn == i && state.phase != LudoPhase.OVER, isYou = i == mySeat,
            awayLeft = awayLeft, message = latest[i]
        )
    }
    var showTalk by remember { mutableStateOf(false) }
    BoardTableLayout(
        corners = corners,
        pulse = pulse,
        board = { m -> LudoBoardView(state = state, highlight = if (isMyTurn) state.movable else emptyList(), onTokenTap = onMove, pulse = pulse, motion = motion, quarterTurns = turns, modifier = m.padding(2.dp)) },
        controls = { dieSize ->
            val canRoll = isMyTurn && state.phase == LudoPhase.ROLL
            Die(value = shownDice, highlight = canRoll, frame = die, size = dieSize, onClick = if (canRoll) ({ GameAudio.play(Sfx.UI_TAP); onRoll() }) else null)
            RoyalButton(text = stringResource(R.string.ludo_roll), onClick = { GameAudio.play(Sfx.UI_TAP); onRoll() }, enabled = canRoll, style = RoyalButtonStyle.CRIMSON, compact = true)
        },
        extras = {
            LocalUndoButton.current?.invoke()
            if (talk != null) TalkButton(onClick = { GameAudio.play(if (showTalk) Sfx.UI_CLOSE else Sfx.UI_OPEN); showTalk = !showTalk })
        },
        below = {
            if (talk != null && showTalk) TalkTray(talk, onClose = { GameAudio.play(Sfx.UI_CLOSE); showTalk = false }, modifier = Modifier.padding(horizontal = 4.dp))
        }
    )
}
