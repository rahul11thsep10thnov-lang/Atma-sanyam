package com.wholesoul.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.model.DeliveryStatus
import com.wholesoul.app.domain.model.Order
import com.wholesoul.app.domain.model.OrderItem
import com.wholesoul.app.domain.model.PaymentMethod
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val json = Json { ignoreUnknownKeys = true }

@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey val id: String,
    val orderNumber: String,
    val placedAtEpochMillis: Long,
    val itemsJson: String,
    val addressJson: String,
    val paymentMethod: String,
    val itemTotal: Double,
    val deliveryFee: Double,
    val handlingFee: Double,
    val discount: Double,
    val grandTotal: Double,
    val status: String,
    val estimatedDeliveryLabel: String,
    val deliveryInstructions: String = "",
)

fun OrderEntity.toDomain(): Order = Order(
    id = id,
    orderNumber = orderNumber,
    placedAtEpochMillis = placedAtEpochMillis,
    items = json.decodeFromString<List<OrderItem>>(itemsJson),
    deliveryAddress = json.decodeFromString<Address>(addressJson),
    paymentMethod = PaymentMethod.valueOf(paymentMethod),
    itemTotal = itemTotal,
    deliveryFee = deliveryFee,
    handlingFee = handlingFee,
    discount = discount,
    grandTotal = grandTotal,
    status = DeliveryStatus.valueOf(status),
    estimatedDeliveryLabel = estimatedDeliveryLabel,
    deliveryInstructions = deliveryInstructions,
)

fun Order.toEntity(): OrderEntity = OrderEntity(
    id = id,
    orderNumber = orderNumber,
    placedAtEpochMillis = placedAtEpochMillis,
    itemsJson = json.encodeToString(items),
    addressJson = json.encodeToString(deliveryAddress),
    paymentMethod = paymentMethod.name,
    itemTotal = itemTotal,
    deliveryFee = deliveryFee,
    handlingFee = handlingFee,
    discount = discount,
    grandTotal = grandTotal,
    status = status.name,
    estimatedDeliveryLabel = estimatedDeliveryLabel,
    deliveryInstructions = deliveryInstructions,
)
