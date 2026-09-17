package com.atmasanyam.delivery.core.model.engine

import com.atmasanyam.delivery.core.model.Dimensions
import com.atmasanyam.delivery.core.model.GoodsCategory
import com.atmasanyam.delivery.core.model.GoodsDetails
import com.atmasanyam.delivery.core.model.LengthUnit
import com.atmasanyam.delivery.core.model.sample.SampleVehicleCatalog
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class VehicleMatchingEngineTest {

    private fun goods(
        weightKg: Double,
        lengthFt: Double,
        widthFt: Double,
        heightFt: Double,
        category: GoodsCategory = GoodsCategory.OTHER,
    ) = GoodsDetails(
        categories = setOf(category),
        quantity = 1,
        approxWeightKg = weightKg,
        largestItemDimensions = Dimensions(lengthFt, widthFt, heightFt, LengthUnit.FEET),
    )

    @Test
    fun `small light parcel is eligible on a bike`() {
        val bike = SampleVehicleCatalog.vehicles.first { it.id == "bike" }
        val result = VehicleMatchingEngine.evaluate(goods(weightKg = 2.0, lengthFt = 1.0, widthFt = 1.0, heightFt = 1.0), bike)
        assertTrue(result.eligible)
    }

    @Test
    fun `overweight item is rejected by bike but accepted by three-wheeler`() {
        val bike = SampleVehicleCatalog.vehicles.first { it.id == "bike" }
        val threeWheeler = SampleVehicleCatalog.vehicles.first { it.id == "three_wheeler" }
        val heavyGoods = goods(weightKg = 100.0, lengthFt = 2.0, widthFt = 2.0, heightFt = 2.0)

        val bikeResult = VehicleMatchingEngine.evaluate(heavyGoods, bike)
        val threeWheelerResult = VehicleMatchingEngine.evaluate(heavyGoods, threeWheeler)

        assertFalse(bikeResult.eligible)
        assertTrue(threeWheelerResult.eligible)
    }

    @Test
    fun `oversized furniture exceeds every configured vehicle`() {
        val hugeItem = goods(weightKg = 50.0, lengthFt = 20.0, widthFt = 10.0, heightFt = 10.0, category = GoodsCategory.FURNITURE)
        val results = VehicleMatchingEngine.findEligibleVehicles(hugeItem, SampleVehicleCatalog.vehicles)
        assertTrue(results.none { (_, eligibility) -> eligibility.eligible })
    }

    @Test
    fun `findEligibleVehicles preserves configured sort order`() {
        val lightGoods = goods(weightKg = 1.0, lengthFt = 1.0, widthFt = 1.0, heightFt = 1.0)
        val results = VehicleMatchingEngine.findEligibleVehicles(lightGoods, SampleVehicleCatalog.vehicles)
        assertEquals(SampleVehicleCatalog.vehicles.map { it.id }, results.map { it.first.id })
    }
}
