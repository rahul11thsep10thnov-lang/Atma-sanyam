package com.rangepatte.app.ui.snakes

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.domain.snakes.SnakesBoard
import com.rangepatte.app.domain.snakes.SnakesPhase
import com.rangepatte.app.domain.snakes.SnakesState
import com.rangepatte.app.domain.talk.TableMessage
import com.rangepatte.app.game.common.TalkBubble
import com.rangepatte.app.ui.board.LudoPalette
import com.rangepatte.app.ui.components.royal.antiquePlaque
import com.rangepatte.app.ui.friends.PersonAvatar
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.PanelWoodDark

/**
 * Stage 5 for Moksha Patam: there are no yards, so one antique plaque per player sits in a row above
 * the board — the avatar with a colour ring and suit badge (the robot disc for the computer), the
 * username, and the square the token stands on. The current player's plaque glows; a finished one
 * shows the place. Stage 8 states (a kept seat counting down, a computer takeover) and stage 9
 * bubbles (the newest table-talk message per seat, under the plaque) live here too.
 */
@Composable
fun SnakesPlaqueRow(
    state: SnakesState, youName: String, mySeat: Int, modifier: Modifier = Modifier,
    away: Map<Int, Long> = emptyMap(), botSeats: Set<Int> = emptySet(), now: Long = 0L, messages: List<TableMessage> = emptyList()
) {
    val places = listOf(R.string.ludo_place_1, R.string.ludo_place_2, R.string.ludo_place_3, R.string.ludo_place_4).map { stringResource(it) }
    val computer = stringResource(R.string.ludo_plaque_computer)
    val start = stringResource(R.string.snakes_square_start)
    val latest = messages.groupBy { it.seat }.mapValues { it.value.last() }
    Column(modifier = modifier.fillMaxWidth()) {
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
            state.players.forEachIndexed { i, p ->
                val awayLeft = away[i]?.let { ((it - now) / 1000).toInt().coerceAtLeast(0) }
                val takenOver = awayLeft == null && i in botSeats && !p.isBot
                val place = state.places.indexOf(i).takeIf { it >= 0 && (p.isHome || state.phase == SnakesPhase.OVER) }?.let { places.getOrElse(it) { "${it + 1}" } }
                Plaque(
                    name = if (takenOver) computer else if (i == mySeat) youName else p.name,
                    avatarId = p.avatarId, isBot = p.isBot || takenOver, awayLeft = awayLeft,
                    suit = p.color.suit, tint = LudoPalette.of(p.color),
                    detail = when {
                        awayLeft != null -> stringResource(R.string.ludo_away_format, awayLeft)
                        place != null -> place
                        p.square == SnakesBoard.START -> start
                        else -> "${p.square}"
                    },
                    isTurn = state.turn == i && state.phase != SnakesPhase.OVER,
                    modifier = Modifier.weight(1f)
                )
            }
        }
        if (latest.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
                state.players.indices.forEach { i ->
                    Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.TopCenter) {
                        latest[i]?.let { m -> TalkBubble(name = "", id = m.id) }
                    }
                }
            }
            latest[TableMessage.WATCHER]?.let { m ->
                Box(modifier = Modifier.fillMaxWidth().padding(top = 4.dp), contentAlignment = Alignment.Center) { TalkBubble(name = m.name, id = m.id) }
            }
        }
    }
}

@Composable
private fun Plaque(name: String, avatarId: String?, isBot: Boolean, awayLeft: Int?, suit: String, tint: Color, detail: String, isTurn: Boolean, modifier: Modifier = Modifier) {
    val label = stringResource(R.string.snakes_plaque_format, name, detail)
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp),
        modifier = modifier
            .alpha(if (awayLeft != null) 0.6f else 1f)
            .antiquePlaque(active = isTurn, cornerRadius = 6.dp)
            .background(Brush.verticalGradient(listOf(if (isTurn) Color(0xFF4A2A14) else PanelWoodDark, PanelWoodDark)), RoundedCornerShape(6.dp))
            .border(1.dp, if (isTurn) GoldenGlow else GoldBevelDark, RoundedCornerShape(6.dp))
            .padding(horizontal = 4.dp, vertical = 4.dp)
            .semantics { contentDescription = label }
    ) {
        Box(contentAlignment = Alignment.BottomEnd) {
            Box(modifier = Modifier.size(26.dp).border(2.dp, tint, CircleShape), contentAlignment = Alignment.Center) {
                if (awayLeft != null) Text("⏳", fontSize = 12.sp) else if (isBot) Text("🤖", fontSize = 12.sp) else PersonAvatar(avatarId, online = true, size = 20.dp)
            }
            Text(suit, fontSize = 8.sp, color = Color.White, fontWeight = FontWeight.Black, modifier = Modifier.offset(x = 2.dp, y = 2.dp).background(tint, CircleShape).padding(horizontal = 2.dp))
        }
        Text(name, fontSize = 10.sp, lineHeight = 11.sp, fontWeight = FontWeight.Bold, color = if (isTurn) GoldenGlow else GoldBevelLight, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(detail, fontSize = 9.sp, lineHeight = 10.sp, fontWeight = FontWeight.Black, color = if (isTurn) GoldenGlow else GoldBevelLight, maxLines = 1)
    }
}
