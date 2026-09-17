package com.atmasanyam.delivery.core.model

/**
 * A vehicle category and everything the matching/pricing engines need to know about it.
 * Every field here is expected to come from backend/admin configuration, never a hard-coded
 * constant in the app — this class is the shape of that configuration, not a fixed catalog.
 */
data class VehicleCategory(
    val id: String,
    val name: String,
    val imageUrl: String?,
    val description: String,
    val suitableFor: List<GoodsCategory>,
    val capacity: VehicleCapacity,
    val pricingRule: PricingRule,
    val etaMinutesRange: IntRange,
    val isActive: Boolean = true,
    val sortOrder: Int = 0,
)

data class VehicleCapacity(
    val maxWeightKg: Double,
    val maxLengthCm: Double,
    val maxWidthCm: Double,
    val maxHeightCm: Double,
    val maxVolumeCubicCm: Double,
)

data class PricingRule(
    val baseFare: Double,
    val perKmFare: Double,
    val minimumFare: Double,
    val loadingFee: Double,
    val waitingFeePerMinute: Double,
    val freeWaitingMinutes: Int = 5,
    val platformFee: Double,
    val taxPercent: Double,
    val surgeMultiplier: Double = 1.0,
    val heavyWeightThresholdKg: Double = 50.0,
    val heavyWeightSurcharge: Double = 0.0,
)
