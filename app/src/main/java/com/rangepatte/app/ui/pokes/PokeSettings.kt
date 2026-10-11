package com.rangepatte.app.ui.pokes

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rangepatte.app.R
import com.rangepatte.app.domain.pokes.PokeAudience
import com.rangepatte.app.domain.pokes.PokePrefs
import com.rangepatte.app.ui.components.royal.RoyalOptionRow
import com.rangepatte.app.ui.components.royal.RoyalOrbToggle
import com.rangepatte.app.ui.theme.ButtonCrimsonBottom
import com.rangepatte.app.ui.theme.ButtonCrimsonTop
import com.rangepatte.app.ui.theme.GoldBevelDark
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.PanelWoodDark
import com.rangepatte.app.ui.theme.ParchmentText
import com.rangepatte.app.ui.theme.ParchmentTextDim
import com.rangepatte.app.ui.theme.RoyalLabelStyle

/** Stateless: the five controls and the muted list. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PokeSettingsPanel(prefs: PokePrefs, nameOf: (String) -> String, onChange: ((PokePrefs) -> PokePrefs) -> Unit, onUnmute: (String) -> Unit) {
    RoyalOptionRow(label = stringResource(R.string.poke_pref_receive)) {
        RoyalOrbToggle(checked = prefs.receive, onCheckedChange = { on -> onChange { it.copy(receive = on) } })
    }
    RoyalOptionRow(label = stringResource(R.string.poke_pref_sound)) {
        RoyalOrbToggle(checked = prefs.sound, enabled = prefs.receive, onCheckedChange = { on -> onChange { it.copy(sound = on) } })
    }
    RoyalOptionRow(label = stringResource(R.string.poke_pref_vibration)) {
        RoyalOrbToggle(checked = prefs.vibration, enabled = prefs.receive, onCheckedChange = { on -> onChange { it.copy(vibration = on) } })
    }
    Text(
        text = stringResource(R.string.poke_pref_audience),
        style = RoyalLabelStyle,
        color = ParchmentTextDim,
        modifier = Modifier.padding(top = 10.dp, bottom = 6.dp)
    )
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, GoldBevelDark, RoundedCornerShape(6.dp))
            .padding(2.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        PokeAudience.values().forEach { option ->
            val selected = prefs.audience == option
            Text(
                text = stringResource(
                    when (option) { PokeAudience.ALL_FRIENDS -> R.string.poke_audience_all; PokeAudience.FAVOURITES -> R.string.poke_audience_favourites; PokeAudience.NOBODY -> R.string.poke_audience_nobody }
                ),
                style = RoyalLabelStyle,
                color = if (selected) ParchmentText else ParchmentTextDim,
                textAlign = TextAlign.Center,
                maxLines = 1,
                modifier = Modifier
                    .weight(1f)
                    .background(if (selected) Brush.verticalGradient(listOf(ButtonCrimsonTop, ButtonCrimsonBottom)) else Brush.verticalGradient(listOf(PanelWoodDark, PanelWoodDark)), RoundedCornerShape(4.dp))
                    .clickable(enabled = prefs.receive) { onChange { it.copy(audience = option) } }
                    .padding(vertical = 7.dp, horizontal = 4.dp)
            )
        }
    }
    Text(
        text = stringResource(R.string.poke_pref_muted),
        style = RoyalLabelStyle,
        color = ParchmentTextDim,
        modifier = Modifier.padding(top = 12.dp, bottom = 6.dp)
    )
    if (prefs.muted.isEmpty()) {
        Text(stringResource(R.string.poke_pref_muted_none), style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim)
    } else {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            prefs.muted.forEach { uid ->
                val unmute = stringResource(R.string.poke_pref_unmute)
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .background(PanelWoodDark, RoundedCornerShape(999.dp))
                        .border(1.dp, GoldBevelDark, RoundedCornerShape(999.dp))
                        .clickable { onUnmute(uid) }
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Text("🔇 " + nameOf(uid), style = MaterialTheme.typography.labelLarge, color = ParchmentText)
                    Text("  ×", style = MaterialTheme.typography.labelLarge, color = GoldBevelLight)
                }
            }
        }
    }
    Column(modifier = Modifier.padding(top = 6.dp)) {
        Text(stringResource(R.string.poke_pref_note), style = MaterialTheme.typography.bodySmall, color = ParchmentTextDim)
    }
}
