package com.wholesoul.app.domain

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.domain.model.Coupon
import com.wholesoul.app.domain.model.CouponType
import org.junit.Test

class CouponTest {

    @Test
    fun `flat coupon below minimum order value gives no discount`() {
        val coupon = Coupon("FIRST50", "t", "d", CouponType.FLAT, 50.0, minOrderValue = 199.0, expiryLabel = "")
        assertThat(coupon.discountFor(150.0)).isEqualTo(0.0)
    }

    @Test
    fun `flat coupon at or above minimum order value applies flat discount`() {
        val coupon = Coupon("FIRST50", "t", "d", CouponType.FLAT, 50.0, minOrderValue = 199.0, expiryLabel = "")
        assertThat(coupon.discountFor(200.0)).isEqualTo(50.0)
    }

    @Test
    fun `percentage coupon respects max discount cap`() {
        val coupon = Coupon("FRESH20", "t", "d", CouponType.PERCENTAGE, 20.0, minOrderValue = 150.0, maxDiscount = 80.0, expiryLabel = "")
        // 20% of 1000 would be 200, capped to 80
        assertThat(coupon.discountFor(1000.0)).isEqualTo(80.0)
    }

    @Test
    fun `percentage coupon under cap applies full percentage`() {
        val coupon = Coupon("FRESH20", "t", "d", CouponType.PERCENTAGE, 20.0, minOrderValue = 150.0, maxDiscount = 80.0, expiryLabel = "")
        assertThat(coupon.discountFor(200.0)).isEqualTo(40.0)
    }

    @Test
    fun `free delivery coupon type has zero product discount`() {
        val coupon = Coupon("FREEDEL", "t", "d", CouponType.FREE_DELIVERY, 0.0, minOrderValue = 299.0, expiryLabel = "")
        assertThat(coupon.discountFor(500.0)).isEqualTo(0.0)
    }
}
