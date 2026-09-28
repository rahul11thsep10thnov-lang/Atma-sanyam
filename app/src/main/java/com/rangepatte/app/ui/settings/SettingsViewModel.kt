package com.rangepatte.app.ui.settings

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class SettingsUiState(
    val soundEnabled: Boolean = false,
    val soundVolume: Float = 0.8f,
    val musicEnabled: Boolean = false,
    val musicVolume: Float = 0.6f,
    val animationsEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true
)

/**
 * Holds settings only in memory for now — isolated behind [uiState] so swapping this for a
 * DataStore-backed repository in Phase 18 touches only this class, not [SettingsScreen]. There
 * are no audio assets in the app yet, so the sound/music values are stored but nothing plays.
 */
class SettingsViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    fun toggleSound(enabled: Boolean) = _uiState.update { it.copy(soundEnabled = enabled) }

    fun setSoundVolume(volume: Float) = _uiState.update { it.copy(soundVolume = volume) }

    fun toggleMusic(enabled: Boolean) = _uiState.update { it.copy(musicEnabled = enabled) }

    fun setMusicVolume(volume: Float) = _uiState.update { it.copy(musicVolume = volume) }

    fun toggleAnimations(enabled: Boolean) = _uiState.update { it.copy(animationsEnabled = enabled) }

    fun toggleVibration(enabled: Boolean) = _uiState.update { it.copy(vibrationEnabled = enabled) }

    fun restoreDefaults() {
        _uiState.value = SettingsUiState()
    }
}
