package com.wholesoul.app.fakes

import com.wholesoul.app.core.util.Constants
import com.wholesoul.app.domain.model.Cart
import com.wholesoul.app.domain.model.CartItem
import com.wholesoul.app.domain.model.CartTotals
import com.wholesoul.app.domain.model.Coupon
import com.wholesoul.app.domain.model.CouponType
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.repository.CartRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class FakeCartRepository(private val catalog: Map<String, Product>) : CartRepository {

    private val quantities = linkedMapOf<String, Int>()
    private var appliedCoupon: Coupon? = null
    private val state = MutableStateFlow(Cart(emptyList()))

    override val cart: StateFlow<Cart> get() = state

    private fun publish() {
        val items = quantities.mapNotNull { (id, qty) -> catalog[id]?.let { CartItem(it, qty) } }
        state.value = Cart(items, appliedCoupon)
    }

    override suspend fun addToCart(productId: String, quantity: Int) {
        quantities[productId] = (quantities[productId] ?: 0) + quantity
        publish()
    }

    override suspend fun updateQuantity(productId: String, quantity: Int) {
        if (quantity <= 0) quantities.remove(productId) else quantities[productId] = quantity
        publish()
    }

    override suspend fun removeFromCart(productId: String) {
        quantities.remove(productId)
        publish()
    }

    override suspend fun clearCart() {
        quantities.clear()
        appliedCoupon = null
        publish()
    }

    override suspend fun quantityOf(productId: String): Int = quantities[productId] ?: 0

    override suspend fun applyCoupon(coupon: Coupon) {
        appliedCoupon = coupon
        publish()
    }

    override suspend fun removeCoupon() {
        appliedCoupon = null
        publish()
    }

    override fun computeTotals(cart: Cart): CartTotals {
        val itemTotal = cart.items.sumOf { it.product.price * it.quantity }
        val mrpTotal = cart.items.sumOf { it.product.mrp * it.quantity }
        val couponDiscount = cart.appliedCoupon?.discountFor(itemTotal) ?: 0.0
        val freeByCoupon = cart.appliedCoupon?.type == CouponType.FREE_DELIVERY && itemTotal >= (cart.appliedCoupon?.minOrderValue ?: Double.MAX_VALUE)
        val deliveryFee = if (cart.items.isEmpty() || freeByCoupon || itemTotal >= Constants.FREE_DELIVERY_THRESHOLD) 0.0 else Constants.DEFAULT_DELIVERY_FEE
        val handlingFee = if (cart.items.isEmpty()) 0.0 else Constants.DEFAULT_HANDLING_FEE
        return CartTotals(itemTotal, mrpTotal, deliveryFee, handlingFee, couponDiscount, Constants.FREE_DELIVERY_THRESHOLD)
    }
}
