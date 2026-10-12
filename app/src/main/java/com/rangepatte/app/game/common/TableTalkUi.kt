package com.rangepatte.app.game.common

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.domain.talk.TableMessage
import com.rangepatte.app.domain.talk.TableTalk
import com.rangepatte.app.ui.components.royal.antiquePlaque
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow

/** Where the seats sit on a game's table, so a message can appear beside the right nameplate. */
enum class TalkLayout {
    /** Four seats around the table: you at the bottom, then right, top, left (the trick games). */
    TRICK,
    /** You at the bottom, everyone else in a row along the top (Rummy, Teen Patti). */
    ROW,
    /** A board with a yard per player (Ludo, stage 9): the board draws the bubbles itself, beside the yard plaques. */
    BOARD
}

/**
 * Table talk as the frame draws it (Element 11, Design 1): a gold speech button, the parchment tray of
 * phrases and emoji, and the plaques that appear beside the sender's nameplate for a few seconds.
 */
class TalkControl(
    val messages: List<TableMessage>,
    val seatNames: List<String>,
    /** The seat the table is drawn from (your own, or the host's when watching). */
    val viewSeat: Int,
    val layout: TalkLayout,
    val canSend: Boolean,
    /** Watchers may send emoji only. */
    val phrasesAllowed: Boolean,
    val mutedSeats: Set<Int>,
    val onSay: (id: Int) -> Unit,
    val onToggleMute: (seat: Int) -> Unit
)

/** The text of a phrase id in the player's language. */
@Composable
fun phraseText(id: Int): String = stringResource(
    when (id) {
        0 -> R.string.talk_phrase_0; 1 -> R.string.talk_phrase_1; 2 -> R.string.talk_phrase_2; 3 -> R.string.talk_phrase_3
        4 -> R.string.talk_phrase_4; 5 -> R.string.talk_phrase_5; 6 -> R.string.talk_phrase_6; 7 -> R.string.talk_phrase_7
        8 -> R.string.talk_phrase_8; else -> R.string.talk_phrase_9
    }
)

/** The spoken label of an emoji id (for screen readers and the plaque's description). */
@Composable
fun emojiLabel(id: Int): String = stringResource(
    when (id - TableTalk.EMOJI_BASE) {
        0 -> R.string.talk_emoji_0; 1 -> R.string.talk_emoji_1; 2 -> R.string.talk_emoji_2; 3 -> R.string.talk_emoji_3
        4 -> R.string.talk_emoji_4; 5 -> R.string.talk_emoji_5; 6 -> R.string.talk_emoji_6; else -> R.string.talk_emoji_7
    }
)

@Composable
private fun messageText(id: Int): String = TableTalk.emojiOf(id) ?: phraseText(id)

/** The small gold speech button that opens the tray. */
@Composable
fun TalkButton(onClick: () -> Unit, modifier: Modifier = Modifier) {
    val label = stringResource(R.string.talk_say_something)
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .size(36.dp)
            .shadow(4.dp, CircleShape)
            .background(Brush.verticalGradient(listOf(GoldenGlow, GoldBevelLight.copy(alpha = 0.95f), GoldBevelDark)), CircleShape)
            .border(1.dp, GoldBevelDark, CircleShape)
            .clickable(onClick = onClick)
            .semantics { contentDescription = label }
    ) {
        Text("💬", fontSize = 17.sp)
    }
}

/**
 * The parchment tray: every phrase as a chip, the emoji in a row, and a mute row for the other seats.
 * One tap sends and closes the tray.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TalkTray(control: TalkControl, onClose: () -> Unit, modifier: Modifier = Modifier) {
    val parchment = Color(0xFFF3E7CB)
    val ink = Color(0xFF3A2515)
    Column(
        verticalArrangement = Arrangement.spacedBy(6.dp),
        modifier = modifier
            .fillMaxWidth()
            .shadow(10.dp, RoundedCornerShape(12.dp))
            .background(parchment, RoundedCornerShape(12.dp))
            .border(2.dp, GoldBevelDark, RoundedCornerShape(12.dp))
            .padding(10.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Text(
                text = stringResource(R.string.talk_say_something).uppercase(),
                style = MaterialTheme.typography.labelMedium.copy(letterSpacing = 1.5.sp),
                color = ink.copy(alpha = 0.7f),
                modifier = Modifier.weight(1f)
            )
            Text(
                text = stringResource(R.string.talk_close),
                style = MaterialTheme.typography.labelLarge,
                color = Color(0xFF8A1F2B),
                modifier = Modifier.clickable(onClick = onClose).padding(4.dp)
            )
        }
        if (control.phrasesAllowed) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                for (id in 0 until TableTalk.PHRASE_COUNT) {
                    Chip(text = phraseText(id), enabled = control.canSend, ink = ink) { control.onSay(id); onClose() }
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally), modifier = Modifier.fillMaxWidth()) {
            TableTalk.EMOJI.forEachIndexed { i, glyph ->
                val id = TableTalk.EMOJI_BASE + i
                val label = emojiLabel(id)
                Text(
                    text = glyph,
                    fontSize = 22.sp,
                    modifier = Modifier
                        .background(Color(0xFFFFF8E6), RoundedCornerShape(8.dp))
                        .border(1.dp, Color(0xFFE3CF9A), RoundedCornerShape(8.dp))
                        .clickable(enabled = control.canSend) { control.onSay(id); onClose() }
                        .padding(horizontal = 5.dp, vertical = 2.dp)
                        .semantics { contentDescription = label }
                )
            }
        }
        if (!control.canSend) {
            Text(stringResource(R.string.talk_slow_down), style = MaterialTheme.typography.labelMedium, color = ink.copy(alpha = 0.7f))
        }
        // Mute: the other people at the table (computer players never speak, but the list is by seat).
        val others = control.seatNames.indices.filter { it != control.viewSeat }
        if (others.isNotEmpty()) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 2.dp)) {
                Text(stringResource(R.string.talk_mute), style = MaterialTheme.typography.labelMedium, color = ink.copy(alpha = 0.7f), modifier = Modifier.align(Alignment.CenterVertically))
                others.forEach { seat ->
                    val muted = seat in control.mutedSeats
                    Chip(text = (if (muted) "🔇 " else "") + control.seatNames[seat], enabled = true, ink = ink, filled = muted) { control.onToggleMute(seat) }
                }
            }
        }
    }
}

@Composable
private fun Chip(text: String, enabled: Boolean, ink: Color, filled: Boolean = false, onClick: () -> Unit) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelLarge,
        color = if (filled) Color(0xFFFFF8E6) else ink.copy(alpha = if (enabled) 1f else 0.4f),
        modifier = Modifier
            .background(if (filled) ink else Color(0xFFFFF8E6), RoundedCornerShape(999.dp))
            .border(1.dp, GoldBevelDark, RoundedCornerShape(999.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 5.dp)
    )
}

/**
 * The messages on show, each a small parchment plaque beside the nameplate of the seat that sent it
 * (a watcher's message sits at the top with their name). Drawn over the table; never over the trick.
 */
@Composable
fun BoxScope.TalkPlaques(control: TalkControl) {
    if (control.layout == TalkLayout.BOARD) return
    val n = control.seatNames.size.coerceAtLeast(1)
    fun relative(seat: Int) = ((seat - control.viewSeat) % n + n) % n
    // Each message goes to a corner of the table that its sender's nameplate is nearest to, and that the
    // trick, the status lines and your hand never use.
    val groups = control.messages.groupBy { m ->
        when {
            m.seat == TableMessage.WATCHER -> Alignment.TopStart
            relative(m.seat) == 0 -> Alignment.BottomEnd
            control.layout == TalkLayout.ROW -> Alignment.TopCenter
            relative(m.seat) == 1 -> Alignment.CenterEnd
            relative(m.seat) == 2 -> Alignment.TopEnd
            else -> Alignment.CenterStart
        }
    }
    groups.forEach { (align, list) ->
        Column(
            verticalArrangement = Arrangement.spacedBy(4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .align(align)
                .padding(
                    top = when (align) { Alignment.TopCenter -> 72.dp; Alignment.TopStart, Alignment.TopEnd -> 118.dp; else -> 0.dp },
                    bottom = if (align == Alignment.BottomEnd) 228.dp else 0.dp,
                    start = if (align == Alignment.CenterStart || align == Alignment.TopStart) 6.dp else 0.dp,
                    end = if (align == Alignment.CenterEnd || align == Alignment.TopEnd || align == Alignment.BottomEnd) 6.dp else 0.dp
                )
                .padding(vertical = if (align == Alignment.CenterStart || align == Alignment.CenterEnd) 60.dp else 0.dp)
        ) {
            list.takeLast(2).forEach { m -> TalkPlaque(m, control) }
        }
    }
}

@Composable
private fun TalkPlaque(message: TableMessage, control: TalkControl) {
    val name = if (message.seat == TableMessage.WATCHER) message.name else control.seatNames.getOrNull(message.seat).orEmpty()
    TalkBubble(name = name, id = message.id)
}

/** One parchment bubble: the speaker's name over a phrase or an emoji. The board games place it themselves. */
@Composable
fun TalkBubble(name: String, id: Int, modifier: Modifier = Modifier) {
    val message = TableMessage(0, id, name, 0L)
    val body = messageText(message.id)
    val spoken = if (TableTalk.isEmoji(message.id)) emojiLabel(message.id) else body
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
            .widthIn(max = 118.dp)
            .antiquePlaque(active = false, cornerRadius = 9.dp)
            .background(Brush.verticalGradient(listOf(Color(0xFFFFF4D6), Color(0xFFF0DFB8))), RoundedCornerShape(9.dp))
            .border(1.5.dp, GoldBevelDark, RoundedCornerShape(9.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp)
            .semantics { contentDescription = "$name: $spoken" }
    ) {
        if (name.isNotEmpty()) {
            Text(name, style = MaterialTheme.typography.labelSmall, color = Color(0xFF6B4A1A), maxLines = 1)
        }
        Text(
            text = body,
            style = if (TableTalk.isEmoji(message.id)) MaterialTheme.typography.headlineSmall else MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
            color = Color(0xFF3A2515),
            textAlign = TextAlign.Center,
            maxLines = 2
        )
    }
}

/** The frame's talk control for this table, or null on a solo table (nobody to talk to). */
fun <S, A> com.rangepatte.app.net.GameSession<S, A>.talkControl(layout: TalkLayout): TalkControl? =
    if (isSolo) null else TalkControl(
        messages = messages,
        seatNames = seatNames,
        viewSeat = viewSeat,
        layout = layout,
        canSend = canTalk,
        phrasesAllowed = !isSpectator,
        mutedSeats = mutedSeats,
        onSay = ::say,
        onToggleMute = ::toggleMute
    )
