package com.wholesoul.app.domain.model

enum class NotificationType { ORDER_UPDATE, OFFER, ARRIVAL, GENERAL }

data class AppNotification(
    val id: String,
    val type: NotificationType,
    val title: String,
    val message: String,
    val createdAtEpochMillis: Long,
    val isRead: Boolean = false,
)

data class Offer(
    val id: String,
    val title: String,
    val description: String,
    val imageKey: String,
    val couponCode: String? = null,
    val category: ProductCategory? = null,
)

data class WishlistItem(
    val productId: String,
    val addedAtEpochMillis: Long,
)

/** A serviceable PIN code entry, used by the no-GPS serviceability check (spec section 32). */
data class ServiceableArea(
    val pinCode: String,
    val city: String,
    val state: String,
    val isServiceable: Boolean,
    val estimatedDeliveryLabel: String = "Delivery in 45-90 mins",
)
