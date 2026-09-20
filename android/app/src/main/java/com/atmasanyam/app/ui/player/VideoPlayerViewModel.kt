package com.atmasanyam.app.ui.player

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.atmasanyam.app.data.repository.StoryRepository
import com.atmasanyam.app.domain.model.VideoManifest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class VideoPlayerUiState(
    val manifest: VideoManifest? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
    val captionsEnabled: Boolean = true,
    val isSaved: Boolean = false,
)

/** Vertical video player for 2-4 minute news videos (spec §19). */
@HiltViewModel
class VideoPlayerViewModel @Inject constructor(
    private val storyRepository: StoryRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val videoId: String = checkNotNull(savedStateHandle["videoId"])

    private val _uiState = MutableStateFlow(VideoPlayerUiState())
    val uiState: StateFlow<VideoPlayerUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            runCatching { storyRepository.getVideoManifest(videoId) }
                .onSuccess { manifest -> _uiState.value = _uiState.value.copy(manifest = manifest, isLoading = false) }
                .onFailure { err -> _uiState.value = _uiState.value.copy(isLoading = false, error = err.message) }
        }
    }

    fun toggleCaptions() {
        _uiState.value = _uiState.value.copy(captionsEnabled = !_uiState.value.captionsEnabled)
    }

    fun recordView(watchSeconds: Int) {
        viewModelScope.launch { storyRepository.recordView(videoId, watchSeconds) }
    }

    fun like() {
        viewModelScope.launch { storyRepository.recordLike(videoId) }
    }

    fun save() {
        viewModelScope.launch {
            storyRepository.recordSave(videoId)
            _uiState.value = _uiState.value.copy(isSaved = true)
        }
    }

    fun share(channel: String?) {
        viewModelScope.launch { storyRepository.recordShare(videoId, channel) }
    }

    fun report(reason: String, notes: String?) {
        viewModelScope.launch { storyRepository.recordReport(videoId, reason, notes) }
    }
}
