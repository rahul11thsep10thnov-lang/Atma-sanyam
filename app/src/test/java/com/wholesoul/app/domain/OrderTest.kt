package com.wholesoul.app.domain

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.model.AddressLabel
import com.wholesoul.app.domain.model.DeliveryStatus
import com.wholesoul.app.domain.model.Order
import com.wholesoul.app.domain.model.PaymentMethod
import org.junit.Test

class OrderTest {

    private val address = Address(
        id = "a1", label = AddressLabel.HOME, fullName = "Test", mobileNumber = "9876543210",
        houseNumber = "1", buildingStreet = "Street", landmark = "", area = "Area",
        city = "Mumbai", state = "Maharashtra", pinCode = "400001",
    )

    private fun order(status: DeliveryStatus) = Order(
        id = "o1", orderNumber = "WS1", placedAtEpochMillis = 0L, items = emptyList(),
        deliveryAddress = address, paymentMethod = PaymentMethod.UPI, itemTotal = 100.0,
        deliveryFee = 0.0, handlingFee = 0.0, discount = 0.0, grandTotal = 100.0,
        status = status, estimatedDeliveryLabel = "soon",
    )

    @Test
    fun `placed and confirmed orders are cancellable`() {
        assertThat(order(DeliveryStatus.PLACED).isCancellable).isTrue()
        assertThat(order(DeliveryStatus.CONFIRMED).isCancellable).isTrue()
    }

    @Test
    fun `packed or later orders are not cancellable`() {
        assertThat(order(DeliveryStatus.PACKED).isCancellable).isFalse()
        assertThat(order(DeliveryStatus.OUT_FOR_DELIVERY).isCancellable).isFalse()
        assertThat(order(DeliveryStatus.DELIVERED).isCancellable).isFalse()
    }

    @Test
    fun `delivered and cancelled orders are not active`() {
        assertThat(order(DeliveryStatus.DELIVERED).isActive).isFalse()
        assertThat(order(DeliveryStatus.CANCELLED).isActive).isFalse()
        assertThat(order(DeliveryStatus.PACKED).isActive).isTrue()
    }
}
