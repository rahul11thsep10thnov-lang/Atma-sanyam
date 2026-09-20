package com.atmasanyam.app.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.atmasanyam.app.data.repository.PreferencesRepository
import com.atmasanyam.app.data.repository.SearchRepository
import com.atmasanyam.app.domain.model.VideoCard
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchUiState(
    val query: String = "",
    val results: List<VideoCard> = emptyList(),
    val isSearching: Boolean = false,
)

/** Search by person, city/district/state, category, date, relationship (spec §23). */
@HiltViewModel
class SearchViewModel @Inject constructor(
    private val searchRepository: SearchRepository,
    private val preferencesRepository: PreferencesRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    fun onQueryChanged(query: String) {
        _uiState.value = _uiState.value.copy(query = query)
    }

    fun search() {
        val query = _uiState.value.query
        if (query.isBlank()) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSearching = true)
            val languageCode = preferencesRepository.languageCode.first() ?: "en"
            runCatching { searchRepository.search(query, languageCode) }
                .onSuccess { results -> _uiState.value = _uiState.value.copy(results = results, isSearching = false) }
                .onFailure { _uiState.value = _uiState.value.copy(isSearching = false) }
        }
    }
}
