package com.atmasanyam.delivery.core.model

enum class GoodsCategory(val displayName: String) {
    HARDWARE("Hardware"),
    ELECTRICAL("Electrical"),
    ELECTRONICS("Electronics"),
    FURNITURE("Furniture"),
    APPLIANCES("Appliances"),
    PLUMBING("Plumbing"),
    CONSTRUCTION_MATERIAL("Construction Material"),
    GROCERY("Grocery"),
    HOUSEHOLD_ITEMS("Household Items"),
    PACKAGES_BOXES("Packages/Boxes"),
    OTHER("Other"),
}

enum class LengthUnit { FEET, INCHES }

/**
 * Dimensions of the single largest item/package in the shipment, as entered by the user
 * in whichever unit they picked. Use [toStandardCm] before running it through matching/pricing.
 */
data class Dimensions(
    val length: Double,
    val width: Double,
    val height: Double,
    val unit: LengthUnit,
) {
    fun toStandardCm(): StandardDimensionsCm {
        val factor = when (unit) {
            LengthUnit.FEET -> 30.48
            LengthUnit.INCHES -> 2.54
        }
        return StandardDimensionsCm(length * factor, width * factor, height * factor)
    }
}

/** Dimensions normalized to centimeters — the only unit business logic should reason about. */
data class StandardDimensionsCm(
    val lengthCm: Double,
    val widthCm: Double,
    val heightCm: Double,
) {
    val volumeCubicCm: Double get() = lengthCm * widthCm * heightCm
    val volumeCubicM: Double get() = volumeCubicCm / 1_000_000.0
    val longestSideCm: Double get() = maxOf(lengthCm, widthCm, heightCm)
}

enum class WeightPreset(val label: String, val rangeKg: ClosedFloatingPointRange<Double>) {
    UNDER_5("<5 kg", 0.0..5.0),
    FIVE_TO_TEN("5-10 kg", 5.0..10.0),
    TEN_TO_TWENTY_FIVE("10-25 kg", 10.0..25.0),
    TWENTY_FIVE_TO_FIFTY("25-50 kg", 25.0..50.0),
    FIFTY_TO_HUNDRED("50-100 kg", 50.0..100.0),
    OVER_HUNDRED("100+ kg", 100.0..Double.MAX_VALUE),
}

/** Everything the customer told us about what they're shipping, before it's priced or matched. */
data class GoodsDetails(
    val categories: Set<GoodsCategory>,
    val description: String = "",
    val quantity: Int,
    val approxWeightKg: Double,
    val largestItemDimensions: Dimensions,
) {
    init {
        require(categories.isNotEmpty()) { "At least one goods category must be selected." }
        require(quantity in 1..999_999) { "Quantity must be a positive number." }
        require(approxWeightKg > 0) { "Approximate weight must be greater than zero." }
    }
}
