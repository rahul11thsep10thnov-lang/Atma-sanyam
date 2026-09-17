package com.rangepatte.app.ui.settings

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class SettingsUiState(
    val soundEnabled: Boolean = false,
    val musicEnabled: Boolean = false,
    val animationsEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true
)

/**
 * Holds settings only in memory for now — isolated behind [uiState]/[toggle...] so swapping this
 * for a DataStore-backed repository in Phase 18 touches only this class, not [SettingsScreen].
 */
class SettingsViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    fun toggleSound(enabled: Boolean) {
        _uiState.value = _uiState.value.copy(soundEnabled = enabled)
    }

    fun toggleMusic(enabled: Boolean) {
        _uiState.value = _uiState.value.copy(musicEnabled = enabled)
    }

    fun toggleAnimations(enabled: Boolean) {
        _uiState.value = _uiState.value.copy(animationsEnabled = enabled)
    }

    fun toggleVibration(enabled: Boolean) {
        _uiState.value = _uiState.value.copy(vibrationEnabled = enabled)
    }
}
