package com.rangepatte.app.ui.settings

import androidx.lifecycle.ViewModel
import com.rangepatte.app.audio.GameAudio
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class SettingsUiState(
    val animationsEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true
)

/**
 * Holds the gameplay options in memory for now. Sound and music are not here any more: they live in
 * [GameAudio], which remembers them between launches and is what actually plays.
 */
class SettingsViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(SettingsUiState(animationsEnabled = com.rangepatte.app.ui.motion.MotionPrefs.animations.value))
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    /** Off = reduced motion in the games (the die settles at once, tokens jump); remembered between launches. */
    fun toggleAnimations(enabled: Boolean) {
        com.rangepatte.app.ui.motion.MotionPrefs.setAnimations(enabled)
        _uiState.update { it.copy(animationsEnabled = enabled) }
    }

    fun toggleVibration(enabled: Boolean) = _uiState.update { it.copy(vibrationEnabled = enabled) }

    fun restoreDefaults() {
        GameAudio.restoreDefaults()
        com.rangepatte.app.ui.motion.MotionPrefs.setAnimations(true)
        _uiState.value = SettingsUiState()
    }
}
