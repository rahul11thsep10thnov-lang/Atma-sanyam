package com.atmasanyam.delivery.feature.home

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlin.math.abs

class HomeViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    fun onPickupTextChanged(text: String) {
        _uiState.update { it.copy(pickupText = text, isUsingCurrentLocationForPickup = false) }
        recomputeMockRoute()
    }

    fun onDestinationTextChanged(text: String) {
        _uiState.update { it.copy(destinationText = text) }
        recomputeMockRoute()
    }

    /**
     * Placeholder for FusedLocationProviderClient + reverse geocoding, wired up in Phase 3/4
     * once Google Maps/Places dependencies and the location permission flow (see requirement
     * that permission is only requested when needed) are in place.
     */
    fun onUseCurrentLocationForPickup() {
        _uiState.update {
            it.copy(pickupText = "Current location", isUsingCurrentLocationForPickup = true)
        }
        recomputeMockRoute()
    }

    private fun recomputeMockRoute() {
        val state = _uiState.value
        if (!state.showRoutePreview) {
            _uiState.update { it.copy(mockDistanceKm = null, mockEtaMinutes = null) }
            return
        }
        // Deterministic placeholder so the UI has something stable to render before the real
        // Routes API integration (Phase 5) supplies road distance and duration.
        val seed = abs((state.pickupText + state.destinationText).hashCode())
        val distanceKm = 2.0 + (seed % 180) / 10.0
        val etaMinutes = 8 + (seed % 40)
        _uiState.update { it.copy(mockDistanceKm = distanceKm, mockEtaMinutes = etaMinutes) }
    }
}
