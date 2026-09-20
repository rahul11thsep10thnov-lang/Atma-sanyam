package com.atmasanyam.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.atmasanyam.app.data.repository.CatalogRepository
import com.atmasanyam.app.data.repository.FeedRepository
import com.atmasanyam.app.data.repository.PreferencesRepository
import com.atmasanyam.app.domain.model.Category
import com.atmasanyam.app.domain.model.LocationFilter
import com.atmasanyam.app.domain.model.VideoCard
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val languageCode: String = "en",
    val categories: List<Category> = emptyList(),
    val selectedCategory: String? = null,
    val locationFilter: LocationFilter = LocationFilter(),
    val videos: List<VideoCard> = emptyList(),
    val nextCursor: String? = null,
    val isLoading: Boolean = true,
    val isLoadingMore: Boolean = false,
    val error: String? = null,
)

/** Family-news-first home feed (spec §18): category filter chips over a video-card feed. */
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val feedRepository: FeedRepository,
    private val catalogRepository: CatalogRepository,
    private val preferencesRepository: PreferencesRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val languageCode = preferencesRepository.languageCode.first() ?: "en"
            val categories = runCatching { catalogRepository.getCategories() }.getOrDefault(emptyList())
            val locationFilter = LocationFilter(
                state = preferencesRepository.selectedState.first(),
                district = preferencesRepository.selectedDistrict.first(),
            )
            _uiState.value = _uiState.value.copy(languageCode = languageCode, categories = categories, locationFilter = locationFilter)
            refreshFeed()
        }
    }

    fun selectCategory(categoryKey: String?) {
        _uiState.value = _uiState.value.copy(selectedCategory = categoryKey)
        refreshFeed()
    }

    /** Re-reads the persisted location filter (spec §20/§21) — called when Home resumes after the location picker. */
    fun refreshLocationFromPreferences() {
        viewModelScope.launch {
            val locationFilter = LocationFilter(
                state = preferencesRepository.selectedState.first(),
                district = preferencesRepository.selectedDistrict.first(),
            )
            if (locationFilter != _uiState.value.locationFilter) {
                _uiState.value = _uiState.value.copy(locationFilter = locationFilter)
                refreshFeed()
            }
        }
    }

    fun refreshFeed() {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.value = state.copy(isLoading = true, error = null)
            runCatching {
                feedRepository.loadFeed(
                    languageCode = state.languageCode,
                    category = state.selectedCategory,
                    state = state.locationFilter.state,
                    district = state.locationFilter.district,
                )
            }
                .onSuccess { page -> _uiState.value = _uiState.value.copy(videos = page.videos, nextCursor = page.nextCursor, isLoading = false) }
                .onFailure { err -> _uiState.value = _uiState.value.copy(isLoading = false, error = err.message) }
        }
    }

    fun loadMore() {
        val state = _uiState.value
        if (state.isLoadingMore || state.nextCursor == null) return

        viewModelScope.launch {
            _uiState.value = state.copy(isLoadingMore = true)
            runCatching {
                feedRepository.loadFeed(
                    languageCode = state.languageCode,
                    category = state.selectedCategory,
                    state = state.locationFilter.state,
                    district = state.locationFilter.district,
                    cursor = state.nextCursor,
                )
            }
                .onSuccess { page ->
                    _uiState.value = _uiState.value.copy(
                        videos = _uiState.value.videos + page.videos,
                        nextCursor = page.nextCursor,
                        isLoadingMore = false,
                    )
                }
                .onFailure { _uiState.value = _uiState.value.copy(isLoadingMore = false) }
        }
    }
}
