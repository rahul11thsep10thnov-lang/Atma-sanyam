package com.atmasanyam.delivery.core.model

/**
 * Fully itemized price, never a bare total — the UI must always be able to show every line.
 * This is computed client-side only for an instant guest quote; the backend recomputes and
 * is the sole source of truth once a booking is actually placed.
 */
data class PriceBreakdown(
    val baseFare: Double,
    val distanceCharge: Double,
    val vehicleCharge: Double,
    val loadingFee: Double,
    val waitingFee: Double,
    val heavyWeightSurcharge: Double,
    val platformFee: Double,
    val tax: Double,
    val surgeMultiplier: Double,
) {
    val subtotal: Double
        get() = baseFare + distanceCharge + vehicleCharge + loadingFee + waitingFee + heavyWeightSurcharge

    val total: Double
        get() = (subtotal * surgeMultiplier) + platformFee + tax
}

data class VehicleQuote(
    val vehicle: VehicleCategory,
    val eligible: Boolean,
    val ineligibilityReason: String? = null,
    val priceBreakdown: PriceBreakdown?,
    val etaMinutes: Int,
)

/**
 * A price estimate the guest can obtain with no authentication. Held client-side only
 * (in-memory/session) until the user chooses to book, at which point it is exchanged
 * for a server-validated booking.
 */
data class Quote(
    val quoteId: String,
    val pickup: DeliveryLocation,
    val destination: DeliveryLocation,
    val route: Route,
    val goodsDetails: GoodsDetails,
    val vehicleOptions: List<VehicleQuote>,
    val createdAtEpochMillis: Long,
)
