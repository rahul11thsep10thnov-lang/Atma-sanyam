package com.rangepatte.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.VolumeOff
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.ui.components.royal.GoldRule
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.PanelWoodMid
import com.rangepatte.app.ui.theme.RoyalTitleStyle

/** Top bar used on game screens: dark wood strip, gold back arrow, small-caps title, optional rules action. */
@Composable
fun GameHeader(
    title: String,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier,
    onRulesClick: (() -> Unit)? = null,
    /** When given, a speaker button opens the audio panel; [audioSilent] shows the muted icon. */
    onAudioClick: (() -> Unit)? = null,
    audioSilent: Boolean = false,
    /** A slimmer strip, for a table held sideways where height is scarce. */
    compact: Boolean = false
) {
    val button = if (compact) Modifier.size(36.dp) else Modifier
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Brush.verticalGradient(listOf(PanelWoodMid, PanelWoodDark)))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = if (compact) 0.dp else 2.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBackClick, modifier = button) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = stringResource(R.string.content_desc_back),
                    tint = GoldBevelLight
                )
            }
            Text(
                text = title.uppercase(),
                style = RoyalTitleStyle,
                color = GoldBevelLight,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            if (onAudioClick != null) {
                IconButton(onClick = onAudioClick, modifier = button) {
                    Icon(
                        imageVector = if (audioSilent) Icons.Filled.VolumeOff else Icons.Filled.VolumeUp,
                        contentDescription = stringResource(R.string.audio_open),
                        tint = GoldBevelLight
                    )
                }
            }
            if (onRulesClick != null) {
                IconButton(onClick = onRulesClick, modifier = button) {
                    Icon(
                        imageVector = Icons.Filled.Info,
                        contentDescription = stringResource(R.string.action_rules),
                        tint = GoldBevelLight
                    )
                }
            } else {
                // Keeps the title optically centred when there is no trailing action.
                Spacer(modifier = Modifier.size(if (compact) 36.dp else 48.dp))
            }
        }
        GoldRule()
    }
}
