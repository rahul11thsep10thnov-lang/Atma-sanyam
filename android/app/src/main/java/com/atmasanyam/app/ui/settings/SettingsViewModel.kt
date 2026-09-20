package com.atmasanyam.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.atmasanyam.app.data.repository.CatalogRepository
import com.atmasanyam.app.data.repository.PreferencesRepository
import com.atmasanyam.app.domain.model.Category
import com.atmasanyam.app.domain.model.Language
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val languages: List<Language> = emptyList(),
    val currentLanguageCode: String = "en",
    val categories: List<Category> = emptyList(),
    val selectedCategories: Set<String> = emptySet(),
    val notificationsEnabled: Boolean = true,
    val isLoading: Boolean = true,
)

/** Language switch (spec §7) + interest-based personalization (spec §22) + notification opt-in (spec §31). */
@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val catalogRepository: CatalogRepository,
    private val preferencesRepository: PreferencesRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val languages = runCatching { catalogRepository.getLanguages() }.getOrDefault(emptyList())
            val categories = runCatching { catalogRepository.getCategories() }.getOrDefault(emptyList())
            val currentLanguage = preferencesRepository.languageCode.first() ?: "en"
            val notificationsEnabled = preferencesRepository.notificationsEnabled.first()
            val remotePrefs = runCatching { preferencesRepository.getRemotePreferences() }.getOrNull()

            _uiState.value = SettingsUiState(
                languages = languages,
                currentLanguageCode = currentLanguage,
                categories = categories,
                selectedCategories = remotePrefs?.categories?.toSet() ?: emptySet(),
                notificationsEnabled = notificationsEnabled,
                isLoading = false,
            )
        }
    }

    fun selectLanguage(code: String) {
        viewModelScope.launch {
            preferencesRepository.setLanguage(code)
            _uiState.value = _uiState.value.copy(currentLanguageCode = code)
        }
    }

    fun toggleCategory(key: String) {
        val current = _uiState.value.selectedCategories
        val updated = if (current.contains(key)) current - key else current + key
        _uiState.value = _uiState.value.copy(selectedCategories = updated)
        persistPreferences()
    }

    fun setNotificationsEnabled(enabled: Boolean) {
        _uiState.value = _uiState.value.copy(notificationsEnabled = enabled)
        persistPreferences()
    }

    private fun persistPreferences() {
        viewModelScope.launch {
            runCatching {
                preferencesRepository.updateRemotePreferences(
                    categories = _uiState.value.selectedCategories.toList(),
                    states = emptyList(),
                    notificationsEnabled = _uiState.value.notificationsEnabled,
                )
            }
        }
    }
}
