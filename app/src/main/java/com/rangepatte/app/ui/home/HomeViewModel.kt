package com.rangepatte.app.ui.home

import androidx.lifecycle.ViewModel
import com.rangepatte.app.domain.model.GameCatalog
import com.rangepatte.app.domain.model.GameInfo
import com.rangepatte.app.ui.background.BackgroundType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class HomeUiState(
    val featuredGame: GameInfo = GameCatalog.featured,
    val popularGames: List<GameInfo> = GameCatalog.all.take(4),
    val moreGames: List<GameInfo> = GameCatalog.all.drop(4),
    val background: BackgroundType = BackgroundType.GARDEN_BALCONY
)

/**
 * Home screen state holder. There is no persistence layer yet (Phase 17-19 introduces Room and
 * DataStore); the background selection will move to DataStore-backed settings once that lands.
 */
class HomeViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()
}
