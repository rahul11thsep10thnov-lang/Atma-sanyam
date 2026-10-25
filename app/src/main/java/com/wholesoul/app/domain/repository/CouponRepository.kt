package com.wholesoul.app.domain.repository

import com.wholesoul.app.domain.model.Coupon
import com.wholesoul.app.domain.model.Offer

interface CouponRepository {
    suspend fun getAvailableCoupons(): Result<List<Coupon>>
    suspend fun getOffers(): Result<List<Offer>>
    suspend fun validateCoupon(code: String, itemTotal: Double): Result<Coupon>
}
