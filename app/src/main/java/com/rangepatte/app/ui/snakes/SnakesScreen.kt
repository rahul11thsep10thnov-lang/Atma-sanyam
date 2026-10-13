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
import com.rangepatte.app.domain.snakes.SnakesBoard
import com.rangepatte.app.ui.board.BoardTableLayout
import com.rangepatte.app.ui.board.CornerPlayer
import com.rangepatte.app.ui.board.Die
import com.rangepatte.app.ui.board.LudoPalette
import com.rangepatte.app.ui.board.DieFrame
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle

/**
 * The Moksha Patam table: the status line, then the board with a plaque at each corner and the die
 * between the bottom two ([BoardTableLayout], shared with Ludo; side by side in landscape).
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

    val places = listOf(R.string.ludo_place_1, R.string.ludo_place_2, R.string.ludo_place_3, R.string.ludo_place_4).map { stringResource(it) }
    val computer = stringResource(R.string.ludo_plaque_computer)
    val start = stringResource(R.string.snakes_square_start)
    val latest = talk?.messages.orEmpty().groupBy { it.seat }.mapValues { it.value.last() }
    // The same corner plaques as Ludo: this phone's player sits at the bottom-left, the rest clockwise.
    val n = state.players.size
    val seatCorners = when (n) { 4 -> listOf(3, 0, 1, 2); 3 -> listOf(3, 0, 1); else -> listOf(3, 1) }
    val corners = MutableList<CornerPlayer?>(4) { null }
    state.players.forEachIndexed { i, p ->
        val awayLeft = away[i]?.let { ((it - now) / 1000).toInt().coerceAtLeast(0) }
        val takenOver = awayLeft == null && i in botSeats && !p.isBot
        val place = state.places.indexOf(i).takeIf { it >= 0 && (p.isHome || state.phase == SnakesPhase.OVER) }?.let { places.getOrElse(it) { "${it + 1}" } }
        val r = (i - mySeat + n) % n
        corners[seatCorners.getOrElse(r) { r }] = CornerPlayer(
            name = if (takenOver) computer else nameOf(i),
            avatarId = p.avatarId, isBot = p.isBot || takenOver, tint = LudoPalette.of(p.color), suit = p.color.suit,
            filled = null,
            detail = place ?: if (p.square == SnakesBoard.START) start else "${p.square}",
            isTurn = state.turn == i && state.phase != SnakesPhase.OVER, isYou = i == mySeat,
            awayLeft = awayLeft, message = latest[i]
        )
    }
    var showTalk by remember { mutableStateOf(false) }
    BoardTableLayout(
        corners = corners,
        pulse = pulse,
        board = { m -> SnakesBoardView(state = state, pulse = pulse, motion = motion, modifier = m.padding(2.dp)) },
        controls = {
            val canRoll = isMyTurn && state.phase == SnakesPhase.ROLL
            Die(value = shownDice, highlight = canRoll, frame = die, onClick = if (canRoll) ({ GameAudio.play(Sfx.UI_TAP); onRoll() }) else null)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                RoyalButton(text = stringResource(R.string.ludo_roll), onClick = { GameAudio.play(Sfx.UI_TAP); onRoll() }, enabled = canRoll, style = RoyalButtonStyle.CRIMSON, compact = true)
                if (talk != null) TalkButton(onClick = { GameAudio.play(if (showTalk) Sfx.UI_CLOSE else Sfx.UI_OPEN); showTalk = !showTalk })
            }
        },
        below = {
            if (talk != null && showTalk) TalkTray(talk, onClose = { GameAudio.play(Sfx.UI_CLOSE); showTalk = false }, modifier = Modifier.padding(horizontal = 4.dp))
        }
    )
}
