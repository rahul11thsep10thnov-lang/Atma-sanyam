package com.rangepatte.app.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rangepatte.app.R
import com.rangepatte.app.ui.background.BackgroundType
import com.rangepatte.app.ui.components.SettingsRow
import com.rangepatte.app.ui.components.WatermarkBackground

@Composable
fun SettingsScreen(
    modifier: Modifier = Modifier,
    viewModel: SettingsViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    WatermarkBackground(backgroundType = BackgroundType.CLASSICAL_LIVING_ROOM, modifier = modifier) {
        LazyColumn(
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            item {
                Text(
                    text = stringResource(R.string.nav_settings),
                    style = MaterialTheme.typography.headlineLarge,
                    color = MaterialTheme.colorScheme.onBackground
                )
            }
            item {
                Column(modifier = Modifier.fillMaxWidth()) {
                    SettingsRow(
                        title = stringResource(R.string.settings_sound),
                        checked = uiState.soundEnabled,
                        onCheckedChange = viewModel::toggleSound
                    )
                    HorizontalDivider()
                    SettingsRow(
                        title = stringResource(R.string.settings_music),
                        checked = uiState.musicEnabled,
                        onCheckedChange = viewModel::toggleMusic
                    )
                    HorizontalDivider()
                    SettingsRow(
                        title = stringResource(R.string.settings_animations),
                        checked = uiState.animationsEnabled,
                        onCheckedChange = viewModel::toggleAnimations
                    )
                    HorizontalDivider()
                    SettingsRow(
                        title = stringResource(R.string.settings_vibration),
                        checked = uiState.vibrationEnabled,
                        onCheckedChange = viewModel::toggleVibration
                    )
                    HorizontalDivider()
                    SettingsRow(title = stringResource(R.string.settings_about))
                    HorizontalDivider()
                    SettingsRow(title = stringResource(R.string.settings_reset_data))
                }
            }
        }
    }
}
