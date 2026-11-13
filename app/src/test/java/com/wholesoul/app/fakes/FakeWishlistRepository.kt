package com.wholesoul.app.fakes

import com.wholesoul.app.domain.model.Product
import com.wholesoul.app.domain.repository.WishlistRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class FakeWishlistRepository(private val catalog: Map<String, Product>) : WishlistRepository {
    private val ids = linkedSetOf<String>()
    private val state = MutableStateFlow<List<Product>>(emptyList())
    override val wishlistProducts: StateFlow<List<Product>> get() = state

    private fun publish() { state.value = ids.mapNotNull { catalog[it] } }

    override suspend fun add(productId: String) { ids.add(productId); publish() }
    override suspend fun remove(productId: String) { ids.remove(productId); publish() }
    override suspend fun isWishlisted(productId: String): Boolean = productId in ids
    override suspend fun toggle(productId: String) {
        if (productId in ids) remove(productId) else add(productId)
    }
}
