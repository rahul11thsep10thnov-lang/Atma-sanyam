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
     * Demo-only coordinates so the map (Phase 3) has two plausibly-placed pins to show before
     * Phase 4 wires up real Places/Geocoding results - separated by roughly [mockDistanceKm].
     * Null until both pickup and destination text are entered.
     */
    val pickupPoint: GeoPoint?
        get() = if (showRoutePreview) BENGALURU_DEMO_CENTER else null

    val destinationPoint: GeoPoint?
        get() = mockDistanceKm?.takeIf { showRoutePreview }?.let { distanceKm ->
            BENGALURU_DEMO_CENTER.copy(latitude = BENGALURU_DEMO_CENTER.latitude + (distanceKm / KM_PER_DEGREE_LATITUDE))
        }

    /**
     * Packages the current mock selection into real domain types for the rest of the flow.
     * Everything downstream (goods details, vehicle matching, pricing) only cares about the
     * route's distance/duration, not the demo lat/lngs above.
     */
    fun toPickupDestinationRoute(): Triple<DeliveryLocation, DeliveryLocation, Route>? {
        val distanceKm = mockDistanceKm ?: return null
        val etaMinutes = mockEtaMinutes ?: return null
        if (!canEnterGoodsDetails) return null
        val pickupPoint = pickupPoint ?: return null
        val destinationPoint = destinationPoint ?: return null

        val pickup = DeliveryLocation(point = pickupPoint, addressLine = pickupText)
        val destination = DeliveryLocation(point = destinationPoint, addressLine = destinationText)
        val route = Route(
            distanceMeters = (distanceKm * 1000).toInt(),
            durationSeconds = etaMinutes * 60,
            encodedPolyline = "",
        )
        return Triple(pickup, destination, route)
    }

    private companion object {
        val BENGALURU_DEMO_CENTER = GeoPoint(latitude = 12.9716, longitude = 77.5946)
        const val KM_PER_DEGREE_LATITUDE = 111.0
    }
}
