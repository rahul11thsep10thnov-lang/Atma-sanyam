package com.atmasanyam.app.ui.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.atmasanyam.app.data.repository.AuthRepository
import com.atmasanyam.app.data.repository.CatalogRepository
import com.atmasanyam.app.data.repository.PreferencesRepository
import com.atmasanyam.app.domain.model.Language
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LanguageSelectionUiState(
    val languages: List<Language> = emptyList(),
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val error: String? = null,
    val completed: Boolean = false,
)

@HiltViewModel
class LanguageSelectionViewModel @Inject constructor(
    private val catalogRepository: CatalogRepository,
    private val preferencesRepository: PreferencesRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LanguageSelectionUiState())
    val uiState: StateFlow<LanguageSelectionUiState> = _uiState.asStateFlow()

    init {
        loadLanguages()
    }

    private fun loadLanguages() {
        viewModelScope.launch {
            runCatching { catalogRepository.getLanguages() }
                .onSuccess { languages -> _uiState.value = _uiState.value.copy(languages = languages, isLoading = false) }
                .onFailure { err -> _uiState.value = _uiState.value.copy(isLoading = false, error = err.message) }
        }
    }

    fun selectLanguage(language: Language) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            runCatching {
                preferencesRepository.setLanguage(language.code)
                authRepository.ensureAuthenticated(language.code)
                preferencesRepository.completeOnboarding()
            }
                .onSuccess { _uiState.value = _uiState.value.copy(isSaving = false, completed = true) }
                .onFailure { err -> _uiState.value = _uiState.value.copy(isSaving = false, error = err.message) }
        }
    }
}
