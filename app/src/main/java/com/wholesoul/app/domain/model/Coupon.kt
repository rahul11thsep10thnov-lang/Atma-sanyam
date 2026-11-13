package com.wholesoul.app.domain.model

enum class CouponType { FLAT, PERCENTAGE, FREE_DELIVERY }

data class Coupon(
    val code: String,
    val title: String,
    val description: String,
    val type: CouponType,
    val value: Double,
    val minOrderValue: Double,
    val maxDiscount: Double? = null,
    val expiryLabel: String,
) {
    fun discountFor(itemTotal: Double): Double {
        if (itemTotal < minOrderValue) return 0.0
        val raw = when (type) {
            CouponType.FLAT -> value
            CouponType.PERCENTAGE -> itemTotal * (value / 100.0)
            CouponType.FREE_DELIVERY -> 0.0
        }
        return maxDiscount?.let { raw.coerceAtMost(it) } ?: raw
    }
}
