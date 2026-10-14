package com.wholesoul.app.presentation.cart

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.data.mock.MockProductData
import com.wholesoul.app.domain.model.Coupon
import com.wholesoul.app.domain.model.CouponType
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.fakes.FakeAnalyticsLogger
import com.wholesoul.app.fakes.FakeCartRepository
import com.wholesoul.app.fakes.FakeCouponRepository
import com.wholesoul.app.util.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test

class CartViewModelTest {

    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    private val catalog: Map<String, Product> = MockProductData.allProducts.associateBy { it.id }
    private val product = MockProductData.allProducts.first { it.stock > 0 }
    private val coupon = Coupon("FIRST50", "t", "d", CouponType.FLAT, 50.0, minOrderValue = 10.0, expiryLabel = "")

    private fun createViewModel(cartRepository: FakeCartRepository): CartViewModel = CartViewModel(
        cartRepository = cartRepository,
        couponRepository = FakeCouponRepository(listOf(coupon)),
        analyticsLogger = FakeAnalyticsLogger(),
    )

    @Test
    fun `incrementing a cart item increases its quantity`() = runTest {
        val cartRepository = FakeCartRepository(catalog)
        cartRepository.addToCart(product.id, 1)
        val viewModel = createViewModel(cartRepository)

        viewModel.increment(product.id)

        assertThat(cartRepository.quantityOf(product.id)).isEqualTo(2)
    }

    @Test
    fun `decrementing to zero removes the item from the cart`() = runTest {
        val cartRepository = FakeCartRepository(catalog)
        cartRepository.addToCart(product.id, 1)
        val viewModel = createViewModel(cartRepository)

        viewModel.decrement(product.id)

        assertThat(cartRepository.quantityOf(product.id)).isEqualTo(0)
        assertThat(viewModel.uiState.value.cart.isEmpty).isTrue()
    }

    @Test
    fun `removing an item clears it from totals`() = runTest {
        val cartRepository = FakeCartRepository(catalog)
        cartRepository.addToCart(product.id, 2)
        val viewModel = createViewModel(cartRepository)

        viewModel.remove(product.id)

        assertThat(viewModel.uiState.value.cart.items).isEmpty()
    }

    @Test
    fun `applying a valid coupon reduces the total`() = runTest {
        val cartRepository = FakeCartRepository(catalog)
        cartRepository.addToCart(product.id, 5)
        val viewModel = createViewModel(cartRepository)

        viewModel.onCouponInputChange("FIRST50")
        viewModel.applyCoupon()

        assertThat(viewModel.uiState.value.cart.appliedCoupon?.code).isEqualTo("FIRST50")
        assertThat(viewModel.uiState.value.totals.couponDiscount).isEqualTo(50.0)
        assertThat(viewModel.uiState.value.couponError).isNull()
    }

    @Test
    fun `applying an unknown coupon shows an error and does not apply it`() = runTest {
        val cartRepository = FakeCartRepository(catalog)
        cartRepository.addToCart(product.id, 1)
        val viewModel = createViewModel(cartRepository)

        viewModel.onCouponInputChange("NOTREAL")
        viewModel.applyCoupon()

        assertThat(viewModel.uiState.value.cart.appliedCoupon).isNull()
        assertThat(viewModel.uiState.value.couponError).isNotNull()
    }
}
