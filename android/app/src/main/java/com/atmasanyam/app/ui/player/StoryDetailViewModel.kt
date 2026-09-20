package com.atmasanyam.app.ui.player

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.atmasanyam.app.data.repository.PreferencesRepository
import com.atmasanyam.app.data.repository.StoryRepository
import com.atmasanyam.app.domain.model.StoryDetail
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StoryDetailUiState(
    val story: StoryDetail? = null,
    val isLoading: Boolean = true,
)

@HiltViewModel
class StoryDetailViewModel @Inject constructor(
    private val storyRepository: StoryRepository,
    private val preferencesRepository: PreferencesRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val storyId: String = checkNotNull(savedStateHandle["storyId"])

    private val _uiState = MutableStateFlow(StoryDetailUiState())
    val uiState: StateFlow<StoryDetailUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val languageCode = preferencesRepository.languageCode.first() ?: "en"
            runCatching { storyRepository.getStory(storyId, languageCode) }
                .onSuccess { story -> _uiState.value = StoryDetailUiState(story = story, isLoading = false) }
                .onFailure { _uiState.value = StoryDetailUiState(story = null, isLoading = false) }
        }
    }
}
