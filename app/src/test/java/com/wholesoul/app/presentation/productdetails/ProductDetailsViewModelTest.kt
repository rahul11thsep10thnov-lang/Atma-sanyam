package com.wholesoul.app.presentation.productdetails

import androidx.lifecycle.SavedStateHandle
import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.core.util.UiState
import com.wholesoul.app.data.mock.MockProductData
import com.wholesoul.app.data.repository.MockProductRepository
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.fakes.FakeAnalyticsLogger
import com.wholesoul.app.fakes.FakeCartRepository
import com.wholesoul.app.fakes.FakeWishlistRepository
import com.wholesoul.app.util.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test

class ProductDetailsViewModelTest {

    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    private val catalog: Map<String, Product> = MockProductData.allProducts.associateBy { it.id }
    private val product = MockProductData.allProducts.first()

    private fun createViewModel(
        cartRepository: FakeCartRepository = FakeCartRepository(catalog),
        wishlistRepository: FakeWishlistRepository = FakeWishlistRepository(catalog),
    ) = ProductDetailsViewModel(
        savedStateHandle = SavedStateHandle(mapOf("productId" to product.id)),
        productRepository = MockProductRepository(),
        cartRepository = cartRepository,
        wishlistRepository = wishlistRepository,
        analyticsLogger = FakeAnalyticsLogger(),
    )

    @Test
    fun `loading a product exposes it as success state`() = runTest(mainDispatcherRule.testDispatcher) {
        val viewModel = createViewModel()
        val state = viewModel.uiState.value
        assertThat(state).isInstanceOf(UiState.Success::class.java)
        assertThat((state as UiState.Success).data.product.id).isEqualTo(product.id)
    }

    @Test
    fun `adding to cart increases quantity to one`() = runTest(mainDispatcherRule.testDispatcher) {
        val cartRepository = FakeCartRepository(catalog)
        val viewModel = createViewModel(cartRepository = cartRepository)

        viewModel.addToCart(product)

        assertThat(cartRepository.quantityOf(product.id)).isEqualTo(1)
    }

    @Test
    fun `incrementing then decrementing returns quantity to zero and removes item`() = runTest(mainDispatcherRule.testDispatcher) {
        val cartRepository = FakeCartRepository(catalog)
        val viewModel = createViewModel(cartRepository = cartRepository)

        viewModel.addToCart(product)
        viewModel.increment(product.id)
        assertThat(cartRepository.quantityOf(product.id)).isEqualTo(2)

        viewModel.decrement(product.id)
        viewModel.decrement(product.id)
        assertThat(cartRepository.quantityOf(product.id)).isEqualTo(0)
    }

    @Test
    fun `toggling wishlist marks product as wishlisted`() = runTest(mainDispatcherRule.testDispatcher) {
        val wishlistRepository = FakeWishlistRepository(catalog)
        val viewModel = createViewModel(wishlistRepository = wishlistRepository)

        viewModel.toggleWishlist(product)

        assertThat(wishlistRepository.isWishlisted(product.id)).isTrue()
        val state = viewModel.uiState.value as UiState.Success
        assertThat(state.data.isWishlisted).isTrue()
    }
}
