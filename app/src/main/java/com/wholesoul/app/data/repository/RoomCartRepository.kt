package com.wholesoul.app.data.repository

import com.wholesoul.app.core.util.Constants
import com.wholesoul.app.data.local.dao.CartDao
import com.wholesoul.app.data.local.dao.ProductDao
import com.wholesoul.app.data.local.entity.CartItemEntity
import com.wholesoul.app.data.local.entity.CartMetaEntity
import com.wholesoul.app.data.local.entity.toDomain
import com.wholesoul.app.data.mock.MockOfferData
import com.wholesoul.app.domain.model.Cart
import com.wholesoul.app.domain.model.CartItem
import com.wholesoul.app.domain.model.CartTotals
import com.wholesoul.app.domain.model.Coupon
import com.wholesoul.app.domain.model.CouponType
import com.wholesoul.app.domain.repository.CartRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * The cart holds product ids and quantities; the products themselves come from the editable
 * catalog, so a price change, a hidden item or a stock change made in the Admin Console shows up
 * here immediately. Quantities never exceed the stock the shop has set.
 */
@Singleton
class RoomCartRepository @Inject constructor(
    private val cartDao: CartDao,
    private val productDao: ProductDao,
) : CartRepository {

    private val couponsByCode by lazy { MockOfferData.coupons.associateBy { it.code } }

    @OptIn(ExperimentalCoroutinesApi::class)
    private val cartItems = cartDao.observeItems().flatMapLatest { items ->
        if (items.isEmpty()) {
            flowOf(emptyList<CartItem>())
        } else {
            productDao.observeVisibleByIds(items.map { it.productId }).map { entities ->
                val byId = entities.associateBy { it.id }
                items.mapNotNull { item -> byId[item.productId]?.let { CartItem(it.toDomain(), item.quantity) } }
            }
        }
    }

    override val cart: Flow<Cart> = combine(cartItems, cartDao.observeMeta()) { items, meta ->
        Cart(items = items, appliedCoupon = meta?.appliedCouponCode?.let { couponsByCode[it] })
    }

    override suspend fun addToCart(productId: String, quantity: Int) {
        val existing = cartDao.getItem(productId)
        setQuantity(productId, (existing?.quantity ?: 0) + quantity, existing?.addedAtEpochMillis)
    }

    override suspend fun updateQuantity(productId: String, quantity: Int) {
        if (quantity <= 0) {
            cartDao.delete(productId)
        } else {
            setQuantity(productId, quantity, cartDao.getItem(productId)?.addedAtEpochMillis)
        }
    }

    /** Stores [wanted] capped to the shop's stock; an unavailable or sold-out product is not added. */
    private suspend fun setQuantity(productId: String, wanted: Int, addedAt: Long?) {
        val product = productDao.getById(productId)
        if (product == null || !product.isActive) {
            cartDao.delete(productId)
            return
        }
        val quantity = wanted.coerceAtMost(product.stock)
        if (quantity <= 0) {
            cartDao.delete(productId)
        } else {
            cartDao.upsert(CartItemEntity(productId, quantity, addedAt ?: System.currentTimeMillis()))
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
