package com.wholesoul.app.presentation.orderdetails

import androidx.lifecycle.SavedStateHandle
import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.model.AddressLabel
import com.wholesoul.app.domain.model.Cart
import com.wholesoul.app.domain.model.CartItem
import com.wholesoul.app.domain.model.CartTotals
import com.wholesoul.app.domain.model.DeliveryStatus
import com.wholesoul.app.domain.model.PaymentMethod
import com.wholesoul.app.data.mock.MockProductData
import com.wholesoul.app.fakes.FakeOrderRepository
import com.wholesoul.app.util.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test

class OrderDetailsViewModelTest {

    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    private val product = MockProductData.allProducts.first { it.stock > 0 }
    private val address = Address(
        id = "a1", label = AddressLabel.HOME, fullName = "Test User", mobileNumber = "9876543210",
        houseNumber = "12", buildingStreet = "Main Street", landmark = "", area = "Civil Lines",
        city = "Mumbai", state = "Maharashtra", pinCode = "400001", isDefault = true,
    )

    private suspend fun placeSampleOrder(orderRepository: FakeOrderRepository): String {
        val cart = Cart(listOf(CartItem(product, 2)))
        val totals = CartTotals(product.price * 2, product.mrp * 2, 0.0, 4.0, 0.0, 299.0)
        val order = orderRepository.placeOrder(cart, totals, address, PaymentMethod.UPI).getOrThrow()
        return order.id
    }

    @Test
    fun `loading an existing order exposes it as success`() = runTest(mainDispatcherRule.testDispatcher) {
        val orderRepository = FakeOrderRepository()
        val orderId = placeSampleOrder(orderRepository)
        val viewModel = OrderDetailsViewModel(SavedStateHandle(mapOf("orderId" to orderId)), orderRepository)

        val state = viewModel.uiState.value
        assertThat(state).isInstanceOf(UiState.Success::class.java)
        assertThat((state as UiState.Success).data.id).isEqualTo(orderId)
    }

    @Test
    fun `cancelling a freshly placed order marks it cancelled`() = runTest(mainDispatcherRule.testDispatcher) {
        val orderRepository = FakeOrderRepository()
        val orderId = placeSampleOrder(orderRepository)
        val viewModel = OrderDetailsViewModel(SavedStateHandle(mapOf("orderId" to orderId)), orderRepository)

        viewModel.cancelOrder()

        val state = viewModel.uiState.value as UiState.Success
        assertThat(state.data.status).isEqualTo(DeliveryStatus.CANCELLED)
    }

    @Test
    fun `cancelling an already delivered order fails and keeps its status`() = runTest(mainDispatcherRule.testDispatcher) {
        val orderRepository = FakeOrderRepository()
        val orderId = placeSampleOrder(orderRepository)
        orderRepository.forceStatus(orderId, DeliveryStatus.DELIVERED)
        val viewModel = OrderDetailsViewModel(SavedStateHandle(mapOf("orderId" to orderId)), orderRepository)

        viewModel.cancelOrder()

        val state = viewModel.uiState.value as UiState.Success
        assertThat(state.data.status).isEqualTo(DeliveryStatus.DELIVERED)
        assertThat(viewModel.actionMessage.value).isNotNull()
    }

    @Test
    fun `reordering adds the items back to the cart repository`() = runTest(mainDispatcherRule.testDispatcher) {
        val orderRepository = FakeOrderRepository()
        val orderId = placeSampleOrder(orderRepository)
        val viewModel = OrderDetailsViewModel(SavedStateHandle(mapOf("orderId" to orderId)), orderRepository)

        viewModel.reorder()

        assertThat(viewModel.actionMessage.value).isEqualTo("Items added to your cart")
    }
}
