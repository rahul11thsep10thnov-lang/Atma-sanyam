package com.wholesoul.app.domain.model

import kotlinx.serialization.Serializable

/**
 * Delivery status timeline. Deliberately has no live-tracking / map step —
 * WHOLESOUL never shows a live map (spec section 17).
 */
enum class DeliveryStatus(val label: String) {
    PLACED("Order placed"),
    CONFIRMED("Confirmed"),
    PACKED("Packed"),
    OUT_FOR_DELIVERY("Out for delivery"),
    DELIVERED("Delivered"),
    CANCELLED("Cancelled"),
}

enum class PaymentMethod(val label: String) {
    UPI("UPI"),
    CARD("Credit/Debit Card"),
    NET_BANKING("Net Banking"),
    COD("Cash on Delivery"),
    WALLET("Wallet"),
}

enum class PaymentStatus { PENDING, SUCCESS, FAILED }

data class Payment(
    val id: String,
    val orderId: String,
    val method: PaymentMethod,
    val amount: Double,
    val status: PaymentStatus,
)

@Serializable
data class OrderItem(
    val productId: String,
    val productName: String,
    val imageKey: String,
    val unit: String,
    val quantity: Int,
    val pricePerUnit: Double,
    val mrpPerUnit: Double,
) {
    val lineTotal: Double get() = pricePerUnit * quantity
}

data class Order(
    val id: String,
    val orderNumber: String,
    val placedAtEpochMillis: Long,
    val items: List<OrderItem>,
    val deliveryAddress: Address,
    val paymentMethod: PaymentMethod,
    val itemTotal: Double,
    val deliveryFee: Double,
    val handlingFee: Double,
    val discount: Double,
    val grandTotal: Double,
    val status: DeliveryStatus,
    val estimatedDeliveryLabel: String,
    val deliveryInstructions: String = "",
) {
    val isActive: Boolean get() = status !in setOf(DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED)
    val isCancellable: Boolean get() = status == DeliveryStatus.PLACED || status == DeliveryStatus.CONFIRMED
}
