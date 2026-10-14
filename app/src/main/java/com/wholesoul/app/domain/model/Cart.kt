package com.wholesoul.app.domain.model

data class CartItem(
    val product: Product,
    val quantity: Int,
)

data class CartTotals(
    val itemTotal: Double,
    val mrpTotal: Double,
    val deliveryFee: Double,
    val handlingFee: Double,
    val couponDiscount: Double,
    val freeDeliveryThreshold: Double,
) {
    val productDiscount: Double get() = (mrpTotal - itemTotal).coerceAtLeast(0.0)
    val totalSavings: Double get() = productDiscount + couponDiscount
    val grandTotal: Double get() = (itemTotal - couponDiscount + deliveryFee + handlingFee).coerceAtLeast(0.0)
    val amountToUnlockFreeDelivery: Double get() = (freeDeliveryThreshold - itemTotal).coerceAtLeast(0.0)
    val qualifiesForFreeDelivery: Boolean get() = amountToUnlockFreeDelivery <= 0.0
}

data class Cart(
    val items: List<CartItem>,
    val appliedCoupon: Coupon? = null,
) {
    val totalItemCount: Int get() = items.sumOf { it.quantity }
    val isEmpty: Boolean get() = items.isEmpty()
}
