package com.wholesoul.app.fakes

import com.wholesoul.app.domain.model.Coupon
import com.wholesoul.app.domain.model.Offer
import com.wholesoul.app.domain.repository.CouponRepository

class FakeCouponRepository(private val coupons: List<Coupon>) : CouponRepository {
    override suspend fun getAvailableCoupons(): Result<List<Coupon>> = Result.success(coupons)
    override suspend fun getOffers(): Result<List<Offer>> = Result.success(emptyList())
    override suspend fun validateCoupon(code: String, itemTotal: Double): Result<Coupon> {
        val coupon = coupons.firstOrNull { it.code.equals(code, ignoreCase = true) }
            ?: return Result.failure(NoSuchElementException("Invalid coupon code"))
        if (itemTotal < coupon.minOrderValue) return Result.failure(IllegalStateException("Add more items to use this coupon"))
        return Result.success(coupon)
    }
}
