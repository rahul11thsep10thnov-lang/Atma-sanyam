package com.wholesoul.app.fakes

import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.model.Cart
import com.wholesoul.app.domain.model.CartTotals
import com.wholesoul.app.domain.model.DeliveryStatus
import com.wholesoul.app.domain.model.Order
import com.wholesoul.app.domain.model.OrderItem
import com.wholesoul.app.domain.model.PaymentMethod
import com.wholesoul.app.domain.repository.OrderRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.util.UUID

class FakeOrderRepository : OrderRepository {
    private val state = MutableStateFlow<List<Order>>(emptyList())
    override val orders: StateFlow<List<Order>> get() = state

    override suspend fun placeOrder(cart: Cart, totals: CartTotals, address: Address, paymentMethod: PaymentMethod, deliveryInstructions: String): Result<Order> {
        if (cart.isEmpty) return Result.failure(IllegalStateException("Your cart is empty"))
        val order = Order(
            id = UUID.randomUUID().toString(),
            orderNumber = "WS${(10000..99999).random()}",
            placedAtEpochMillis = System.currentTimeMillis(),
            items = cart.items.map { OrderItem(it.product.id, it.product.name, it.product.imageKey, it.product.weightLabel, it.quantity, it.product.price, it.product.mrp) },
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
        state.value = state.value + order
        return Result.success(order)
    }

    override suspend fun getOrderById(orderId: String): Result<Order> =
        state.value.firstOrNull { it.id == orderId }?.let { Result.success(it) } ?: Result.failure(NoSuchElementException("Order not found"))

    override suspend fun cancelOrder(orderId: String): Result<Unit> {
        val order = state.value.firstOrNull { it.id == orderId } ?: return Result.failure(NoSuchElementException("Order not found"))
        if (!order.isCancellable) return Result.failure(IllegalStateException("This order can no longer be cancelled"))
        state.value = state.value.map { if (it.id == orderId) it.copy(status = DeliveryStatus.CANCELLED) else it }
        return Result.success(Unit)
    }

    override suspend fun reorder(orderId: String): Result<Unit> {
        state.value.firstOrNull { it.id == orderId } ?: return Result.failure(NoSuchElementException("Order not found"))
        return Result.success(Unit)
    }

    /** Test-only helper to seed an order directly into a later stage of its delivery timeline. */
    fun forceStatus(orderId: String, status: DeliveryStatus) {
        state.value = state.value.map { if (it.id == orderId) it.copy(status = status) else it }
    }
}
