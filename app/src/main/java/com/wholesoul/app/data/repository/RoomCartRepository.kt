package com.wholesoul.app.data.repository

import com.wholesoul.app.core.util.Constants
import com.wholesoul.app.data.local.dao.CartDao
import com.wholesoul.app.data.local.entity.CartItemEntity
import com.wholesoul.app.data.local.entity.CartMetaEntity
import com.wholesoul.app.data.mock.MockOfferData
import com.wholesoul.app.data.mock.MockProductData
import com.wholesoul.app.domain.model.Cart
import com.wholesoul.app.domain.model.CartItem
import com.wholesoul.app.domain.model.CartTotals
import com.wholesoul.app.domain.model.Coupon
import com.wholesoul.app.domain.model.CouponType
import com.wholesoul.app.domain.repository.CartRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RoomCartRepository @Inject constructor(
    private val cartDao: CartDao,
) : CartRepository {

    private val productsById by lazy { MockProductData.allProducts.associateBy { it.id } }
    private val couponsByCode by lazy { MockOfferData.coupons.associateBy { it.code } }

    override val cart: Flow<Cart> = combine(cartDao.observeItems(), cartDao.observeMeta()) { items, meta ->
        val cartItems = items.mapNotNull { entity ->
            productsById[entity.productId]?.let { product -> CartItem(product, entity.quantity) }
        }
        val coupon = meta?.appliedCouponCode?.let { couponsByCode[it] }
        Cart(items = cartItems, appliedCoupon = coupon)
    }

    override suspend fun addToCart(productId: String, quantity: Int) {
        val existing = cartDao.getItem(productId)
        val newQuantity = (existing?.quantity ?: 0) + quantity
        cartDao.upsert(CartItemEntity(productId, newQuantity.coerceAtLeast(1), System.currentTimeMillis()))
    }

    override suspend fun updateQuantity(productId: String, quantity: Int) {
        if (quantity <= 0) {
            cartDao.delete(productId)
        } else {
            val existing = cartDao.getItem(productId)
            cartDao.upsert(CartItemEntity(productId, quantity, existing?.addedAtEpochMillis ?: System.currentTimeMillis()))
        }
    }

    override suspend fun removeFromCart(productId: String) {
        cartDao.delete(productId)
    }

    override suspend fun clearCart() {
        cartDao.clear()
        cartDao.upsertMeta(CartMetaEntity(appliedCouponCode = null))
    }

    override suspend fun quantityOf(productId: String): Int = cartDao.getItem(productId)?.quantity ?: 0

    override suspend fun applyCoupon(coupon: Coupon) {
        cartDao.upsertMeta(CartMetaEntity(appliedCouponCode = coupon.code))
    }

    override suspend fun removeCoupon() {
        cartDao.upsertMeta(CartMetaEntity(appliedCouponCode = null))
    }

    override fun computeTotals(cart: Cart): CartTotals {
        val itemTotal = cart.items.sumOf { it.product.price * it.quantity }
        val mrpTotal = cart.items.sumOf { it.product.mrp * it.quantity }
        val coupon = cart.appliedCoupon
        val couponDiscount = coupon?.discountFor(itemTotal) ?: 0.0
        val isFreeDeliveryCoupon = coupon?.type == CouponType.FREE_DELIVERY && itemTotal >= (coupon.minOrderValue)
        val qualifiesByThreshold = itemTotal >= Constants.FREE_DELIVERY_THRESHOLD
        val deliveryFee = if (cart.items.isEmpty() || isFreeDeliveryCoupon || qualifiesByThreshold) 0.0 else Constants.DEFAULT_DELIVERY_FEE
        val handlingFee = if (cart.items.isEmpty()) 0.0 else Constants.DEFAULT_HANDLING_FEE
        return CartTotals(
            itemTotal = itemTotal,
            mrpTotal = mrpTotal,
            deliveryFee = deliveryFee,
            handlingFee = handlingFee,
            couponDiscount = couponDiscount,
            freeDeliveryThreshold = Constants.FREE_DELIVERY_THRESHOLD,
        )
    }
}
