package com.atmasanyam.delivery.core.model.engine

import com.atmasanyam.delivery.core.model.Dimensions
import com.atmasanyam.delivery.core.model.GoodsCategory
import com.atmasanyam.delivery.core.model.GoodsDetails
import com.atmasanyam.delivery.core.model.LengthUnit
import com.atmasanyam.delivery.core.model.PricingRule
import com.atmasanyam.delivery.core.model.Route
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class PricingEngineTest {

    private val route = Route(distanceMeters = 8400, durationSeconds = 24 * 60, encodedPolyline = "")

    private val lightGoods = GoodsDetails(
        categories = setOf(GoodsCategory.ELECTRONICS),
        quantity = 1,
        approxWeightKg = 5.0,
        largestItemDimensions = Dimensions(1.0, 1.0, 1.0, LengthUnit.FEET),
    )

    private fun assertClose(expected: Double, actual: Double, message: String) {
        assertTrue("$message: expected=$expected actual=$actual", abs(expected - actual) < 0.01)
    }

    @Test
    fun `breakdown sums to total exactly`() {
        val rule = PricingRule(
            baseFare = 50.0, perKmFare = 10.0, minimumFare = 0.0, loadingFee = 20.0,
            waitingFeePerMinute = 1.0, platformFee = 10.0, taxPercent = 5.0,
        )
        val breakdown = PricingEngine.calculate(route, lightGoods, rule)

        assertClose(50.0, breakdown.baseFare, "base fare")
        assertClose(84.0, breakdown.distanceCharge, "distance charge (8.4km * 10)")
        assertClose(20.0, breakdown.loadingFee, "loading fee")

        val expectedSubtotal = 50.0 + 84.0 + 20.0
        assertClose(expectedSubtotal, breakdown.subtotal, "subtotal")

        val expectedTaxable = expectedSubtotal * 1.0 + 10.0
        val expectedTax = expectedTaxable * 0.05
        assertClose(expectedTax, breakdown.tax, "tax")

        val expectedTotal = expectedSubtotal + 10.0 + expectedTax
        assertClose(expectedTotal, breakdown.total, "total")
    }

    @Test
    fun `minimum fare floors the total without breaking the breakdown sum`() {
        val rule = PricingRule(
            baseFare = 5.0, perKmFare = 1.0, minimumFare = 500.0, loadingFee = 0.0,
            waitingFeePerMinute = 0.0, platformFee = 0.0, taxPercent = 0.0,
        )
        val breakdown = PricingEngine.calculate(route, lightGoods, rule)

        assertClose(500.0, breakdown.total, "total floored at minimum fare")
        assertClose(breakdown.total, breakdown.subtotal + breakdown.platformFee + breakdown.tax, "breakdown still sums to total")
    }

    @Test
    fun `heavy weight surcharge only applies above threshold`() {
        val rule = PricingRule(
            baseFare = 10.0, perKmFare = 1.0, minimumFare = 0.0, loadingFee = 0.0,
            waitingFeePerMinute = 0.0, platformFee = 0.0, taxPercent = 0.0,
            heavyWeightThresholdKg = 50.0, heavyWeightSurcharge = 30.0,
        )
        val lightBreakdown = PricingEngine.calculate(route, lightGoods, rule)
        assertClose(0.0, lightBreakdown.heavyWeightSurcharge, "no surcharge under threshold")

        val heavyGoods = lightGoods.copy(approxWeightKg = 80.0)
        val heavyBreakdown = PricingEngine.calculate(route, heavyGoods, rule)
        assertClose(30.0, heavyBreakdown.heavyWeightSurcharge, "surcharge applied over threshold")
    }

    @Test
    fun `billable waiting time excludes the free minutes`() {
        val rule = PricingRule(
            baseFare = 0.0, perKmFare = 0.0, minimumFare = 0.0, loadingFee = 0.0,
            waitingFeePerMinute = 2.0, freeWaitingMinutes = 5, platformFee = 0.0, taxPercent = 0.0,
        )
        val breakdown = PricingEngine.calculate(route.copy(distanceMeters = 0), lightGoods, rule, waitingMinutes = 8)
        assertClose(6.0, breakdown.waitingFee, "3 billable minutes * 2.0")
    }
}
