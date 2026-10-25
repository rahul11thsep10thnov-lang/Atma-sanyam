package com.wholesoul.app.data.repository

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.model.AddressLabel
import com.wholesoul.app.domain.model.DeliveryStatus
import com.wholesoul.app.domain.model.PaymentMethod
import com.wholesoul.app.fakes.FakeCartDao
import com.wholesoul.app.fakes.FakeOrderDao
import com.wholesoul.app.fakes.InMemoryCatalog
import com.wholesoul.app.fakes.RecordingCatalogChanges
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Test

/** The cart and orders must respect the quantities the shop owner sets in the Admin Console. */
class RoomCartAndOrderStockTest {

    private val catalog = InMemoryCatalog().apply {
        addCategory("sweets")
        addProduct("laddu", "sweets", price = 40.0, mrp = 50.0, stock = 3)
        addProduct("barfi", "sweets", price = 60.0, mrp = 60.0, stock = 0)
    }
    private val cartDao = FakeCartDao()
    private val changes = RecordingCatalogChanges()
    private val cartRepository = RoomCartRepository(cartDao, catalog.productDao)
    private val orderRepository = RoomOrderRepository(FakeOrderDao(), cartDao, catalog.productDao, changes)

    private val address = Address(
        id = "a1", label = AddressLabel.HOME, fullName = "Test", mobileNumber = "9876543210",
        houseNumber = "1", buildingStreet = "Street", landmark = "", area = "Area",
        city = "Mumbai", state = "Maharashtra", pinCode = "400001",
    )

    private suspend fun placeOrder() = cartRepository.cart.first().let { cart ->
        orderRepository.placeOrder(cart, cartRepository.computeTotals(cart), address, PaymentMethod.UPI, "")
    }

    // --- cart ---

    @Test
    fun `quantity in the cart is capped at the stock the shop has`() = runTest {
        cartRepository.addToCart("laddu", 2)
        cartRepository.addToCart("laddu", 2)
        assertThat(cartRepository.quantityOf("laddu")).isEqualTo(3)

        cartRepository.updateQuantity("laddu", 99)
        assertThat(cartRepository.quantityOf("laddu")).isEqualTo(3)
    }

    @Test
    fun `a sold out item cannot be added`() = runTest {
        cartRepository.addToCart("barfi")
        assertThat(cartRepository.quantityOf("barfi")).isEqualTo(0)
        assertThat(cartRepository.cart.first().items).isEmpty()
    }

    @Test
    fun `an item hidden by the admin leaves the cart and cannot be added`() = runTest {
        cartRepository.addToCart("laddu")
        catalog.productDao.setActive(listOf("laddu"), false)
        assertThat(cartRepository.cart.first().items).isEmpty()

        cartRepository.addToCart("laddu")
        assertThat(cartRepository.quantityOf("laddu")).isEqualTo(0)
        assertThat(cartRepository.cart.first().items).isEmpty()
    }

    @Test
    fun `price changes made by the admin show up in the cart straight away`() = runTest {
        cartRepository.addToCart("laddu", 2)
        assertThat(cartRepository.computeTotals(cartRepository.cart.first()).itemTotal).isEqualTo(80.0)

        val edited = catalog.product("laddu")!!.copy(price = 45.0)
        catalog.productDao.upsert(edited)
        assertThat(cartRepository.computeTotals(cartRepository.cart.first()).itemTotal).isEqualTo(90.0)
    }

    // --- orders ---

    @Test
    fun `placing an order takes the items out of stock`() = runTest {
        cartRepository.addToCart("laddu", 2)
        val result = placeOrder()

        assertThat(result.isSuccess).isTrue()
        assertThat(catalog.product("laddu")!!.stock).isEqualTo(1)
        assertThat(changes.notifications).isEqualTo(1)
        assertThat(cartRepository.cart.first().items).isEmpty()
    }

    @Test
    fun `an order for more than is left is refused and stock is untouched`() = runTest {
        cartRepository.addToCart("laddu", 3)
        catalog.productDao.setStock("laddu", 1) // someone else bought two in the meantime

        val result = placeOrder()

        assertThat(result.exceptionOrNull()).hasMessageThat().contains("Only 1 of")
        assertThat(catalog.product("laddu")!!.stock).isEqualTo(1)
    }

    @Test
    fun `an item hidden after it reached the cart blocks checkout`() = runTest {
        cartRepository.addToCart("laddu")
        val cart = cartRepository.cart.first()
        catalog.productDao.setActive(listOf("laddu"), false)

        val result = orderRepository.placeOrder(cart, cartRepository.computeTotals(cart), address, PaymentMethod.UPI, "")

        assertThat(result.exceptionOrNull()).hasMessageThat().contains("no longer available")
    }

    @Test
    fun `cancelling an order puts the items back in stock`() = runTest {
        cartRepository.addToCart("laddu", 2)
        val order = placeOrder().getOrThrow()
        assertThat(order.status).isEqualTo(DeliveryStatus.PLACED)
        assertThat(catalog.product("laddu")!!.stock).isEqualTo(1)

        assertThat(orderRepository.cancelOrder(order.id).isSuccess).isTrue()
        assertThat(catalog.product("laddu")!!.stock).isEqualTo(3)
    }

    @Test
    fun `reordering skips items that are sold out or hidden`() = runTest {
        cartRepository.addToCart("laddu", 2)
        val order = placeOrder().getOrThrow()

        catalog.productDao.setStock("laddu", 0)
        assertThat(orderRepository.reorder(order.id).exceptionOrNull()).hasMessageThat().contains("None of these items")

        catalog.productDao.setStock("laddu", 1)
        assertThat(orderRepository.reorder(order.id).isSuccess).isTrue()
        assertThat(cartRepository.quantityOf("laddu")).isEqualTo(1)
    }
}
