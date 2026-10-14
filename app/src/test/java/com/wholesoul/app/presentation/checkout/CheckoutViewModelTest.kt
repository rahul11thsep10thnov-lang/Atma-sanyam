package com.wholesoul.app.presentation.checkout

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.data.mock.MockProductData
import com.wholesoul.app.data.repository.MockPaymentRepository
import com.wholesoul.app.domain.model.Address
import com.wholesoul.app.domain.model.AddressLabel
import com.wholesoul.app.domain.model.PaymentMethod
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.fakes.FakeAddressRepository
import com.wholesoul.app.fakes.FakeAnalyticsLogger
import com.wholesoul.app.fakes.FakeCartRepository
import com.wholesoul.app.fakes.FakeOrderRepository
import com.wholesoul.app.util.MainDispatcherRule
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test

class CheckoutViewModelTest {

    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    private val catalog: Map<String, Product> = MockProductData.allProducts.associateBy { it.id }
    private val product = MockProductData.allProducts.first { it.stock > 0 }
    private val address = Address(
        id = "a1", label = AddressLabel.HOME, fullName = "Test User", mobileNumber = "9876543210",
        houseNumber = "12", buildingStreet = "Main Street", landmark = "", area = "Civil Lines",
        city = "Mumbai", state = "Maharashtra", pinCode = "400001", isDefault = true,
    )

    private fun createViewModel(
        cartRepository: FakeCartRepository,
        addressRepository: FakeAddressRepository,
        orderRepository: FakeOrderRepository = FakeOrderRepository(),
    ) = CheckoutViewModel(
        cartRepository = cartRepository,
        addressRepository = addressRepository,
        orderRepository = orderRepository,
        paymentRepository = MockPaymentRepository(),
        analyticsLogger = FakeAnalyticsLogger(),
    )

    @Test
    fun `placing an order with an empty cart fails`() = runTest(mainDispatcherRule.testDispatcher) {
        val cartRepository = FakeCartRepository(catalog)
        val addressRepository = FakeAddressRepository()
        addressRepository.addAddress(address)
        val viewModel = createViewModel(cartRepository, addressRepository)

        viewModel.placeOrder()

        assertThat(viewModel.uiState.value.placedOrderId).isNull()
        assertThat(viewModel.uiState.value.errorMessage).isEqualTo("Your cart is empty")
    }

    @Test
    fun `placing an order without an address fails`() = runTest(mainDispatcherRule.testDispatcher) {
        val cartRepository = FakeCartRepository(catalog)
        cartRepository.addToCart(product.id, 2)
        val addressRepository = FakeAddressRepository()
        val viewModel = createViewModel(cartRepository, addressRepository)

        viewModel.placeOrder()

        assertThat(viewModel.uiState.value.errorMessage).isEqualTo("Please select a delivery address")
    }

    @Test
    fun `placing a valid order creates it and clears the cart`() = runTest(mainDispatcherRule.testDispatcher) {
        val cartRepository = FakeCartRepository(catalog)
        cartRepository.addToCart(product.id, 2)
        val addressRepository = FakeAddressRepository()
        addressRepository.addAddress(address)
        val orderRepository = FakeOrderRepository()
        val viewModel = createViewModel(cartRepository, addressRepository, orderRepository)

        viewModel.selectPaymentMethod(PaymentMethod.UPI)
        viewModel.placeOrder()
        advanceUntilIdle()

        val placedOrderId = viewModel.uiState.value.placedOrderId
        assertThat(placedOrderId).isNotNull()
        val order = orderRepository.getOrderById(placedOrderId!!).getOrThrow()
        assertThat(order.paymentMethod).isEqualTo(PaymentMethod.UPI)
        assertThat(order.items.first().productId).isEqualTo(product.id)
    }
}
