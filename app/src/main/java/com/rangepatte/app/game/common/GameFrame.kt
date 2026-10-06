package com.rangepatte.app.game.common

import androidx.activity.compose.BackHandler
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.GameHeader
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
    background: BackgroundType = BackgroundType.VILLAGE_CHAUPAL,
    content: @Composable ColumnScope.() -> Unit
) {
    var showRules by remember { mutableStateOf(false) }
    BackHandler(onBack = onBackClick)

    CompositionLocalProvider(LocalCardTextMeasurer provides rememberTextMeasurer(cacheSize = 256)) {
        WatermarkBackground(backgroundType = background, modifier = modifier) {
            Column(modifier = Modifier.fillMaxSize()) {
                GameHeader(
                    title = stringResource(game.nameRes),
                    onBackClick = onBackClick,
                    onRulesClick = { showRules = true }
                )
                Column(modifier = Modifier.weight(1f).fillMaxWidth(), content = content)
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

/** A short status line shown above the playing area (whose turn it is, what to do next, scores). */
@Composable
fun StatusLine(text: String, modifier: Modifier = Modifier, highlight: Boolean = false, compact: Boolean = false) {
    Text(
        text = text,
        style = if (compact) MaterialTheme.typography.labelLarge else MaterialTheme.typography.bodyMedium,
        color = if (highlight) GoldenGlow else GoldBevelLight,
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

/** The Undo button for a solo table; null (no button) when other people are playing. */
fun <S, A> com.rangepatte.app.net.GameSession<S, A>.undoControl(): UndoControl? =
    if (isSolo) UndoControl(usesLeft = undoUsesLeft, enabled = canUndo, onUndo = ::undo) else null
