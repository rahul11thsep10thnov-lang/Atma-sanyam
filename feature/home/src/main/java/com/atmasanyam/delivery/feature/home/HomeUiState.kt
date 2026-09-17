package com.atmasanyam.delivery.feature.home

/**
 * State for the map-first landing screen. Pickup/destination are plain search text for now;
 * Phase 3 replaces them with real Places Autocomplete results (place id + lat/lng) and Phase 5
 * wires the route line to the Routes API instead of the mock distance/ETA computed here.
 */
data class HomeUiState(
    val pickupText: String = "",
    val destinationText: String = "",
    val isUsingCurrentLocationForPickup: Boolean = false,
    val mockDistanceKm: Double? = null,
    val mockEtaMinutes: Int? = null,
) {
    val canEnterGoodsDetails: Boolean
        get() = pickupText.isNotBlank() && destinationText.isNotBlank() && pickupText != destinationText

    val showRoutePreview: Boolean
        get() = pickupText.isNotBlank() && destinationText.isNotBlank()
}
