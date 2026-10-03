package com.rangepatte.app.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rangepatte.app.R
import com.rangepatte.app.domain.model.AppLanguage
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.WatermarkBackground
import com.rangepatte.app.ui.components.royal.RoyalButton
import com.rangepatte.app.ui.components.royal.RoyalButtonStyle
import com.rangepatte.app.ui.components.royal.RoyalOptionRow
import com.rangepatte.app.ui.components.royal.RoyalOrbToggle
import com.rangepatte.app.ui.components.royal.RoyalPanel
import com.rangepatte.app.ui.components.royal.RoyalSectionTitle
import com.rangepatte.app.ui.components.royal.RoyalSlider
import com.rangepatte.app.ui.theme.GoldBevelLight
import com.rangepatte.app.ui.theme.RoyalLabelStyle

/** Options screen in the classic strategy-game style: sectioned rows, orb toggles, gold sliders. */
@Composable
fun SettingsScreen(
    currentLanguage: AppLanguage,
    onChangeLanguageClick: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SettingsViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val volumeLabel = stringResource(R.string.settings_volume)

    WatermarkBackground(backgroundType = BackgroundType.CLASSICAL_LIVING_ROOM, modifier = modifier) {
        LazyColumn(contentPadding = PaddingValues(16.dp)) {
            item {
                RoyalPanel(title = stringResource(R.string.nav_settings), modifier = Modifier.fillMaxWidth()) {
                    RoyalSectionTitle(stringResource(R.string.settings_section_audio))
                    RoyalOptionRow(label = stringResource(R.string.settings_sound)) {
                        RoyalOrbToggle(checked = uiState.soundEnabled, onCheckedChange = viewModel::toggleSound)
                    }
                    RoyalOptionRow(label = volumeLabel, enabled = uiState.soundEnabled) {
                        RoyalSlider(
                            value = uiState.soundVolume,
                            onValueChange = viewModel::setSoundVolume,
                            enabled = uiState.soundEnabled,
                            modifier = Modifier.width(150.dp)
                        )
                    }
                    RoyalOptionRow(label = stringResource(R.string.settings_music)) {
                        RoyalOrbToggle(checked = uiState.musicEnabled, onCheckedChange = viewModel::toggleMusic)
                    }
                    RoyalOptionRow(label = volumeLabel, enabled = uiState.musicEnabled) {
                        RoyalSlider(
                            value = uiState.musicVolume,
                            onValueChange = viewModel::setMusicVolume,
                            enabled = uiState.musicEnabled,
                            modifier = Modifier.width(150.dp)
                        )
                    }

                    RoyalSectionTitle(stringResource(R.string.settings_section_gameplay))
                    RoyalOptionRow(label = stringResource(R.string.settings_animations)) {
                        RoyalOrbToggle(checked = uiState.animationsEnabled, onCheckedChange = viewModel::toggleAnimations)
                    }
                    RoyalOptionRow(label = stringResource(R.string.settings_vibration)) {
                        RoyalOrbToggle(checked = uiState.vibrationEnabled, onCheckedChange = viewModel::toggleVibration)
                    }

                    RoyalSectionTitle(stringResource(R.string.settings_section_general))
                    RoyalOptionRow(label = stringResource(R.string.settings_language), onClick = onChangeLanguageClick) {
                        Text(text = currentLanguage.nativeName, style = RoyalLabelStyle, color = GoldBevelLight)
                    }
                    RoyalOptionRow(label = stringResource(R.string.settings_about))
                    RoyalOptionRow(label = stringResource(R.string.settings_reset_data))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 18.dp),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        RoyalButton(
                            text = stringResource(R.string.settings_restore_defaults),
                            onClick = viewModel::restoreDefaults,
                            style = RoyalButtonStyle.STEEL
                        )
                    }
                }
            }
        }
    }
}
