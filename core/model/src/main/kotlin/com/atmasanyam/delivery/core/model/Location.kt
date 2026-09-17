package com.atmasanyam.delivery.core.model

/**
 * A geographic point plus its human-readable address.
 * Coordinates are stored separately from the address string so pricing/routing
 * never depends on free-text parsing.
 */
data class GeoPoint(
    val latitude: Double,
    val longitude: Double,
)

enum class SavedAddressLabel {
    HOME, WORK, SHOP, OTHER
}

data class DeliveryLocation(
    val point: GeoPoint,
    val addressLine: String,
    val placeId: String? = null,
    val savedLabel: SavedAddressLabel? = null,
)

data class Route(
    val distanceMeters: Int,
    val durationSeconds: Int,
    val encodedPolyline: String,
) {
    val distanceKm: Double get() = distanceMeters / 1000.0
    val durationMinutes: Int get() = (durationSeconds + 59) / 60
}
