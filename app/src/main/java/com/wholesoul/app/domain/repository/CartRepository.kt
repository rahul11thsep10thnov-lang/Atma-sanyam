package com.wholesoul.app.domain.repository

import com.wholesoul.app.domain.model.Cart
import com.wholesoul.app.domain.model.CartTotals
import com.wholesoul.app.domain.model.Coupon
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

interface CartRepository {
    val cart: Flow<Cart>

    suspend fun addToCart(productId: String, quantity: Int = 1)
    suspend fun updateQuantity(productId: String, quantity: Int)
    suspend fun removeFromCart(productId: String)
    suspend fun clearCart()
    suspend fun quantityOf(productId: String): Int
    suspend fun applyCoupon(coupon: Coupon)
    suspend fun removeCoupon()
    fun computeTotals(cart: Cart): CartTotals
}

/** Shared by every listing/details screen to render the ADD / [-] qty [+] state per product. */
fun CartRepository.observeQuantityMap(): Flow<Map<String, Int>> =
    cart.map { c -> c.items.associate { it.product.id to it.quantity } }
