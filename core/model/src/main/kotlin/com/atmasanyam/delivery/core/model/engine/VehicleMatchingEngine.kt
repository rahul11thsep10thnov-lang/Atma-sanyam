package com.atmasanyam.delivery.core.model.engine

import com.atmasanyam.delivery.core.model.GoodsDetails
import com.atmasanyam.delivery.core.model.StandardDimensionsCm
import com.atmasanyam.delivery.core.model.VehicleCapacity
import com.atmasanyam.delivery.core.model.VehicleCategory

/**
 * Decides which vehicle categories can legally/physically carry a shipment.
 *
 * This is a client-side convenience so the guest gets an instant answer while typing;
 * the backend re-runs the same eligibility check (with the authoritative, admin-configured
 * vehicle table) before a booking is ever confirmed — see requirement that the client is
 * never trusted for final vehicle eligibility.
 */
object VehicleMatchingEngine {

    data class EligibilityResult(
        val eligible: Boolean,
        val reason: String? = null,
    )

    fun evaluate(goods: GoodsDetails, vehicle: VehicleCategory): EligibilityResult {
        val dims: StandardDimensionsCm = goods.largestItemDimensions.toStandardCm()
        val capacity: VehicleCapacity = vehicle.capacity

        if (goods.approxWeightKg > capacity.maxWeightKg) {
            return EligibilityResult(false, "Exceeds ${vehicle.name}'s weight limit of ${capacity.maxWeightKg.toInt()} kg.")
        }
        if (dims.lengthCm > capacity.maxLengthCm ||
            dims.widthCm > capacity.maxWidthCm ||
            dims.heightCm > capacity.maxHeightCm
        ) {
            return EligibilityResult(false, "Item dimensions exceed ${vehicle.name}'s capacity.")
        }
        if (dims.volumeCubicCm > capacity.maxVolumeCubicCm) {
            return EligibilityResult(false, "Item volume exceeds ${vehicle.name}'s capacity.")
        }
        return EligibilityResult(true)
    }

    /** Returns every configured vehicle annotated with whether it can carry [goods], cheapest-capable first. */
    fun findEligibleVehicles(
        goods: GoodsDetails,
        availableVehicles: List<VehicleCategory>,
    ): List<Pair<VehicleCategory, EligibilityResult>> {
        return availableVehicles
            .filter { it.isActive }
            .sortedBy { it.sortOrder }
            .map { it to evaluate(goods, it) }
    }
}
