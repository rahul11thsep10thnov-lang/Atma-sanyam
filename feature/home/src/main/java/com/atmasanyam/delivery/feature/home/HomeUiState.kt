package com.atmasanyam.delivery.feature.home

import com.atmasanyam.delivery.core.model.DeliveryLocation
import com.atmasanyam.delivery.core.model.GeoPoint
import com.atmasanyam.delivery.core.model.Route

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

    /**
     * Packages the current mock selection into real domain types for the rest of the flow.
     * The zero coordinates are a placeholder until Phase 3-4 wire up Places/Geocoding -
     * everything downstream (goods details, vehicle matching, pricing) only cares about the
     * route's distance/duration, not these specific lat/lng values.
     */
    fun toPickupDestinationRoute(): Triple<DeliveryLocation, DeliveryLocation, Route>? {
        val distanceKm = mockDistanceKm ?: return null
        val etaMinutes = mockEtaMinutes ?: return null
        if (!canEnterGoodsDetails) return null
        val pickup = DeliveryLocation(point = GeoPoint(0.0, 0.0), addressLine = pickupText)
        val destination = DeliveryLocation(point = GeoPoint(0.0, 0.0), addressLine = destinationText)
        val route = Route(
            distanceMeters = (distanceKm * 1000).toInt(),
            durationSeconds = etaMinutes * 60,
            encodedPolyline = "",
        )
        return Triple(pickup, destination, route)
    }
}
