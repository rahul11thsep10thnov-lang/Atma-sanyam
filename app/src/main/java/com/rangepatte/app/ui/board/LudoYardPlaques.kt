package com.rangepatte.app.ui.board

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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.domain.talk.TableMessage
import com.rangepatte.app.game.common.TalkBubble
import com.rangepatte.app.ui.friends.PersonAvatar
import com.rangepatte.app.ui.theme.GoldenGlow

/** What one corner plaque shows (Ludo and Moksha Patam share it). */
data class CornerPlayer(
    val name: String,
    val avatarId: String?,
    val isBot: Boolean,
    val tint: Color,
    val suit: String,
    /** Four pips: how many are filled (tokens home in Ludo). Null hides the pips and shows [detail]. */
    val filled: Int?,
    val detail: String?,
    val isTurn: Boolean,
    val isYou: Boolean,
    /** Seconds left while a dropped player's seat is kept (stage 8); null otherwise. */
    val awayLeft: Int?,
    val message: TableMessage? = null
)

/**
 * A player's plaque at a corner of the board, as in the classic layout: the avatar ringed in the
 * player's colour on the outer side, the name, and four pips that fill as tokens get home. When it is
 * this player's turn the plaque is lit up boldly — a thick pulsing gold border, a brighter fill, a
 * slight lift and a "YOUR TURN" / "TURN" tag — so nobody can miss whose move it is.
 */
@Composable
fun CornerPlaque(player: CornerPlayer?, alignEnd: Boolean, onTop: Boolean, pulse: Float, modifier: Modifier = Modifier, compact: Boolean = false) {
    if (compact) { SidePlaque(player, pulse, alignEnd, modifier); return }
    Box(modifier = modifier, contentAlignment = if (alignEnd) Alignment.CenterEnd else Alignment.CenterStart) {
        if (player == null) return@Box
        val turn = player.isTurn
        val shape = RoundedCornerShape(30.dp)
        val label = stringResource(R.string.ludo_plaque_label_format, player.name, player.filled ?: 0)
        // The TURN tag floats just outside the plaque instead of taking a row of its own, so the board keeps the height.
        Box(contentAlignment = if (alignEnd) Alignment.CenterEnd else Alignment.CenterStart) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier
                    .scale(if (turn) 1.06f else 1f)
                    .alpha(if (player.awayLeft != null) 0.6f else 1f)
                    .shadow(if (turn) 14.dp else 4.dp, shape, ambientColor = GoldenGlow, spotColor = GoldenGlow)
                    .background(Brush.horizontalGradient(listOf(lerp(player.tint, Color.Black, if (turn) 0.15f else 0.45f), lerp(player.tint, Color.Black, if (turn) 0.35f else 0.65f))), shape)
                    .border(if (turn) (3 + 2 * pulse).dp else 1.5.dp, if (turn) lerp(Color(0xFFFFD54F), Color.White, pulse * 0.5f) else player.tint, shape)
                    .padding(horizontal = 6.dp, vertical = 5.dp)
                    .semantics { contentDescription = label }
            ) {
                if (!alignEnd) Avatar(player)
                Column(horizontalAlignment = if (alignEnd) Alignment.End else Alignment.Start, modifier = Modifier.padding(horizontal = 4.dp)) {
                    Text(
                        text = player.name, fontSize = 14.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold,
                        color = if (turn) Color.White else Color(0xFFEDE3CF), maxLines = 1, overflow = TextOverflow.Ellipsis
                    )
                    when {
                        player.awayLeft != null -> Text(stringResource(R.string.ludo_away_format, player.awayLeft), fontSize = 11.sp, color = Color(0xFFEDE3CF))
                        player.filled != null -> Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(top = 3.dp)) {
                            repeat(4) { i ->
                                Box(Modifier.size(11.dp).background(if (i < player.filled) GoldenGlow else player.tint, CircleShape).border(1.dp, Color.White.copy(alpha = 0.8f), CircleShape))
                            }
                        }
                        player.detail != null -> Text(player.detail, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = if (turn) GoldenGlow else Color(0xFFEDE3CF), maxLines = 1)
                    }
                }
                if (alignEnd) Avatar(player)
            }
            if (turn) Box(modifier = Modifier.align(if (onTop) Alignment.TopCenter else Alignment.BottomCenter).offset(y = if (onTop) (-20).dp else 20.dp)) { TurnTag(player.isYou, pulse) }
        }
        player.message?.let { m ->
            Box(modifier = Modifier.align(if (alignEnd) Alignment.TopEnd else Alignment.TopStart).offset(y = if (onTop) 58.dp else (-58).dp)) {
                TalkBubble(name = "", id = m.id)
            }
        }
    }
}

/**
 * The narrow plaque for the side columns of a landscape table: the avatar above the name and the four
 * pips (or the square), in a tall rounded card. The turn is shown just as boldly — a thick pulsing gold
 * border, a brighter fill and the TURN tag on top.
 */
@Composable
private fun SidePlaque(player: CornerPlayer?, pulse: Float, rightSide: Boolean, modifier: Modifier) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        if (player == null) return@Box
        val turn = player.isTurn
        val shape = RoundedCornerShape(16.dp)
        val label = stringResource(R.string.ludo_plaque_label_format, player.name, player.filled ?: 0)
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            if (turn) TurnTag(player.isYou, pulse)
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .alpha(if (player.awayLeft != null) 0.6f else 1f)
                    .shadow(if (turn) 12.dp else 3.dp, shape, ambientColor = GoldenGlow, spotColor = GoldenGlow)
                    .background(Brush.verticalGradient(listOf(lerp(player.tint, Color.Black, if (turn) 0.15f else 0.45f), lerp(player.tint, Color.Black, if (turn) 0.35f else 0.65f))), shape)
                    .border(if (turn) (3 + 2 * pulse).dp else 1.5.dp, if (turn) lerp(Color(0xFFFFD54F), Color.White, pulse * 0.5f) else player.tint, shape)
                    .padding(horizontal = 4.dp, vertical = 5.dp)
                    .semantics { contentDescription = label }
            ) {
                Avatar(player)
                Text(
                    text = player.name, fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold,
                    color = if (turn) Color.White else Color(0xFFEDE3CF), maxLines = 1, overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp)
                )
                when {
                    player.awayLeft != null -> Text(stringResource(R.string.ludo_away_format, player.awayLeft), fontSize = 10.sp, color = Color(0xFFEDE3CF), maxLines = 1)
                    player.filled != null -> Row(horizontalArrangement = Arrangement.spacedBy(3.dp), modifier = Modifier.padding(top = 2.dp)) {
                        repeat(4) { i ->
                            Box(Modifier.size(9.dp).background(if (i < player.filled) GoldenGlow else player.tint, CircleShape).border(1.dp, Color.White.copy(alpha = 0.8f), CircleShape))
                        }
                    }
                    player.detail != null -> Text(player.detail, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (turn) GoldenGlow else Color(0xFFEDE3CF), maxLines = 1)
                }
            }
        }
        player.message?.let { m ->
            // The bubble leans over the edge of the board, so it never covers the die or the Roll button.
            Box(modifier = Modifier.align(if (rightSide) Alignment.CenterStart else Alignment.CenterEnd).offset(x = if (rightSide) (-56).dp else 56.dp)) { TalkBubble(name = "", id = m.id) }
        }
    }
}

@Composable
private fun Avatar(player: CornerPlayer) {
    Box(contentAlignment = Alignment.BottomEnd) {
        Box(
            modifier = Modifier.size(42.dp).background(Color(0xFF2B1A0E), CircleShape).border(if (player.isTurn) 3.dp else 2.dp, if (player.isTurn) Color(0xFFFFD54F) else player.tint, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            when {
                player.awayLeft != null -> Text("⏳", fontSize = 18.sp)
                player.isBot -> Text("🤖", fontSize = 18.sp)
                else -> PersonAvatar(player.avatarId, online = true, size = 34.dp)
            }
        }
        Text(player.suit, fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Black, modifier = Modifier.offset(x = 3.dp, y = 3.dp).background(player.tint, CircleShape).padding(horizontal = 3.dp))
    }
}

@Composable
private fun TurnTag(isYou: Boolean, pulse: Float) {
    Text(
        text = stringResource(if (isYou) R.string.board_your_turn_tag else R.string.board_turn_tag),
        fontSize = 12.sp, fontWeight = FontWeight.Black, color = Color(0xFF3A2208),
        modifier = Modifier
            .padding(vertical = 3.dp)
            .background(lerp(Color(0xFFFFD54F), Color.White, pulse * 0.35f), RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 2.dp)
    )
}
