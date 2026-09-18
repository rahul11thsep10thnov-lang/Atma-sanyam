package com.wholesoul.app.data.repository

import com.wholesoul.app.core.util.Constants
import com.wholesoul.app.data.mock.MockOfferData
import com.wholesoul.app.domain.model.Coupon
import com.wholesoul.app.domain.model.Offer
import com.wholesoul.app.domain.repository.CouponRepository
import kotlinx.coroutines.delay
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MockCouponRepository @Inject constructor() : CouponRepository {

    override suspend fun getAvailableCoupons(): Result<List<Coupon>> {
        delay(Constants.NETWORK_SIMULATED_DELAY_MS)
        return Result.success(MockOfferData.coupons)
    }

    override suspend fun getOffers(): Result<List<Offer>> {
        delay(Constants.NETWORK_SIMULATED_DELAY_MS)
        return Result.success(MockOfferData.offers)
    }

    override suspend fun validateCoupon(code: String, itemTotal: Double): Result<Coupon> {
        delay(Constants.NETWORK_SIMULATED_DELAY_MS)
        val coupon = MockOfferData.coupons.firstOrNull { it.code.equals(code.trim(), ignoreCase = true) }
            ?: return Result.failure(NoSuchElementException("Invalid coupon code"))
        if (itemTotal < coupon.minOrderValue) {
            return Result.failure(IllegalStateException("Add items worth ₹${coupon.minOrderValue.toInt()} to use this coupon"))
        }
        return Result.success(coupon)
    }
}
