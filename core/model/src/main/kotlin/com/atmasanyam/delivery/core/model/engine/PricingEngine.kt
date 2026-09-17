package com.atmasanyam.delivery.core.model.engine

import com.atmasanyam.delivery.core.model.GoodsDetails
import com.atmasanyam.delivery.core.model.PriceBreakdown
import com.atmasanyam.delivery.core.model.PricingRule
import com.atmasanyam.delivery.core.model.Route
import kotlin.math.max

/**
 * Computes a transparent, itemized price for a single vehicle option.
 *
 * This mirrors the formula the backend uses for the authoritative price at booking time;
 * every [PricingRule] field is admin-configurable, nothing here is a hard-coded constant.
 * The client-side result is a guest-facing estimate only.
 */
object PricingEngine {

    fun calculate(
        route: Route,
        goods: GoodsDetails,
        rule: PricingRule,
        waitingMinutes: Int = 0,
    ): PriceBreakdown {
        val distanceCharge = route.distanceKm * rule.perKmFare
        val billableWaitingMinutes = max(0, waitingMinutes - rule.freeWaitingMinutes)
        val waitingFee = billableWaitingMinutes * rule.waitingFeePerMinute
        val heavyWeightSurcharge =
            if (goods.approxWeightKg > rule.heavyWeightThresholdKg) rule.heavyWeightSurcharge else 0.0

        val breakdown = PriceBreakdown(
            baseFare = rule.baseFare,
            distanceCharge = distanceCharge,
            vehicleCharge = 0.0,
            loadingFee = rule.loadingFee,
            waitingFee = waitingFee,
            heavyWeightSurcharge = heavyWeightSurcharge,
            platformFee = rule.platformFee,
            tax = 0.0,
            surgeMultiplier = rule.surgeMultiplier,
        )

        val taxableAmount = breakdown.subtotal * rule.surgeMultiplier + rule.platformFee
        val tax = taxableAmount * (rule.taxPercent / 100.0)

        val withTax = breakdown.copy(tax = tax)
        val flooredTotal = max(withTax.total, rule.minimumFare)

        return if (flooredTotal == withTax.total) {
            withTax
        } else {
            // Minimum fare applies: fold the top-up into the base fare so the breakdown still sums to the total.
            withTax.copy(baseFare = withTax.baseFare + (flooredTotal - withTax.total))
        }
    }
}
