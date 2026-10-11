package com.rangepatte.app.ui.audio

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rangepatte.app.R
import com.rangepatte.app.audio.GameAudio
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalOptionRow
import com.rangepatte.app.ui.components.royal.RoyalOrbToggle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.components.royal.RoyalSlider
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim
import com.rangepatte.app.ui.theme.RoyalLabelStyle
import kotlin.math.roundToInt

/**
 * The compact audio panel opened from the speaker button in a game's header: master volume, card
 * sounds (switch + volume), background music (switch + volume), a credit line for the music, and a
 * button to hide it again. Everything it shows lives in [GameAudio], so hiding and re-opening the
 * panel changes nothing — music keeps playing and every value is exactly as it was.
 */
@Composable
fun AudioControlPanel(onHide: () -> Unit, modifier: Modifier = Modifier) {
    RoyalPanel(
        title = stringResource(R.string.audio_title),
        modifier = modifier.widthIn(max = 320.dp),
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
    ) {
        AudioControlsContent()
        Row(modifier = Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.Center) {
            RoyalButton(
                text = stringResource(R.string.audio_hide),
                onClick = onHide,
                style = RoyalButtonStyle.STEEL
            )
        }
    }
}

/** The controls themselves, without a container, so the Settings screen can show the same ones inline. */
@Composable
fun AudioControlsContent(modifier: Modifier = Modifier) {
    val settings by GameAudio.settings.collectAsState()
    val musicAvailable by GameAudio.musicAvailable.collectAsState()

    Column(modifier = modifier.fillMaxWidth()) {
        VolumeRow(
            label = stringResource(R.string.audio_master),
            value = settings.master,
            onChange = { value -> GameAudio.update { it.copy(master = value) } }
        )
        SwitchRow(
            label = stringResource(R.string.audio_game_sounds),
            checked = settings.gameSoundsOn,
            onChange = { on -> GameAudio.update { it.copy(gameSoundsOn = on) } }
        )
        VolumeRow(
            label = stringResource(R.string.audio_game_volume),
            value = settings.gameSoundVolume,
            enabled = settings.gameSoundsOn,
            onChange = { value -> GameAudio.update { it.copy(gameSoundVolume = value) } }
        )
        SwitchRow(
            label = stringResource(R.string.audio_music),
            checked = settings.musicOn,
            onChange = { on -> GameAudio.update { it.copy(musicOn = on) } }
        )
        VolumeRow(
            label = stringResource(R.string.audio_music_volume),
            value = settings.musicVolume,
            enabled = settings.musicOn,
            onChange = { value -> GameAudio.update { it.copy(musicVolume = value) } }
        )
        Text(
            text = stringResource(if (musicAvailable) R.string.audio_credit else R.string.audio_music_missing),
            style = MaterialTheme.typography.labelSmall,
            color = ParchmentTextDim,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
        )
    }
}

@Composable
private fun SwitchRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    RoyalOptionRow(label = label) {
        Text(
            text = stringResource(if (checked) R.string.audio_on else R.string.audio_off).uppercase(),
            style = RoyalLabelStyle.copy(fontSize = 13.sp),
            color = if (checked) GoldBevelLight else ParchmentTextDim,
            modifier = Modifier.padding(end = 6.dp)
        )
        RoyalOrbToggle(checked = checked, onCheckedChange = onChange)
    }
}

@Composable
private fun VolumeRow(label: String, value: Float, onChange: (Float) -> Unit, enabled: Boolean = true) {
    val percent = (value * 100).roundToInt()
    Column(modifier = Modifier.fillMaxWidth().padding(top = 2.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = if (enabled) ParchmentText else ParchmentTextDim,
                modifier = Modifier.weight(1f)
            )
            Text(
                text = "$percent%",
                style = MaterialTheme.typography.labelMedium,
                color = if (enabled) GoldBevelLight else ParchmentTextDim
            )
        }
        RoyalSlider(
            value = value,
            onValueChange = onChange,
            enabled = enabled,
            modifier = Modifier.fillMaxWidth().semantics { stateDescription = "$percent%" }
        )
    }
}
