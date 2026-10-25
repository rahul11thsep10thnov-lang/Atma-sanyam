package com.wholesoul.app.domain.repository

import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.model.Cart
import com.wholesoul.app.domain.model.CartTotals
import com.wholesoul.app.domain.model.Order
import com.wholesoul.app.domain.model.PaymentMethod
import kotlinx.coroutines.flow.Flow

interface OrderRepository {
    val orders: Flow<List<Order>>

    suspend fun placeOrder(
        cart: Cart,
        totals: CartTotals,
        address: Address,
        paymentMethod: PaymentMethod,
        deliveryInstructions: String = "",
    ): Result<Order>

    suspend fun getOrderById(orderId: String): Result<Order>
    suspend fun cancelOrder(orderId: String): Result<Unit>
    suspend fun reorder(orderId: String): Result<Unit>
}
