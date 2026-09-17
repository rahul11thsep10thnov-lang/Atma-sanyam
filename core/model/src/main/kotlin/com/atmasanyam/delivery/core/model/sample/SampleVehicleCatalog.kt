package com.atmasanyam.delivery.core.model.sample

import com.atmasanyam.delivery.core.model.GoodsCategory
import com.atmasanyam.delivery.core.model.PricingRule
import com.atmasanyam.delivery.core.model.VehicleCapacity
import com.atmasanyam.delivery.core.model.VehicleCategory

/**
 * Placeholder vehicle catalog used only until Phase 12 wires up the real backend/admin-configured
 * catalog (see GET /vehicles in the proposed API). Nothing in the matching or pricing engines
 * depends on this specific data — swapping it for a network response requires no engine changes.
 */
object SampleVehicleCatalog {

    val vehicles: List<VehicleCategory> = listOf(
        VehicleCategory(
            id = "bike",
            name = "Bike",
            imageUrl = null,
            description = "Documents, small parcels and small electronics.",
            suitableFor = listOf(GoodsCategory.ELECTRONICS, GoodsCategory.PACKAGES_BOXES, GoodsCategory.OTHER),
            capacity = VehicleCapacity(
                maxWeightKg = 15.0,
                maxLengthCm = 45.0,
                maxWidthCm = 35.0,
                maxHeightCm = 35.0,
                maxVolumeCubicCm = 45.0 * 35.0 * 35.0,
            ),
            pricingRule = PricingRule(
                baseFare = 20.0,
                perKmFare = 6.0,
                minimumFare = 35.0,
                loadingFee = 0.0,
                waitingFeePerMinute = 1.0,
                platformFee = 5.0,
                taxPercent = 5.0,
            ),
            etaMinutesRange = 5..10,
            sortOrder = 0,
        ),
        VehicleCategory(
            id = "three_wheeler",
            name = "Three-Wheeler",
            imageUrl = null,
            description = "Multiple cartons, hardware and plumbing material.",
            suitableFor = listOf(
                GoodsCategory.HARDWARE, GoodsCategory.PLUMBING, GoodsCategory.ELECTRICAL,
                GoodsCategory.GROCERY, GoodsCategory.HOUSEHOLD_ITEMS, GoodsCategory.PACKAGES_BOXES,
            ),
            capacity = VehicleCapacity(
                maxWeightKg = 150.0,
                maxLengthCm = 150.0,
                maxWidthCm = 110.0,
                maxHeightCm = 110.0,
                maxVolumeCubicCm = 150.0 * 110.0 * 110.0,
            ),
            pricingRule = PricingRule(
                baseFare = 40.0,
                perKmFare = 10.0,
                minimumFare = 60.0,
                loadingFee = 15.0,
                waitingFeePerMinute = 1.5,
                platformFee = 8.0,
                taxPercent = 5.0,
                heavyWeightThresholdKg = 100.0,
                heavyWeightSurcharge = 20.0,
            ),
            etaMinutesRange = 8..15,
            sortOrder = 1,
        ),
        VehicleCategory(
            id = "mini_goods_vehicle",
            name = "Mini Goods Vehicle",
            imageUrl = null,
            description = "Furniture, appliances and multiple heavy boxes.",
            suitableFor = listOf(
                GoodsCategory.FURNITURE, GoodsCategory.APPLIANCES, GoodsCategory.HARDWARE,
                GoodsCategory.CONSTRUCTION_MATERIAL,
            ),
            capacity = VehicleCapacity(
                maxWeightKg = 750.0,
                maxLengthCm = 250.0,
                maxWidthCm = 150.0,
                maxHeightCm = 150.0,
                maxVolumeCubicCm = 250.0 * 150.0 * 150.0,
            ),
            pricingRule = PricingRule(
                baseFare = 80.0,
                perKmFare = 16.0,
                minimumFare = 120.0,
                loadingFee = 40.0,
                waitingFeePerMinute = 2.0,
                platformFee = 10.0,
                taxPercent = 5.0,
                heavyWeightThresholdKg = 400.0,
                heavyWeightSurcharge = 50.0,
            ),
            etaMinutesRange = 12..20,
            sortOrder = 2,
        ),
        VehicleCategory(
            id = "large_goods_vehicle",
            name = "Large Goods Vehicle",
            imageUrl = null,
            description = "Construction material and large-volume house-shifting loads.",
            suitableFor = listOf(GoodsCategory.CONSTRUCTION_MATERIAL, GoodsCategory.FURNITURE, GoodsCategory.APPLIANCES),
            capacity = VehicleCapacity(
                maxWeightKg = 3000.0,
                maxLengthCm = 400.0,
                maxWidthCm = 200.0,
                maxHeightCm = 200.0,
                maxVolumeCubicCm = 400.0 * 200.0 * 200.0,
            ),
            pricingRule = PricingRule(
                baseFare = 150.0,
                perKmFare = 25.0,
                minimumFare = 250.0,
                loadingFee = 80.0,
                waitingFeePerMinute = 2.5,
                platformFee = 15.0,
                taxPercent = 5.0,
                heavyWeightThresholdKg = 1500.0,
                heavyWeightSurcharge = 100.0,
            ),
            etaMinutesRange = 15..30,
            sortOrder = 3,
        ),
    )
}
