package com.wholesoul.app.presentation.wishlist

import com.google.common.truth.Truth.assertThat
import com.wholesoul.app.data.mock.MockProductData
import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.fakes.FakeCartRepository
import com.wholesoul.app.fakes.FakeWishlistRepository
import com.wholesoul.app.util.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test

class WishlistViewModelTest {

    @get:Rule val mainDispatcherRule = MainDispatcherRule()

    private val catalog: Map<String, Product> = MockProductData.allProducts.associateBy { it.id }
    private val product = MockProductData.allProducts.first()

    @Test
    fun `wishlisted products appear in the list`() = runTest {
        val wishlistRepository = FakeWishlistRepository(catalog)
        wishlistRepository.add(product.id)
        val viewModel = WishlistViewModel(wishlistRepository, FakeCartRepository(catalog))

        assertThat(viewModel.wishlistProducts.value.map { it.id }).contains(product.id)
    }

    @Test
    fun `removing a product takes it out of the wishlist`() = runTest {
        val wishlistRepository = FakeWishlistRepository(catalog)
        wishlistRepository.add(product.id)
        val viewModel = WishlistViewModel(wishlistRepository, FakeCartRepository(catalog))

        viewModel.remove(product.id)

        assertThat(viewModel.wishlistProducts.value).isEmpty()
    }

    @Test
    fun `adding to cart from wishlist increases cart quantity`() = runTest {
        val wishlistRepository = FakeWishlistRepository(catalog)
        wishlistRepository.add(product.id)
        val cartRepository = FakeCartRepository(catalog)
        val viewModel = WishlistViewModel(wishlistRepository, cartRepository)

        viewModel.addToCart(product.id)

        assertThat(cartRepository.quantityOf(product.id)).isEqualTo(1)
    }
}
