package com.rangepatte.app.ui.board

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.domain.ludo.LudoBoard
import com.rangepatte.app.domain.ludo.LudoPhase
import com.rangepatte.app.domain.ludo.LudoState
import com.rangepatte.app.ui.components.royal.antiquePlaque
import com.rangepatte.app.ui.friends.PersonAvatar
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.PanelWoodDark

/**
 * Stage 5 (approved: Design 1's plaque, in each player's own yard). Over the board, one antique
 * plaque per player sits in the middle of their yard, between the four nests: the Friends avatar
 * with a colour ring and suit badge, the username, and four token pips that fill gold as tokens get
 * home. The current player's plaque glows; a finished player's shows their place.
 *
 * Stage 8: a seat in [away] (seat → the moment its window closes) dims, shows an hourglass and counts
 * down "back in N s" from [now]; a seat in [botSeats] that the state still lists as a person has been
 * taken over by the computer and says so.
 */
@Composable
fun LudoYardPlaques(state: LudoState, youName: String, mySeat: Int, modifier: Modifier = Modifier, away: Map<Int, Long> = emptyMap(), botSeats: Set<Int> = emptySet(), now: Long = 0L) {
    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        val s = maxWidth
        val cell = s / (LudoBoard.SIZE + 1.2f)
        val margin = cell * 0.6f
        val width = cell * 3.6f
        val height = cell * 2.2f
        val places = listOf(R.string.ludo_place_1, R.string.ludo_place_2, R.string.ludo_place_3, R.string.ludo_place_4).map { stringResource(it) }
        val computer = stringResource(R.string.ludo_plaque_computer)
        state.players.forEachIndexed { i, p ->
            val o = LudoBoard.yardOrigin(p.color)
            val x = margin + cell * (o.col + 3) - width / 2
            val y = margin + cell * (o.row + 3) - height / 2
            val place = state.places.indexOf(i).takeIf { it >= 0 }?.let { places[it] }
            val awayLeft = away[i]?.let { ((it - now) / 1000).toInt().coerceAtLeast(0) }
            val takenOver = awayLeft == null && i in botSeats && !p.isBot
            YardPlaque(
                name = if (takenOver) computer else if (i == mySeat) youName else p.name,
                avatarId = p.avatarId,
                isBot = p.isBot || takenOver,
                awayLeft = awayLeft,
                suit = p.color.suit,
                tint = LudoPalette.of(p.color),
                home = p.finished,
                place = place,
                isTurn = state.turn == i && state.phase != LudoPhase.OVER,
                width = width,
                modifier = Modifier.offset(x = x, y = y)
            )
        }
    }
}

@Composable
private fun YardPlaque(name: String, avatarId: String?, isBot: Boolean, awayLeft: Int?, suit: String, tint: Color, home: Int, place: String?, isTurn: Boolean, width: Dp, modifier: Modifier = Modifier) {
    val label = stringResource(R.string.ludo_plaque_label_format, name, home)
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp),
        modifier = modifier
            .width(width)
            .alpha(if (awayLeft != null) 0.6f else 1f)
            .antiquePlaque(active = isTurn, cornerRadius = 6.dp)
            .background(Brush.verticalGradient(listOf(if (isTurn) Color(0xFF4A2A14) else PanelWoodDark, PanelWoodDark)), RoundedCornerShape(6.dp))
            .border(1.dp, if (isTurn) GoldenGlow else GoldBevelDark, RoundedCornerShape(6.dp))
            .padding(horizontal = 4.dp, vertical = 3.dp)
            .semantics { contentDescription = label }
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
            Box(contentAlignment = Alignment.BottomEnd) {
                Box(modifier = Modifier.size(20.dp).border(2.dp, tint, CircleShape), contentAlignment = Alignment.Center) {
                    if (awayLeft != null) Text("⏳", fontSize = 10.sp) else if (isBot) Text("🤖", fontSize = 10.sp) else PersonAvatar(avatarId, online = true, size = 16.dp)
                }
                Text(suit, fontSize = 8.sp, color = Color.White, fontWeight = FontWeight.Black, modifier = Modifier.offset(x = 2.dp, y = 2.dp).background(tint, CircleShape).padding(horizontal = 2.dp))
            }
            Text(
                text = name,
                fontSize = 9.sp,
                lineHeight = 10.sp,
                fontWeight = FontWeight.Bold,
                color = if (isTurn) GoldenGlow else GoldBevelLight,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f, fill = false)
            )
        }
        if (awayLeft != null) {
            Text(stringResource(R.string.ludo_away_format, awayLeft), fontSize = 8.sp, lineHeight = 9.sp, fontWeight = FontWeight.Bold, color = GoldBevelLight, maxLines = 1)
        } else if (place != null) {
            Text(place, fontSize = 8.sp, lineHeight = 9.sp, fontWeight = FontWeight.Black, color = GoldenGlow)
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                repeat(4) { i ->
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .background(if (i < home) GoldenGlow else Color(0xFF4A301B), CircleShape)
                            .border(1.dp, if (i < home) GoldBevelLight else GoldBevelDark, CircleShape)
                    )
                }
            }
        }
    }
}
