package com.rangepatte.app.game.common

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.rangepatte.app.R
import com.rangepatte.app.audio.GameAudio
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.ui.audio.AudioControlPanel
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.AntiqueWoodTable
import com.rangepatte.app.ui.components.GameHeader
import com.rangepatte.app.ui.components.TurnIndicator
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.rules.RulesDialog
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.GoldenGlow
import com.rangepatte.app.ui.theme.ParchmentText

/** What the Undo button needs: how many undos remain, whether one can happen right now, and what to do. */
class UndoControl(val usesLeft: Int, val enabled: Boolean, val onUndo: () -> Unit)

/**
 * What a watcher's table shows (Element 10, Design 1): a gold "Watching" pill over the table and a
 * ribbon under it that promises a seat — or says plainly that every seat is taken.
 */
class WatchingInfo(
    /** A computer seat is free: "you'll take a seat when this round ends". */
    val seatPromised: Boolean,
    /** Tricks (or turns) left in the round, for the ribbon, or null when the game has no such count. */
    val stepsLeft: Int?,
    val onLeave: () -> Unit
)

/**
 * The page every game is played on: dark scene, header with back arrow and a Rules button (opens the
 * rules scroll), the game's own [content], and — when [undo] is given — the Undo button at the bottom.
 * System Back goes through [onBackClick] too, so leaving a table always takes the same path.
 */
@Composable
fun GameFrame(
    game: GameInfo,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier,
    undo: UndoControl? = null,
    watching: WatchingInfo? = null,
    /** Table talk (Element 11): the speech button, tray and plaques; null on a solo table. */
    talk: TalkControl? = null,
    background: BackgroundType = BackgroundType.VILLAGE_CHAUPAL,
    content: @Composable ColumnScope.() -> Unit
) {
    var showRules by remember { mutableStateOf(false) }
    var showAudio by remember { mutableStateOf(false) }
    var showTalk by remember { mutableStateOf(false) }
    val audio by GameAudio.settings.collectAsState()
    BackHandler(onBack = onBackClick)

    CompositionLocalProvider(LocalCardTextMeasurer provides rememberTextMeasurer(cacheSize = 256)) {
        WatermarkBackground(backgroundType = background, modifier = modifier) {
            Column(modifier = Modifier.fillMaxSize()) {
                GameHeader(
                    title = stringResource(game.nameRes),
                    onBackClick = onBackClick,
                    onRulesClick = { showRules = true },
                    onAudioClick = { showAudio = !showAudio },
                    audioSilent = audio.effectiveGameSoundVolume <= 0f && audio.effectiveMusicVolume <= 0f
                )
                // The whole play area is one antique table: plaques, piles, hands and the Undo
                // button all sit on the same waxed wood.
                Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                    AntiqueWoodTable(modifier = Modifier.fillMaxSize()) {
                        Column(modifier = Modifier.fillMaxSize()) {
                            BoxWithConstraints(modifier = Modifier.weight(1f).fillMaxWidth()) {
                                // Games size their hands to the room the table really has.
                                CompositionLocalProvider(LocalTableArea provides TableArea(maxWidth - 8.dp, maxHeight)) {
                                    // A watcher's table starts below the "Watching" pill so no status line hides behind it.
                                    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 4.dp, vertical = 0.dp).padding(top = if (watching != null) 40.dp else 0.dp), content = content)
                                }
                            }
                            if (undo != null) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    RoyalButton(
                                        text = "${stringResource(R.string.action_undo)} (${undo.usesLeft})",
                                        onClick = undo.onUndo,
                                        enabled = undo.enabled && undo.usesLeft > 0,
                                        style = RoyalButtonStyle.STEEL
                                    )
                                }
                            }
                            if (watching != null) WatchingRibbon(watching)
                        }
                    }
                    if (watching != null) {
                        Box(modifier = Modifier.align(Alignment.TopCenter).padding(top = 6.dp)) {
                            TurnIndicator(text = stringResource(R.string.spectate_watching))
                        }
                    }
                    if (talk != null) {
                        // Messages beside the sender's nameplate, the speech button in the top-left corner of the
                        // table, and the parchment tray over the hand area while it is open.
                        TalkPlaques(talk)
                        TalkButton(onClick = { showTalk = !showTalk }, modifier = Modifier.align(Alignment.TopStart).padding(start = 8.dp, top = 8.dp))
                        if (showTalk) {
                            TalkTray(talk, onClose = { showTalk = false }, modifier = Modifier.align(Alignment.BottomCenter).padding(8.dp))
                        }
                    }
                    // The audio panel floats over the top-right corner of the table, under the speaker button.
                    // Closing it only hides it: the audio settings and the music are not affected.
                    if (showAudio) {
                        AudioControlPanel(
                            onHide = { showAudio = false },
                            modifier = Modifier.align(Alignment.TopEnd).padding(top = 6.dp, end = 6.dp, start = 6.dp)
                        )
                    }
                }
            }
        }
    }

    if (showRules) RulesDialog(game = game, onDismiss = { showRules = false })
}

/** A modal panel for "you won / round over" and similar moments; stays up until a button is pressed. */
@Composable
fun GameResultDialog(
    title: String,
    lines: List<String>,
    primaryText: String?,
    onPrimary: () -> Unit,
    secondaryText: String? = null,
    onSecondary: (() -> Unit)? = null,
    extra: @Composable ColumnScope.() -> Unit = {}
) {
    Dialog(
        onDismissRequest = {},
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
    ) {
        RoyalPanel(title = title, modifier = Modifier.fillMaxWidth()) {
            lines.forEach { line ->
                Text(
                    text = line,
                    style = MaterialTheme.typography.bodyLarge,
                    color = ParchmentText,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp)
                )
            }
            extra()
            if (primaryText != null) {
                RoyalButton(
                    text = primaryText,
                    onClick = onPrimary,
                    modifier = Modifier.fillMaxWidth().padding(top = 16.dp)
                )
            } else {
                // Only the host starts the next round: everyone else waits.
                Text(
                    text = stringResource(R.string.game_waiting_for_host),
                    style = MaterialTheme.typography.bodyLarge,
                    color = GoldenGlow,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(top = 16.dp)
                )
            }
            if (secondaryText != null && onSecondary != null) {
                RoyalButton(
                    text = secondaryText,
                    onClick = onSecondary,
                    style = RoyalButtonStyle.STEEL,
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                )
            }
        }
    }
}

private const val BADGE_MAX_CHARS = 22

/** The ribbon under a watcher's table: the promise of a seat (with the tricks left) and a Leave button. */
@Composable
private fun WatchingRibbon(info: WatchingInfo) {
    val promise = if (info.seatPromised) stringResource(R.string.spectate_seat_next_round) else stringResource(R.string.spectate_table_full)
    val left = info.stepsLeft?.takeIf { info.seatPromised && it > 0 }?.let { stringResource(R.string.spectate_tricks_left_format, it) }
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(
            text = if (left != null) "$promise · $left" else promise,
            style = MaterialTheme.typography.bodyMedium.copy(shadow = Shadow(Color.Black.copy(alpha = 0.7f), Offset(1f, 1.5f), 3f)),
            color = if (info.seatPromised) GoldBevelLight else ParchmentText,
            modifier = Modifier.weight(1f),
            maxLines = 2
        )
        RoyalButton(text = stringResource(R.string.spectate_leave), onClick = info.onLeave, style = RoyalButtonStyle.STEEL, compact = true)
    }
}

/**
 * A short status line shown above the playing area (what to do next, scores, trump). When it is the
 * player's own turn ([highlight]) it becomes the gold "Your turn" badge instead of plain text.
 */
@Composable
fun StatusLine(text: String, modifier: Modifier = Modifier, highlight: Boolean = false, compact: Boolean = false) {
    if (text.isBlank()) return
    // Short lines ("Your turn") become the gold badge; a longer hint stays plain text, just brighter.
    if (highlight && text.length <= BADGE_MAX_CHARS) {
        Box(modifier = modifier.fillMaxWidth().padding(vertical = if (compact) 3.dp else 5.dp), contentAlignment = Alignment.Center) {
            TurnIndicator(text = text)
        }
        return
    }
    Text(
        text = text,
        style = (if (compact) MaterialTheme.typography.labelLarge else MaterialTheme.typography.bodyMedium)
            .copy(shadow = Shadow(Color.Black.copy(alpha = 0.7f), Offset(1f, 1.5f), 3f)),
        color = if (highlight) GoldenGlow else ParchmentText,
        textAlign = TextAlign.Center,
        modifier = modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = if (compact) 1.dp else 4.dp),
        maxLines = 2
    )
}

/** Shown on every table when the host left or the connection broke: nothing more can be played. */
@Composable
fun ConnectionLostDialog(onBack: () -> Unit) {
    GameResultDialog(
        title = stringResource(R.string.net_connection_lost),
        lines = listOf(stringResource(R.string.net_connection_lost_hint)),
        primaryText = stringResource(R.string.game_back_to_khel),
        onPrimary = onBack
    )
}

/** The watcher's pill and ribbon; null when this phone has a seat. */
fun <S, A> com.rangepatte.app.net.GameSession<S, A>.watchingInfo(onLeave: () -> Unit): WatchingInfo? =
    if (isSpectator) WatchingInfo(seatPromised = seatPromised, stepsLeft = stepsLeftInRound, onLeave = onLeave) else null

/** Shown once when a watcher is given a seat: "You're in!". */
@Composable
fun <S, A> SeatedNotice(session: com.rangepatte.app.net.GameSession<S, A>) {
    if (!session.justSeated) return
    GameResultDialog(
        title = stringResource(R.string.spectate_seated_title),
        lines = listOf(stringResource(R.string.spectate_seated)),
        primaryText = stringResource(R.string.spectate_ok),
        onPrimary = session::acknowledgeSeated
    )
}

/** The Undo button for a solo table; null (no button) when other people are playing. */
fun <S, A> com.rangepatte.app.net.GameSession<S, A>.undoControl(): UndoControl? =
    if (isSolo) UndoControl(usesLeft = undoUsesLeft, enabled = canUndo, onUndo = ::undo) else null
