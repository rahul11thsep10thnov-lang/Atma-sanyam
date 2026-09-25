package com.wholesoul.app.data.repository

import com.wholesoul.app.data.local.dao.CartDao
import com.wholesoul.app.data.local.dao.OrderDao
import com.wholesoul.app.data.local.entity.CartItemEntity
import com.wholesoul.app.data.local.entity.toDomain
import com.wholesoul.app.data.local.entity.toEntity
import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.model.Cart
import com.wholesoul.app.domain.model.CartTotals
import com.wholesoul.app.domain.model.DeliveryStatus
import com.wholesoul.app.domain.model.Order
import com.wholesoul.app.domain.model.OrderItem
import com.wholesoul.app.domain.model.PaymentMethod
import com.wholesoul.app.domain.repository.OrderRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Orders live in Room so history/details/tracking survive app restarts (spec 18-19).
 * Delivery status auto-progresses on a short mock timer purely for demo purposes — there is
 * still no live map or GPS involved (spec section 17).
 */
@Singleton
class RoomOrderRepository @Inject constructor(
    private val orderDao: OrderDao,
    private val cartDao: CartDao,
) : OrderRepository {

    private val backgroundScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override val orders: Flow<List<Order>> = orderDao.observeAll().map { list -> list.map { it.toDomain() } }

    override suspend fun placeOrder(
        cart: Cart,
        totals: CartTotals,
        address: Address,
        paymentMethod: PaymentMethod,
        deliveryInstructions: String,
    ): Result<Order> {
        if (cart.isEmpty) return Result.failure(IllegalStateException("Your cart is empty"))
        val orderId = UUID.randomUUID().toString()
        val orderNumber = "WS" + (10000 + (System.currentTimeMillis() % 89999)).toString()
        val order = Order(
            id = orderId,
            orderNumber = orderNumber,
            placedAtEpochMillis = System.currentTimeMillis(),
            items = cart.items.map { item ->
                OrderItem(
                    productId = item.product.id,
                    productName = item.product.name,
                    imageKey = item.product.imageKey,
                    unit = item.product.weightLabel,
                    quantity = item.quantity,
                    pricePerUnit = item.product.price,
                    mrpPerUnit = item.product.mrp,
                )
            },
            deliveryAddress = address,
            paymentMethod = paymentMethod,
            itemTotal = totals.itemTotal,
            deliveryFee = totals.deliveryFee,
            handlingFee = totals.handlingFee,
            discount = totals.totalSavings,
            grandTotal = totals.grandTotal,
            status = DeliveryStatus.PLACED,
            estimatedDeliveryLabel = "Arriving in 45-90 mins",
            deliveryInstructions = deliveryInstructions,
        )
        orderDao.insert(order.toEntity())
        cartDao.clear()
        progressStatusInBackground(orderId)
        return Result.success(order)
    }

    override suspend fun getOrderById(orderId: String): Result<Order> {
        val entity = orderDao.getById(orderId) ?: return Result.failure(NoSuchElementException("Order not found"))
        return Result.success(entity.toDomain())
    }

    override suspend fun cancelOrder(orderId: String): Result<Unit> {
        val entity = orderDao.getById(orderId) ?: return Result.failure(NoSuchElementException("Order not found"))
        val order = entity.toDomain()
        if (!order.isCancellable) return Result.failure(IllegalStateException("This order can no longer be cancelled"))
        orderDao.update(order.copy(status = DeliveryStatus.CANCELLED).toEntity())
        return Result.success(Unit)
    }

    override suspend fun reorder(orderId: String): Result<Unit> {
        val entity = orderDao.getById(orderId) ?: return Result.failure(NoSuchElementException("Order not found"))
        val order = entity.toDomain()
        order.items.forEach { item ->
            val existing = cartDao.getItem(item.productId)
            cartDao.upsert(
                CartItemEntity(
                    productId = item.productId,
                    quantity = (existing?.quantity ?: 0) + item.quantity,
                    addedAtEpochMillis = System.currentTimeMillis(),
                ),
            )
        }
        return Result.success(Unit)
    }

    /** Demo-only status ticker: PLACED -> CONFIRMED -> PACKED -> OUT_FOR_DELIVERY -> DELIVERED. */
    private fun progressStatusInBackground(orderId: String) {
        backgroundScope.launch {
            val timeline = listOf(
                DeliveryStatus.CONFIRMED,
                DeliveryStatus.PACKED,
                DeliveryStatus.OUT_FOR_DELIVERY,
                DeliveryStatus.DELIVERED,
            )
            for (status in timeline) {
                delay(45_000L)
                val entity = orderDao.getById(orderId) ?: return@launch
                val current = entity.toDomain()
                if (current.status == DeliveryStatus.CANCELLED) return@launch
                orderDao.update(current.copy(status = status).toEntity())
            }
        }
    }
}
